/* eslint-disable no-nested-ternary */
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ipcRenderer } from 'electron';
import React, { useEffect, useState } from 'react';

interface ConfigType {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  valid: boolean;
  error: Error | null;
}

const defaultConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  user: '',
  pass: '',
  valid: false,
  error: null,
};

const Config = () => {
  const [validating, setValidating] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [config, setConfig] = useState<ConfigType>(defaultConfig);

  const loadConfig = () => {
    ipcRenderer
      .invoke('get-store', { key: 'config' })
      .then((c) => {
        const conf = c || defaultConfig;
        setConfig({ ...conf, error: null });
        setLoaded(true);
        return null;
      })
      .catch(console.error);
  };

  const saveConfig = (c: ConfigType) => {
    ipcRenderer
      .invoke('set-store', { key: 'config', value: c })
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
    <section className="flex flex-col items-start justify-between h-full p-8">
      <section className="flex flex-col items-start justify-center space-y-8">
        <h2 className="text-lg font-bold leading-8">SMTP configuration</h2>

        <section className="flex flex-col items-start justify-center space-y-4">
          <div className="flex items-center justify-start">
            <p className="w-32 font-bold">Host:</p>
            <input
              type="text"
              placeholder="smtp.gmail.com"
              value={config?.host}
              onChange={handleChange('host')}
              className="w-96"
            />
          </div>
          <div className="flex items-center justify-start w-full">
            <p className="w-32 font-bold">Port:</p>
            <input
              type="number"
              placeholder="587"
              value={config?.port}
              onChange={handleChange('port')}
              className="w-96"
            />
          </div>
          <div className="flex items-center justify-start">
            <p className="w-32 font-bold">Secure:</p>
            <input
              type="checkbox"
              checked={config?.secure}
              onChange={handleChange('secure')}
            />
          </div>
          <div className="flex items-center justify-start">
            <p className="w-32 font-bold">Email:</p>
            <input
              type="text"
              placeholder="email"
              value={config?.user}
              onChange={handleChange('user')}
              className="w-96"
            />
          </div>
          <div className="flex items-center justify-start">
            <p className="w-32 font-bold">Password:</p>
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

      <section className="opacity-50">
        <h3 className="font-bold leading-8">Gmail SMTP example:</h3>
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
          <p className="w-32">Email:</p>
          <p className="font-medium">your@email.com</p>
        </div>
        <div className="flex">
          <p className="w-32">Password:</p>
          <p className="font-medium">email-pass-or-2fa-pass</p>
        </div>
      </section>
    </section>
  );
};

export default Config;
