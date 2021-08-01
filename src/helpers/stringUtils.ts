export const camelToText = (camel: string) =>
  camel
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .replace(/^./, (str) => {
      return str.toUpperCase();
    });

export default { camelToText };
