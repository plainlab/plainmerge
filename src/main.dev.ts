/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build:main`, this file is compiled to
 * `./src/main.prod.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  shell,
  Notification,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { FileFilter, IpcMainInvokeEvent } from 'electron/main';
import fs from 'fs';
import crypto from 'crypto';
import glob from 'glob';
import nodeurl from 'url';
import { promisify } from 'util';
import MenuBuilder from './menu';
import renderPdf, { loadForm, RenderPdfState } from './render';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

const configSuffix = '.merge.json';

const getRowsLimit = () => {
  if (process.env.PAID) {
    return 100_000;
  }
  return 10;
};

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: true,
    },
  });

  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(input.key) >
      -1
    ) {
      event.preventDefault();
    }
    mainWindow?.webContents.send('keydown', input.key);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

const getPathHash = (filename: string) => {
  const pdfHash = crypto
    .createHash('md5')
    .update(filename, 'utf8')
    .digest('hex');

  return path.join(app.getPath('userData'), `${pdfHash}.${configSuffix}`);
};

const saveConfig = async (params: RenderPdfState) => {
  await writeFile(getPathHash(params.pdfFile), JSON.stringify(params), {
    encoding: 'utf8',
  });
};

const loadConfigs = async () => {
  const configFolder = app.getPath('userData');

  const list = await promisify(glob)(
    path.join(configFolder, `*.${configSuffix}`)
  );

  const configList = await Promise.all(
    list.map(async (fp: string) => {
      try {
        const data = await readFile(fp, { encoding: 'utf8' });
        return JSON.parse(data);
      } catch (e) {
        return null;
      }
    })
  );

  return configList.filter((c: any) => c && c.pdfFile);
};

const removeConfig = async (pdfFile: string) => {
  return promisify(fs.unlink)(getPathHash(pdfFile));
};

const savePdf = async (params: RenderPdfState) => {
  try {
    await saveConfig(params);
  } catch (e) {
    console.error(e);
  }

  const { pdfFile, excelFile, combinePdf, canvasData, formData } = params;

  const file = await dialog.showSaveDialog({
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  });

  if (!file || !file.filePath) return;

  try {
    const created = await renderPdf(
      file.filePath,
      pdfFile,
      excelFile,
      getRowsLimit(),
      combinePdf,
      canvasData,
      formData,
      (o) => mainWindow?.webContents.send('render-progress', o)
    );

    if (created > 0 && Notification.isSupported()) {
      new Notification({
        title: 'Merge successfully',
        body: `Create ${created} merged file${created === 1 ? '' : 's'}`,
      }).show();
    }
  } catch (e) {
    dialog.showErrorBox('Merge failed', e.message);

    console.error(e);
    if (Notification.isSupported()) {
      new Notification({
        title: 'Merge failed',
        body: 'Check your Excel and PDF files again',
      }).show();
    }
  }
};

const openPdf = (pdfPath: string) => {
  const win = new BrowserWindow({
    title: 'Preview',
    width: 512,
    height: 768,
    webPreferences: {
      plugins: true,
      contextIsolation: false,
    },
  });
  win.loadURL(nodeurl.pathToFileURL(pdfPath).toString());
};

const previewPdf = async (params: RenderPdfState) => {
  try {
    await saveConfig(params);
  } catch (e) {
    console.error(e);
  }

  const { pdfFile, excelFile, combinePdf, canvasData, formData } = params;

  try {
    const filePath = path.join(
      app.getPath('temp'),
      `preview-${path.basename(pdfFile)}`
    );
    const updateProgress = (o: any) =>
      mainWindow?.webContents.send('render-progress', o);

    await renderPdf(
      filePath,
      pdfFile,
      excelFile,
      1,
      combinePdf,
      canvasData,
      formData || {},
      updateProgress
    );
    openPdf(filePath);
  } catch (e) {
    dialog.showErrorBox('Preview failed', e.message);

    console.error(e);
    if (Notification.isSupported()) {
      new Notification({
        title: 'Preview failed',
        body: 'Check your Excel and PDF files again',
      }).show();
    }
  }
};

/**
 * Handlers events from React
 */

// This method return a Buffer, if you want to convert to string
// use Buffer.from(buffer).toString()
ipcMain.handle(
  'open-file',
  async (
    _event: IpcMainInvokeEvent,
    filters: FileFilter[],
    type: 'path' | 'buffer'
  ) => {
    const files = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters,
    });

    let content;
    if (files) {
      const fpath = files.filePaths[0];
      if (type === 'path') {
        content = fpath;
      } else {
        content = await readFile(fpath);
      }
    }
    return content;
  }
);

ipcMain.handle(
  'save-file',
  async (_event: IpcMainInvokeEvent, { defaultPath, content, encoding }) => {
    const file = await dialog.showSaveDialog({
      defaultPath,
    });

    if (!file || !file.filePath) return;

    await writeFile(file.filePath, content, {
      encoding,
    });
  }
);

ipcMain.handle('save-config', async (_event, params: RenderPdfState) => {
  try {
    await saveConfig(params);
  } catch (e) {
    console.error(e);
  }
});

ipcMain.handle('preview-pdf', async (_event, params: RenderPdfState) => {
  return previewPdf(params);
});

ipcMain.handle('save-pdf', async (_event, params: RenderPdfState) => {
  return savePdf(params);
});

ipcMain.handle('load-history', async () => {
  return loadConfigs();
});

ipcMain.handle('remove-history', async (_event, { filename }) => {
  return removeConfig(filename);
});

ipcMain.handle('load-form', async (_event, { filename }) => {
  return loadForm(filename);
});

/**
 * Add event listeners...
 */
app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.whenReady().then(createWindow).catch(console.log);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});
