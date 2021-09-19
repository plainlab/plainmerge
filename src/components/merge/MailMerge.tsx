/* eslint-disable no-alert */
import { ipcRenderer } from 'electron';
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import Tags from '@yaireo/tagify/dist/react.tagify';

import { DataHeader, RenderPdfState } from '../pdf/PdfEditor';
import { readExcelMeta } from '../utils/excel';
import { SmtpConfigKey, SmtpConfigType } from '../email/Config';

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

  const handleSavePdf = async () => {
    setSaving(true);
    const conf = { ...pdfConfig, combinePdf, outputPdf };
    await ipcRenderer.invoke('save-pdf', conf);
    setSaving(false);
  };

  useEffect(() => {
    loadConfig(configPath).catch((e) => alert(e.message));

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
    <section className="absolute inset-0 flex flex-col items-start justify-between p-8 space-y-8 overflow-x-hidden overflow-y-auto bg-gray-50">
      <section className="flex flex-col items-start justify-center w-full pb-8 space-y-8">
        <h2 className="w-full text-lg font-bold leading-8 border-b">
          Save to files
        </h2>

        <section className="flex flex-col w-full space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <p className="font-bold">Save to:</p>
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
        </section>

        <section className="flex flex-col items-start justify-center space-y-4">
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
            Save
          </button>
        </section>
      </section>

      <section className="flex flex-col items-start justify-center w-full pb-8 space-y-8">
        <section className="w-full space-y-2">
          <h2 className="w-full text-lg font-bold leading-8 border-b">
            Send as email attachments
          </h2>

          {!smtpValid ? (
            <p className="text-red-500">
              Invalid SMTP configuration. Please configure and validate SMTP
              server first.
            </p>
          ) : null}
        </section>

        <section className="flex flex-col w-full space-y-6">
          <div className="flex flex-col space-y-2">
            <section className="flex items-center justify-between space-y-2">
              <p className="font-bold">From:</p>
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
