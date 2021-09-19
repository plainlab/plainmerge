/* eslint-disable no-alert */
import { ipcRenderer } from 'electron';
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import Tags from '@yaireo/tagify/dist/react.tagify';

import { DataHeader, RenderPdfState } from '../pdf/PdfEditor';
import { readExcelMeta } from '../utils/excel';
import { SmtpConfigKey, SmtpConfigType } from './Config';

type EmailProps = {
  configPath: string;
};

const Email = ({ configPath }: EmailProps) => {
  const [pdfConfig, setPdfConfig] = useState<RenderPdfState>();
  const [headers, setHeaders] = useState<DataHeader[]>([]);
  const [emailCount, setEmailCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [emailIndex, setEmailIndex] = useState(0);

  const tagSettings = {
    pattern: /@/,
    mode: 'mix',
    duplicates: true,
    dropdown: {
      enabled: 1,
    },
  };

  const loadConfig = async (fp: string) => {
    const pdfConf: RenderPdfState = await ipcRenderer.invoke('load-config', fp);
    const { firstRow, rowCount } = await readExcelMeta(pdfConf.excelFile);
    setHeaders(firstRow);
    setEmailCount(rowCount);
    setPdfConfig(pdfConf);

    const smtpConf: SmtpConfigType = await ipcRenderer.invoke('get-store', {
      key: SmtpConfigKey,
    });
    setFromEmail(smtpConf.user);
  };

  const handleChangeSubject = (e: any) => {
    setSubject(e.detail.value);
  };

  const handleChangeBody = (e: any) => {
    setBody(e.detail.value);
  };

  const handleSendEmail = async () => {
    setSending(true);
    await ipcRenderer.invoke(
      'send-email',
      fromEmail,
      emailIndex,
      subject,
      body,
      pdfConfig
    );
    setSending(false);
  };

  useEffect(() => {
    loadConfig(configPath).catch((e) => alert(e.message));

    ipcRenderer.on('email-progress', (_event, p) => {
      setProgress(p.page);
      setEmailCount(p.total);
    });
  }, []);

  return (
    <section className="absolute inset-0 flex flex-col items-start justify-between p-8 space-y-8 overflow-x-hidden overflow-y-auto bg-gray-50">
      <section className="flex flex-col items-start justify-center w-full space-y-8">
        <h2 className="text-lg font-bold leading-8">Send emails</h2>

        <section className="flex flex-col w-full space-y-6">
          <div className="flex flex-col space-y-2">
            <section className="flex items-center justify-between space-y-2">
              <p className="font-bold">From:</p>
            </section>
            <input
              type="text"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col space-y-2">
            <section className="flex items-center justify-between space-y-2">
              <p className="font-bold">To:</p>
              <small className="text-xs text-right opacity-70">
                Choose a column that contains email address for sending
              </small>
            </section>
            <select
              className="px-1 py-2"
              value={emailIndex}
              onChange={(e) => setEmailIndex(parseInt(e.target.value, 10))}
            >
              {headers.map(({ index, label }) => (
                <option key={index} value={index}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col space-y-2">
            <section className="flex items-center justify-between space-y-2">
              <p className="font-bold">Subject:</p>
              <small className="text-xs text-right opacity-70">
                Type @ to insert column value into subject
              </small>
            </section>
            <Tags
              placeholder="Email subject"
              onChange={handleChangeSubject}
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              settings={tagSettings}
              whitelist={headers.map(({ index, label }) => ({
                id: index,
                value: label,
              }))}
            />
          </div>

          <div className="flex flex-col space-y-2">
            <section className="flex items-center justify-between space-y-2">
              <p className="font-bold">Body:</p>
              <small className="text-xs text-right opacity-70">
                Type @ to insert column value into body
              </small>
            </section>
            <Tags
              placeholder="Email content"
              InputMode="textarea"
              onChange={handleChangeBody}
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              settings={tagSettings}
              whitelist={headers.map(({ index, label }) => ({
                id: index,
                value: label,
              }))}
            />
          </div>
        </section>

        <section className="flex flex-col items-start justify-center mb-10 space-y-4">
          <p className={sending ? 'text-green-500 p-1' : 'p-1'}>
            {sending
              ? `Sending email ${progress} of ${emailCount}`
              : `${emailCount} email${
                  emailCount === 1 ? '' : 's'
                } will be sent out with ${emailCount} merged PDF${
                  emailCount === 1 ? '' : 's'
                }`}
          </p>
          <button
            className="btn"
            type="button"
            onClick={handleSendEmail}
            disabled={!subject || !body || !fromEmail || sending}
          >
            Send
          </button>
        </section>
      </section>
      <Helmet>
        <title>Send PDFs as email attachments</title>
      </Helmet>
    </section>
  );
};

export default Email;
