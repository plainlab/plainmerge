import { ipcRenderer } from 'electron';
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';

const BuyNow = () => {
  const [license, setLicense] = useState('');
  const [registering, setRegistering] = useState(false);

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const success = await ipcRenderer.invoke('add-license', license);
      if (success) {
        alert('Register successfully, please restart the app and enjoy!');
      } else {
        alert('Wrong license key!');
      }
    } catch (e) {
      alert(e.message);
    }
    setRegistering(false);
  };

  return (
    <div className="flex flex-col items-start justify-center p-8 space-y-20">
      <h1 className="w-full text-xl font-medium leading-6 text-center">
        Thank you for your purchase!
      </h1>
      <section className="flex items-start justify-between w-full space-x-8">
        <section className="flex flex-col w-full space-y-4">
          <h2 className="text-base font-medium leading-4">
            Input your license key here:
          </h2>
          <input
            type="text"
            value={license}
            onChange={(e) => setLicense(e.target.value)}
          />
          <button
            type="button"
            className="btn"
            onClick={handleRegister}
            disabled={!license || registering}
          >
            Register
          </button>
        </section>

        <section className="flex flex-col w-full space-y-4">
          <h2 className="text-base font-medium leading-4 opacity-70">
            Not purchased yet? Buy now on Gumroad:
          </h2>
          <p>
            <a
              href="https://plainlab.gumroad.com/l/plainmerge"
              target="new"
              className="hover:opacity-100 opacity-70"
            >
              https://plainlab.gumroad.com/l/plainmerge
            </a>
          </p>
        </section>
      </section>

      <Helmet>
        <title>Register your purchase</title>
      </Helmet>
    </div>
  );
};

export default BuyNow;
