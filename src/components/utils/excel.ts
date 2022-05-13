import XLSX from 'xlsx';

const readExcelMeta = async (fp: string, rowsLimit: number) => {
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

  let rowCount = rowsLimit;
  if (firstSheet['!fullref']) {
    const range = XLSX.utils.decode_range(firstSheet['!fullref']);
    const realRows = range.e.r - range.s.r;
    rowCount = Math.min(rowCount, realRows);
  }

  return { firstRow, rowCount };
};

export default readExcelMeta;
