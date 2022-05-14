import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ipcRenderer } from 'electron';
import React, { useEffect, useState } from 'react';

export interface FontItem {
  name: string;
  path: string;
}

const FontConfig = () => {
  const [openingFont, setOpeningFont] = useState(false);
  const [customFonts, setCustomFonts] = useState<FontItem[]>([]);

  const loadCustomFonts = async () => {
    const fonts = await ipcRenderer.invoke('load-fonts');
    setCustomFonts(fonts);
  };

  const handleOpenFont = async () => {
    setOpeningFont(true);
    const filters = [
      { name: 'Font Files', extensions: ['ttf', 'woff', 'woff2', 'otf'] },
    ];
    const fp = await ipcRenderer.invoke('open-file', filters, 'path');
    setOpeningFont(false);

    if (!fp) {
      return;
    }

    await ipcRenderer.invoke('add-font', fp);
    await loadCustomFonts();
  };

  const handleDeleteFont = async (path: string) => {
    await ipcRenderer.invoke('delete-font', path);
    await loadCustomFonts();
  };

  useEffect(() => {
    loadCustomFonts();
  }, []);

  return (
    <section className="h-full p-8 space-y-8 overflow-scroll bg-gray-50">
      <h2 className="flex items-center justify-between w-full space-x-4 leading-8">
        <span className="text-lg font-bold">Font manager</span>
        <button
          className="btn"
          type="button"
          onClick={handleOpenFont}
          disabled={openingFont}
        >
          Add font...
        </button>
      </h2>
      <ul className="flex flex-col items-center justify-start flex-1 space-y-8 bg-gray-50">
        {customFonts.map(({ name, path }) => (
          <li
            key={path}
            className="flex items-center justify-start w-full p-4 space-x-4 transition-shadow bg-gray-100 border shadow-sm hover:shadow-md rounded-xl"
          >
            <section className="flex items-center justify-center flex-1 space-x-2 truncate">
              <section className="flex items-center justify-center flex-shrink-0 w-8">
                <FontAwesomeIcon icon="font" className="flex-1 w-5 h-5" />
              </section>
              <section className="flex-1 block space-y-2 truncate">
                {name}
              </section>
            </section>
            <section className="flex items-center justify-center">
              <FontAwesomeIcon
                icon={['far', 'trash-alt']}
                className="w-3 h-3 text-gray-400 cursor-pointer"
                onClick={() => handleDeleteFont(path)}
              />
            </section>
          </li>
        ))}

        {!customFonts.length && <p>Your custom fonts be listed here.</p>}
      </ul>
    </section>
  );
};

export default FontConfig;
