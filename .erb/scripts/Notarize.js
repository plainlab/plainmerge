exports.default = async function notarizeMacos(context) {
  console.warn('Skipping notarizing step. Packaging is not running in CI');
  return;
};
