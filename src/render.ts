/* eslint-disable no-await-in-loop */
import { Rect, Textbox } from 'fabric/fabric-impl';
import {
  PDFDocument,
  StandardFonts,
  PDFFont,
  rgb,
  layoutMultilineText,
  TextAlignment,
  PDFPage,
} from 'pdf-lib';
import fs from 'fs';
import { promisify } from 'util';
import XLSX from 'xlsx';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const SheetRowsLimit = 100;

interface MyTextbox extends Textbox {
  index: number;
}
export interface CanvasObjects {
  objects: [MyTextbox | Rect];
}

export interface RenderPdf {
  pdfFile: string;
  excelFile: string;
  combinePdf: boolean;
  pageNumber: number;
  canvasData: CanvasObjects;
  canvasWidth: number;
}

type FontMap = Record<string, PDFFont>;
type RowMap = Record<number, string>;

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

const getFont = async (
  font: string | undefined,
  pdfDoc: PDFDocument,
  cachedFonts: FontMap
) => {
  const key = font || StandardFonts.Helvetica;
  if (!cachedFonts[key]) {
    cachedFonts[key] = await pdfDoc.embedFont(key);
  }
  return cachedFonts[key];
};

const sheetToArray = (sheet: XLSX.WorkSheet) => {
  const result = [];
  if (sheet['!ref']) {
    const range = XLSX.utils.decode_range(sheet['!ref']);
    for (let rowNum = range.s.r; rowNum <= range.e.r; rowNum += 1) {
      const row = [];
      for (let colNum = range.s.c; colNum <= range.e.c; colNum += 1) {
        const nextCell =
          sheet[XLSX.utils.encode_cell({ r: rowNum, c: colNum })];
        if (!nextCell) {
          row.push('');
        } else {
          row.push(nextCell.v);
        }
      }
      result.push(row);
    }
  }
  return result;
};

const readFirstSheet = (path: string) => {
  const workbook = XLSX.readFile(path, { sheetRows: SheetRowsLimit });
  const sheetsList = workbook.SheetNames;
  const firstSheet = workbook.Sheets[sheetsList[0]];
  const rows = sheetToArray(firstSheet)
    .slice(1) // Skip header
    .map((arr) => {
      const row: RowMap = {};
      arr.forEach((r, i) => {
        row[i] = r;
      });
      return row;
    });
  return rows;
};

const renderPage = async (
  row: RowMap,
  page: PDFPage,
  canvasData: CanvasObjects,
  canvasWidth: number,
  pdfDoc: PDFDocument,
  cachedFonts: FontMap
) => {
  const { width, height } = page.getSize();
  const ratio = width / canvasWidth;

  for (let i = 0; i < canvasData.objects.length; i += 1) {
    const obj = canvasData.objects[i];
    if (obj.type === 'text') {
      const o = obj as MyTextbox;

      const rgbCode = hexToRgb(o.fill as string);
      const color = rgb(rgbCode.r / 255, rgbCode.g / 255, rgbCode.b / 255);

      // eslint-disable-next-line no-await-in-loop
      const font = await getFont(o.fontFamily, pdfDoc, cachedFonts);

      // FIXME: Font size is just an illusion...
      const size = (o.fontSize || 16) * ratio;

      // pdf-lib draw text at baseline, fabric use bounding box
      const offset =
        font.heightAtSize(size) - font.heightAtSize(size, { descender: false });

      const x = (o.left || 0) * ratio + 1;
      const y =
        height - (o.top || 0) * ratio - (o.height || 0) * ratio + offset;

      let alignment = TextAlignment.Left;
      if (o.textAlign === 'right') {
        alignment = TextAlignment.Right;
      } else if (o.textAlign === 'center') {
        alignment = TextAlignment.Center;
      }

      const text = row[o.index];
      const multiText = layoutMultilineText(text || '', {
        font,
        fontSize: size,
        bounds: {
          x,
          y,
          width: (o.width || 100) * ratio,
          height: (o.height || 100) * ratio,
        },
        alignment,
      });

      multiText.lines.forEach((p) => {
        page.drawText(p.text, {
          x: p.x,
          y: p.y,
          lineHeight: o.lineHeight,
          size,
          font,
          maxWidth: (o.width || 100) * ratio,
          color,
        });
      });
    } else if (obj.type === 'qrcode') {
      // TODO: Handle qrcode here
    }
  }
};

const renderPdf = async (
  output: string,
  pdfFile: string,
  pageIndex: number,
  excelFile: string,
  combinePdf: boolean,
  canvasData: CanvasObjects,
  canvasWidth: number
) => {
  const pdfBuff = await readFile(pdfFile);
  const pdfDoc = await PDFDocument.load(pdfBuff);

  let newDoc = await PDFDocument.create();
  let cachedFonts: FontMap = {};

  const rows: RowMap[] = readFirstSheet(excelFile);
  for (let i = 0; i < rows.length; i += 1) {
    const [page] = await newDoc.copyPages(pdfDoc, [pageIndex]);
    await renderPage(
      rows[i],
      page,
      canvasData,
      canvasWidth,
      newDoc,
      cachedFonts
    );
    newDoc.addPage(page);

    if (!combinePdf) {
      const pdfBytes = await newDoc.save();
      const outputs = output.split('.');
      const outputi =
        outputs.slice(0, outputs.length - 1).join('.') +
        i +
        outputs[outputs.length - 1];
      await writeFile(outputi, pdfBytes);

      // Reset
      newDoc = await PDFDocument.create();
      cachedFonts = {};
    }
  }

  if (combinePdf) {
    const pdfBytes = await newDoc.save();
    await writeFile(output, pdfBytes);
    return 1;
  }

  return rows.length;
};

export default renderPdf;
