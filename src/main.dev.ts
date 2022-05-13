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
import renderPdf, { loadForm, RenderPdfState, RowMap } from './render';
import { SmtpConfigType } from './email';

const Store = require('electron-store');
const nodemailer = require('nodemailer');

const store = new Store();

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

const configSuffix = 'merge.json';

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
let mailMergeWindow: BrowserWindow | null = null;

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

const windowWidth = 1024;
const windowHeight = 728;

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
    width: windowWidth,
    minWidth: windowWidth,
    height: windowHeight,
    minHeight: windowHeight,
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
  const p = getPathHash(params.pdfFile);
  await writeFile(p, JSON.stringify(params), {
    encoding: 'utf8',
  });
  return p;
};

const loadConfig = async (fp: string) => {
  const data = await readFile(fp, { encoding: 'utf8' });
  const conf = JSON.parse(data);
  conf.configPath = fp;
  return conf;
};

const loadConfigs = async () => {
  const configFolder = app.getPath('userData');

  const list = await promisify(glob)(
    path.join(configFolder, `*.${configSuffix}`)
  );

  const configList = await Promise.all(
    list.map(async (fp: string) => {
      try {
        return loadConfig(fp);
      } catch (e) {
        return null;
      }
    })
  );

  return configList.filter((c: any) => c && c.pdfFile);
};

const removeConfig = async (confPath: string) => {
  return promisify(fs.unlink)(confPath);
};

const savePdf = async (params: RenderPdfState) => {
  try {
    await saveConfig(params);
  } catch (e) {
    dialog.showErrorBox('Save config error', e.message);
    return;
  }

  try {
    const created = await renderPdf({
      output: params.outputPdf,
      pdfFile: params.pdfFile,
      excelFile: params.excelFile,
      rowsLimit: getRowsLimit(),
      combinePdf: params.combinePdf,
      saveFileFunc: writeFile,
      updateProgressFunc: (page, total) =>
        mailMergeWindow?.webContents.send('save-progress', { page, total }),
      canvasData: params.canvasData,
      formData: params.formData,
      filenameTemplate: params.filename,
    });

    if (created > 0) {
      if (Notification.isSupported()) {
        new Notification({
          title: 'Mail merge success!',
          body: `Created ${created} PDF${
            created === 1 ? '' : 's'
          } successfully`,
        }).show();
      }

      if (mailMergeWindow) {
        dialog.showMessageBox(mailMergeWindow, {
          type: 'info',
          title: 'Mail merge success!',
          message: `Created ${created} PDF${
            created === 1 ? '' : 's'
          } successfully`,
        });
      }
    }
  } catch (e) {
    if (Notification.isSupported()) {
      new Notification({
        title: 'Mail merge failed',
        body: 'Check your Excel and PDF files again',
      }).show();
    }

    dialog.showErrorBox('Merge failed', e.message);
  }
};

