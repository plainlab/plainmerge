/* eslint-disable no-console */
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ipcRenderer } from 'electron';
import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { RenderPdf } from '../pdf/PdfEditor';

const MergeList = () => {
  const [merges, setMerges] = useState<RenderPdf[]>([]);

  const loadHistory = () => {
    ipcRenderer
      .invoke('load-history')
      .then((list) => setMerges(list))
      .catch(console.error);
  };

  const handleRemove = (filename: string) => {
    ipcRenderer
      .invoke('remove-history', { filename })
      .then(loadHistory)
      .catch(console.error);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <ul className="flex flex-col items-center justify-start flex-1 p-8 space-y-8 truncate bg-gray-50">
      {merges.map((state) => (
        <li
          className="flex items-center justify-start w-full p-4 space-x-4 bg-white border shadow-sm rounded-xl"
          key={state.pdfFile}
        >
          <section className="flex items-center justify-center flex-1 space-x-2 truncate">
            <NavLink
              to={{ pathname: '/new', state }}
              className="flex items-center justify-center flex-shrink-0 w-10"
            >
              <FontAwesomeIcon
                icon={['far', 'file-pdf']}
                className="flex-1 w-8 h-8 text-red-400 hover:opacity-80"
              />
            </NavLink>

            <section className="flex-1 block space-y-2 truncate">
              <NavLink
                to={{ pathname: '/new', state }}
                className="text-lg hover:opacity-80"
              >
                {state.pdfFile}
              </NavLink>
            </section>
          </section>
          <section className="flex items-center justify-center">
            <FontAwesomeIcon
              icon={['far', 'trash-alt']}
              onClick={() => handleRemove(state.pdfFile)}
              className="w-3 h-3 text-gray-400 cursor-pointer hover:opacity-80"
            />
          </section>
        </li>
      ))}
    </ul>
  );
};

export default MergeList;
