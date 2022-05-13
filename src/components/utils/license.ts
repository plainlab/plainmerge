import { CheckStatus, createLicenseManager } from 'electron-gumroad-license';

const licenseManager = createLicenseManager('sHNrv');

const getRowsLimit = async () => {
  try {
    const { status } = await licenseManager.checkCurrentLicense();
    if (status === CheckStatus.ValidLicense) {
      return 100_000;
    }
    return 10;
  } catch (e) {
    return 10;
  }
};

export { licenseManager, getRowsLimit };
