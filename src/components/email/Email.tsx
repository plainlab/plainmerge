/* eslint-disable no-alert */
import { ipcRenderer } from 'electron';
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { DataHeader, RenderPdfState } from '../pdf/PdfEditor';
import { readExcelMeta } from '../utils/excel';

type EmailProps = {
  configPath: string;
};

const Email = ({ configPath }: EmailProps) => {
  const [headers, setHeaders] = useState<DataHeader[]>([]);

  const loadConfig = async (fp: string) => {
    const pdfConfig: RenderPdfState = await ipcRenderer.invoke(
      'load-config',
      fp
    );
    const { firstRow } = await readExcelMeta(pdfConfig.excelFile);
    setHeaders(firstRow);
  };

  useEffect(() => {
    loadConfig(configPath).catch((e) => alert(e.message));
  }, []);

  return (
    <section className="absolute inset-0 flex flex-col items-start justify-between p-8 space-y-8 bg-gray-50">
      <section className="flex flex-col items-start justify-center space-y-8">
        <h2 className="text-lg font-bold leading-8">Send emails</h2>

        <section className="flex flex-col space-y-6">
          <div className="flex flex-col space-y-2">
            <section className="flex items-center justify-start space-x-2">
              <p className="font-bold">Recipients:</p>
              <small className="text-xs opacity-70">
                Choose a column that contains email address for sending
              </small>
            </section>
            <select>
              {headers.map(({ index, label }) => (
                <option key={index} value={index}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col space-y-2">
            <p className="font-bold">Subject:</p>
            <input type="text" placeholder="Email subject" />
          </div>

          <div className="flex flex-col space-y-2">
            <p className="font-bold">Body:</p>
            <textarea placeholder="Email content" />
          </div>
        </section>
      </section>
      <Helmet>
        <title>Send PDFs as email attachments</title>
      </Helmet>
    </section>
  );
};

export default Email;