const openPdf = (pdfPath: string) => {
  const win = new BrowserWindow({
    title: 'Preview',
    width: windowHeight,
    height: windowHeight,
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
    dialog.showErrorBox('Save config error', e.message);
    return;
  }

  try {
    const output = path.join(
      app.getPath('temp'),
      `preview-${path.basename(params.pdfFile)}`
    );
    await renderPdf({
      output,
      pdfFile: params.pdfFile,
      excelFile: params.excelFile,
      rowsLimit: 1,
      combinePdf: true,
      saveFileFunc: writeFile,
      updateProgressFunc: () => {},
      canvasData: params.canvasData,
      formData: params.formData || {},
    });
    openPdf(output);
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

const createMailMergeWindow = (configPath: string) => {
  if (mailMergeWindow == null) {
    mailMergeWindow = new BrowserWindow({
      parent: mainWindow || undefined,
      width: windowHeight,
      height: windowHeight,
      minWidth: windowHeight,
      minHeight: windowHeight,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });
  }
  mailMergeWindow.loadURL(
    `file://${__dirname}/index.html?page=merge&config=${configPath}`
  );

  mailMergeWindow.webContents.on('did-finish-load', () => {
    mailMergeWindow?.show();
  });

  mailMergeWindow.on('closed', () => {
    mailMergeWindow = null;
  });
};

const mailMerge = async (params: RenderPdfState) => {
  let p = '';
  try {
    p = await saveConfig(params);
  } catch (e) {
    dialog.showErrorBox('Save config error', e.message);
    return;
  }
  createMailMergeWindow(encodeURIComponent(p));
};

const sendMailFunc = (
  fromEmail: string,
  emailIndex: number,
  subjectTemplate: string,
  bodyTemplate: string
) => async (filename: string, buffer: Uint8Array, rowData?: RowMap) => {
  const config = store.get('smtp-config');

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const searchValue = /\[\[(.*?)\]\]/g;
  const replaceValue = (_a: string, b: string) =>
    (rowData && rowData[JSON.parse(b).id]) || '';

  const subject = subjectTemplate.replace(searchValue, replaceValue).trim();
  const text = bodyTemplate.replace(searchValue, replaceValue).trim();

  const message = {
    from: fromEmail,
    to: rowData && rowData[emailIndex],
    subject,
    text,
    html: text,
    attachments: [
      {
        filename: path.basename(filename),
        content: buffer,
      },
    ],
  };

  await transporter.sendMail(message);
};

const emailProgressFunc = (emailIndex: number) => (
  page: number,
  total: number,
  rowData?: RowMap
) => {
  mailMergeWindow?.webContents.send('email-progress', {
    page,
    total,
    email: rowData && rowData[emailIndex],
  });
};

const sendPdfMail = async (
  fromEmail: string,
  emailIndex: number,
  subjectTemplate: string,
  bodyTemplate: string,
  params: RenderPdfState
) => {
  try {
    const output = path.join(
      app.getPath('temp'),
      path.basename(params.pdfFile)
    );

    const created = await renderPdf({
      output,
      pdfFile: params.pdfFile,
      excelFile: params.excelFile,
      rowsLimit: getRowsLimit(),
      combinePdf: false,
      saveFileFunc: sendMailFunc(
        fromEmail,
        emailIndex,
        subjectTemplate,
        bodyTemplate
      ),
      updateProgressFunc: emailProgressFunc(emailIndex),
      canvasData: params.canvasData,
      formData: params.formData,
      filenameTemplate: params.filename,
    });

    if (created > 0) {
      if (Notification.isSupported()) {
        new Notification({
          title: 'Sent out emails success!',
          body: `Sent out ${created} email${created === 1 ? '' : 's'}`,
        }).show();
      }

      if (mailMergeWindow) {
        dialog.showMessageBox(mailMergeWindow, {
          type: 'info',
          title: 'Sent out emails success!',
          message: `Sent out ${created} email${
            created === 1 ? '' : 's'
          } successfully`,
        });
      }
    }
  } catch (e) {
    dialog.showErrorBox('Send emails failed', e.message);

    console.error(e);
    if (Notification.isSupported()) {
      new Notification({
        title: 'Send email failed',
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

ipcMain.handle(
  'save-path',
  async (_event: IpcMainInvokeEvent, { name, extensions }) => {
    const file = await dialog.showSaveDialog({
      filters: [{ name, extensions }],
    });
    return file && file.filePath;
  }
);

ipcMain.handle('save-config', async (_event, params: RenderPdfState) => {
  try {
    await saveConfig(params);
  } catch (e) {
    dialog.showErrorBox('Save config error', e.message);
  }
});

ipcMain.handle('load-config', async (_event, fp: string) => {
  try {
    return loadConfig(fp);
  } catch (e) {
    dialog.showErrorBox('Load config error', e.message);
    return null;
  }
});

ipcMain.handle('preview-pdf', async (_event, params: RenderPdfState) => {
  return previewPdf(params);
});

ipcMain.handle('save-pdf', async (_event, params: RenderPdfState) => {
  return savePdf(params);
});

ipcMain.handle('mail-merge', async (_event, params: RenderPdfState) => {
  return mailMerge(params);
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

ipcMain.handle('get-store', async (_event, { key }) => {
  return store.get(key);
});

ipcMain.handle('set-store', async (_event, { key, value }) => {
  return store.set(key, value);
});

ipcMain.handle('validate-smtp', async (_event, config: SmtpConfigType) => {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
  const result = new Promise((resolve) => {
    transporter.verify((error: any) => {
      resolve(error);
    });
  });
  return result;
});

ipcMain.handle(
  'send-email',
  async (
    _event,
    fromEmail: string,
    emailIndex: number,
    subjectTemplate: string,
    bodyTemplate: string,
    params: RenderPdfState
  ) => {
    const smtpConfig = store.get('smtp-config');
    if (!smtpConfig || !smtpConfig.valid) {
      dialog.showErrorBox(
        'Invalid SMTP configuration',
        'Please configure and validate the SMTP server first.'
      );
      return;
    }

    await sendPdfMail(
      fromEmail,
      emailIndex,
      subjectTemplate,
      bodyTemplate,
      params
    );
  }
);

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
