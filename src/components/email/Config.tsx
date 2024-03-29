/* eslint-disable no-nested-ternary */
import { ipcRenderer } from 'electron';
import React, { useEffect, useState } from 'react';

export interface SmtpConfigType {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  valid: boolean;
  error: Error | null;
}

const defaultSmtpConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  user: '',
  pass: '',
  valid: false,
  error: null,
};

export const SmtpConfigKey = 'smtp-config';

const Config = () => {
  const [validating, setValidating] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [config, setConfig] = useState<SmtpConfigType>(defaultSmtpConfig);

  const loadConfig = () => {
    ipcRenderer
      .invoke('get-store', { key: SmtpConfigKey })
      .then((c) => {
        const conf = c || defaultSmtpConfig;
        setConfig({ ...conf, error: null });
        setLoaded(true);
        return null;
      })
      .catch(console.error);
  };

  const saveConfig = (c: SmtpConfigType) => {
    ipcRenderer
      .invoke('set-store', { key: SmtpConfigKey, value: c })
      .catch(console.error);
  };

  const handleChange = (field: string) => {
    if (field === 'secure') {
      return () => {
        setConfig({
          ...config,
          secure: !config.secure,
          valid: false,
          error: null,
        });
      };
    }

    if (field === 'port') {
      return (e: any) => {
        setConfig({
          ...config,
          port: parseInt(e.target.value, 10),
          valid: false,
          error: null,
        });
      };
    }

    return (e: any) => {
      const { value } = e.target;
      switch (field) {
        case 'host':
          setConfig({ ...config, host: value, valid: false, error: null });
          break;
        case 'port':
          setConfig({ ...config, port: value, valid: false, error: null });
          break;
        case 'user':
          setConfig({ ...config, user: value, valid: false, error: null });
          break;
        case 'pass':
          setConfig({ ...config, pass: value, valid: false, error: null });
          break;
        default:
      }
    };
  };

  const handleValidate = () => {
    setValidating(true);
    ipcRenderer
      .invoke('validate-smtp', config)
      .then((error: Error) => {
        setConfig({ ...config, valid: !error, error });
        setValidating(false);
        return null;
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (loaded) {
      saveConfig(config);
    }
  }, [config, loaded]);

  useEffect(() => {
    loadConfig();
  }, []);

  return (
    <section className="flex flex-col items-start justify-between flex-1 p-8 space-y-8 bg-gray-50">
      <section className="flex flex-col items-start justify-center space-y-8">
        <h2 className="space-x-1 leading-8">
          <span className="text-lg font-bold">SMTP configuration</span>
          <span className="text-md">(For sending out emails)</span>
        </h2>

        <section className="flex flex-col items-start justify-center space-y-4">
          <div className="flex items-center justify-start">
            <p className="w-32 font-medium">Host:</p>
            <input
              type="text"
              placeholder="smtp.gmail.com"
              value={config?.host}
              onChange={handleChange('host')}
              className="w-96"
            />
          </div>
          <div className="flex items-center justify-start w-full">
            <p className="w-32 font-medium">Port:</p>
            <input
              type="number"
              placeholder="587"
              value={config?.port}
              onChange={handleChange('port')}
              className="w-96"
            />
          </div>
          <div className="flex items-center justify-start">
            <p className="w-32 font-medium">Secure:</p>
            <input
              type="checkbox"
              checked={config?.secure}
              onChange={handleChange('secure')}
            />
          </div>
          <div className="flex items-center justify-start">
            <p className="w-32 font-medium">User:</p>
            <input
              type="text"
              placeholder="email"
              value={config?.user}
              onChange={handleChange('user')}
              className="w-96"
            />
          </div>
          <div className="flex items-center justify-start">
            <p className="w-32 font-medium">Password:</p>
            <input
              type="password"
              placeholder="password"
              value={config?.pass}
              onChange={handleChange('pass')}
              className="w-96"
            />
          </div>
        </section>

        <section className="flex flex-col items-start justify-center space-y-4">
          <p
            className={
              config.valid || validating ? 'text-green-500' : 'text-red-500'
            }
          >
            {validating
              ? 'Validating...'
              : config.valid
              ? 'Valid SMTP configuration'
              : config.error
              ? config.error.message
              : 'Validation needed'}
          </p>
          <button
            className="btn"
            type="button"
            onClick={handleValidate}
            disabled={validating}
          >
            Validate
          </button>
        </section>
      </section>

      <section className="space-y-2 opacity-30">
        <h3 className="font-medium leading-8">
          Gmail SMTP example:{' '}
          <small className="font-normal">(Some limitations may apply)</small>
        </h3>
        <div className="flex">
          <p className="w-32">Host:</p>
          <p className="font-medium">smtp.gmail.com</p>
        </div>
        <div className="flex">
          <p className="w-32">Port:</p>
          <p className="font-medium">587</p>
        </div>
        <div className="flex">
          <p className="w-32">Secure:</p>
          <p className="font-medium">Uncheck</p>
        </div>
        <div className="flex">
          <p className="w-32">User:</p>
          <p className="font-medium">your@email.com</p>
        </div>
        <div className="flex">
          <p className="w-32">Password:</p>
          <p className="font-medium">email-password-or-2fa-passcode</p>
        </div>
      </section>
    </section>
  );
};

export default Config;
