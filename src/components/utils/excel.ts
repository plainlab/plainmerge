import XLSX from 'xlsx';

export const getRowsLimit = () => {
  if (process.env.PAID) {
    return 100_000;
  }
  return 10;
};

export const readExcelMeta = async (fp: string) => {
  // Read headers
  const workbook = XLSX.readFile(fp, { sheetRows: 1 });
  const sheetsList = workbook.SheetNames;
  const firstSheet = workbook.Sheets[sheetsList[0]];
  const sheetData = XLSX.utils.sheet_to_json(firstSheet, {
    header: 1,
    defval: '',
    blankrows: true,
  });
  const labels = sheetData.map((_v, _i, array) => array).flat(2);
  const firstRow = labels.map((label, index) => ({
    index,
    label: label as string,
  }));

  let rowCount = getRowsLimit();
  if (firstSheet['!fullref']) {
    const range = XLSX.utils.decode_range(firstSheet['!fullref']);
    const realRows = range.e.r - range.s.r;
    rowCount = Math.min(rowCount, realRows);
  }

  return { firstRow, rowCount };
};
