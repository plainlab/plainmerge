/* eslint-disable no-alert */
import { ipcRenderer } from 'electron';
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import Tags from '@yaireo/tagify/dist/react.tagify';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { DataHeader, RenderPdfState } from '../pdf/PdfEditor';
import readExcelMeta from '../utils/excel';
import { SmtpConfigKey, SmtpConfigType } from '../config/SMTP';

type MailMergeProps = {
  configPath: string;
};

const MailMerge = ({ configPath }: MailMergeProps) => {
  const [pdfConfig, setPdfConfig] = useState<RenderPdfState>();
  const [headers, setHeaders] = useState<DataHeader[]>([]);
  const [rowsCount, setRowsCount] = useState(0);
  const [emailProgress, setEmailProgress] = useState(0);
  const [email, setEmail] = useState('');
  const [fileProgress, setFileProgress] = useState(0);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [emailIndex, setEmailIndex] = useState(0);
  const [combinePdf, setCombinePdf] = useState(true);
  const [outputPdf, setOutputPdf] = useState('');
  const [smtpValid, setSmtpValid] = useState(false);
  const [tab, setTab] = useState('local');
  const [filename, setFilename] = useState('');

  const tagSettings = {
    pattern: /@/,
    mode: 'mix',
    duplicates: true,
    dropdown: {
      enabled: 1,
    },
  };

  const loadConfig = async (fp: string, rowsLimit: number) => {
    const pdfConf: RenderPdfState = await ipcRenderer.invoke('load-config', fp);
    const { firstRow, rowCount } = await readExcelMeta(
      pdfConf.excelFile,
      rowsLimit
    );
    setHeaders(firstRow);
    setRowsCount(rowCount);
    setPdfConfig(pdfConf);

    const smtpConf: SmtpConfigType | undefined = await ipcRenderer.invoke(
      'get-store',
      {
        key: SmtpConfigKey,
      }
    );
    setFromEmail(smtpConf ? smtpConf.user : '');
    setSmtpValid(smtpConf ? smtpConf.valid : false);
  };

  const handleChangeSubject = (e: any) => {
    setSubject(e.detail.value);
  };

  const handleChangeBody = (e: any) => {
    setBody(e.detail.value);
  };

  const handleChangeFilename = (e: any) => {
    setFilename(e.detail.value);
  };

  const handleChooseFile = () => {
    const name = 'PDF file';
    const extensions = ['pdf'];
    ipcRenderer
      .invoke('save-path', { name, extensions })
      .then((p) => setOutputPdf(p))
      .catch((e) => alert(e.message));
  };

  const handleSendEmail = async () => {
    setSending(true);
    const conf = { ...pdfConfig, filename };
    await ipcRenderer.invoke(
      'send-email',
      fromEmail,
      emailIndex,
      subject,
      body,
      conf
    );
    setSending(false);
  };

  const handleSavePdf = async () => {
    setSaving(true);
    const conf = { ...pdfConfig, combinePdf, outputPdf, filename };
    await ipcRenderer.invoke('save-pdf', conf);
    setSaving(false);
  };

  useEffect(() => {
    ipcRenderer
      .invoke('get-rows-limit')
      .then((limit) =>
        // eslint-disable-next-line promise/no-nesting
        loadConfig(configPath, limit).catch((e) => alert(e.message))
      )
      .catch(() => {});

    ipcRenderer.on('email-progress', (_event, p) => {
      setEmailProgress(p.page);
      setRowsCount(p.total);
      setEmail(p.email);
    });

    ipcRenderer.on('save-progress', (_event, p) => {
      setFileProgress(p.page);
      setRowsCount(p.total);
    });
  }, []);

  return (
    <section className="absolute inset-0 flex flex-col items-start justify-start px-8 py-6 space-y-8 overflow-x-hidden overflow-y-auto bg-gray-50">
      <div className="w-full border-b border-gray-200 dark:border-gray-700">
        <ul className="flex flex-wrap -mb-px">
          <li className="mr-2">
            <button
              type="button"
              onClick={() => setTab('local')}
              className={`inline-flex outline-none appearance-none items-center px-4 pt-4 pb-2 text-sm font-medium text-center border-b-2 border-transparent rounded-t-lg group ${
                tab === 'email'
                  ? 'text-gray-500 hover:text-gray-600 hover:border-gray-300'
                  : 'text-blue-600 border-blue-600'
              }`}
            >
              <FontAwesomeIcon icon="folder" className="mr-2" />
              Merge into Files
            </button>
          </li>
          <li className="mr-2">
            <button
              type="button"
              onClick={() => setTab('email')}
              className={`inline-flex outline-none appearance-none items-center px-4 pt-4 pb-2 text-sm font-medium text-center border-b-2 rounded-t-lg active group ${
                tab === 'local'
                  ? 'text-gray-500 hover:text-gray-600 hover:border-gray-300'
                  : 'text-blue-600 border-blue-600'
              }`}
            >
              <FontAwesomeIcon icon="envelope" className="mr-2" />
              Send out Emails
            </button>
          </li>
        </ul>
      </div>

      <section
        className={`flex flex-col items-start justify-start w-full pb-8 space-y-8 ${
          tab === 'local' ? '' : 'hidden'
        }`}
      >
        <section className="flex flex-col w-full space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <p className="font-medium">Location:</p>
            <input type="text" value={outputPdf} disabled className="flex-1" />
            <button type="button" onClick={handleChooseFile} className="btn">
              Choose...
            </button>
          </div>

          <section className="flex items-center space-x-4">
            <p>Merge into:</p>

            <label htmlFor="combined" className="flex items-center space-x-1">
              <input
                type="radio"
                className="rounded"
                name="seperator"
                id="combined"
                checked={combinePdf}
                onChange={() => setCombinePdf(true)}
              />
              <p>1 PDF</p>
            </label>

            {rowsCount > 1 ? (
              <label
                htmlFor="separated"
                className="flex items-center space-x-1"
              >
                <input
                  type="radio"
                  name="seperator"
                  id="separated"
                  checked={!combinePdf}
                  onChange={() => setCombinePdf(false)}
                />
                <p>{rowsCount} PDFs</p>
              </label>
            ) : null}
          </section>

          {!combinePdf && (
            <div className="flex flex-col space-y-2">
              <section className="flex items-center justify-between space-y-2">
                <p className="font-medium">Filename:</p>
                <small className="text-xs text-right opacity-70">
                  Type @ to insert column values into the filename
                </small>
              </section>
              <Tags
                placeholder="Filename"
                InputMode="textarea"
                onChange={handleChangeFilename}
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                settings={tagSettings}
                whitelist={headers.map(({ index, label }) => ({
                  id: index,
                  value: label,
                }))}
              />
            </div>
          )}
        </section>

        <section className="flex flex-col items-start justify-center space-y-8">
          <section className="opacity-70">
            {saving ? (
              <p className="text-green-500">
                Process record {fileProgress} of {rowsCount}
              </p>
            ) : (
              <p>
                {combinePdf
                  ? `1 PDF`
                  : `${rowsCount} PDF${rowsCount === 1 ? '' : 's'}`}

                {` of ${rowsCount} record${
                  rowsCount === 1 ? '' : 's'
                } will be created`}
              </p>
            )}
          </section>
          <button
            className="btn"
            type="button"
            onClick={handleSavePdf}
            disabled={!outputPdf || saving}
          >
            Merge
          </button>
        </section>
      </section>

      <section
        className={`flex flex-col items-start justify-center w-full pb-8 space-y-8 ${
          tab === 'email' ? '' : 'hidden'
        }`}
      >
        {!smtpValid && (
          <section className="w-full space-y-2">
            <p className="text-red-500">
              Invalid SMTP configuration. Please configure and validate your
              SMTP server in the Settings menu.
            </p>
          </section>
        )}

        <section className="flex flex-col w-full space-y-6">
          <div className="flex flex-col space-y-2">
            <section className="flex items-center justify-between space-y-2">
              <p className="font-medium">From:</p>
            </section>
            <input
              type="text"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              disabled
              required
            />
          </div>

          <div className="flex flex-col space-y-2">
            <section className="flex items-center justify-between space-y-2">
              <p className="font-medium">To:</p>
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
              <p className="font-medium">Subject:</p>
              <small className="text-xs text-right opacity-70">
                Type @ to insert column values into the subject
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
              <p className="font-medium">Body:</p>
              <small className="text-xs text-right opacity-70">
                Type @ to insert column values into the body
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

          <div className="flex flex-col space-y-2">
            <section className="flex items-center justify-between space-y-2">
              <p className="font-medium">Filename:</p>
              <small className="text-xs text-right opacity-70">
                Type @ to insert column values into the filename
              </small>
            </section>
            <Tags
              placeholder="Filename"
              InputMode="textarea"
              onChange={handleChangeFilename}
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

        <section className="flex flex-col items-start justify-center mb-10 space-y-8">
          <section className="opacity-70">
            {sending ? (
              <p className="text-green-500">
                Sending email {emailProgress} of {rowsCount} (to {email})
              </p>
            ) : (
              <p>
                {rowsCount} email{rowsCount === 1 ? '' : 's'} will be sent out
              </p>
            )}
          </section>
          <button
            className="btn"
            type="button"
            onClick={handleSendEmail}
            disabled={!subject || !body || !fromEmail || !smtpValid || sending}
          >
            Send
          </button>
        </section>
      </section>
      <Helmet>
        <title>Mail merge</title>
      </Helmet>
    </section>
  );
};

export default MailMerge;
