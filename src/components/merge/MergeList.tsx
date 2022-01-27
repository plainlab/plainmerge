/* eslint-disable no-console */
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ipcRenderer } from 'electron';
import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { RenderPdfState } from '../pdf/PdfEditor';

const MergeList = () => {
  const [merges, setMerges] = useState<RenderPdfState[]>([]);

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
          className="flex items-center justify-start w-full p-4 space-x-4 transition-shadow bg-gray-100 border shadow-sm hover:shadow-md rounded-xl"
          key={state.pdfFile}
        >
          <section className="flex items-center justify-center flex-1 space-x-2 truncate">
            <NavLink
              to={{ pathname: '/new', state }}
              className="flex items-center justify-center flex-shrink-0 w-8"
            >
              <FontAwesomeIcon
                icon={['far', 'file-pdf']}
                className="flex-1 w-5 h-5 text-red-400 hover:opacity-80"
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

      {merges.length === 0 ? (
        <p>Recent files will be saved here when you Preview or Merge.</p>
      ) : null}
    </ul>
  );
};

export default MergeList;
