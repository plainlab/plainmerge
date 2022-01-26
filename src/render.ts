/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-loop-func */
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
  PDFForm,
  PDFField,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
} from 'pdf-lib';
import fs from 'fs';
import { promisify } from 'util';
import XLSX from 'xlsx';
import QRCode from 'qrcode';

const readFile = promisify(fs.readFile);

interface Fieldbox extends Textbox {
  index: number;
  renderType: string;
}
export interface CanvasObjects {
  objects: [Fieldbox | Rect];
  clientWidth: number;
}

export interface RenderPdfState {
  pdfFile: string;
  excelFile: string;
  combinePdf: boolean;
  outputPdf: string;
  canvasData?: CanvasMap;
  formData?: FormMap;
}

export type RowMap = Record<number, string>;
type FontMap = Record<string, PDFFont>;
type FormMap = Record<string, number>;
type CanvasMap = Record<number, CanvasObjects>;

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

const readFirstSheet = (path: string, rowsLimit: number) => {
  const headerOffset = 1;
  const sheetRows = rowsLimit + headerOffset;

  const workbook = XLSX.readFile(path, { sheetRows });
  const sheetsList = workbook.SheetNames;
  const firstSheet = workbook.Sheets[sheetsList[0]];
  const rows = sheetToArray(firstSheet)
    .slice(headerOffset) // Skip header
    .map((arr) => {
      const row: RowMap = {};
      arr.forEach((r, i) => {
        row[i] = r;
      });
      return row;
    });
  return rows;
};

// This workaround fixes TS to JS compiling problem
type SupportedField =
  | ''
  | 'TextField'
  | 'CheckBox'
  | 'RadioGroup'
  | 'OptionList'
  | 'Dropdown';

const getFieldType = (fld: PDFField): SupportedField => {
  if (fld instanceof PDFTextField) {
    return 'TextField';
  }
  if (fld instanceof PDFCheckBox) {
    return 'CheckBox';
  }
  if (fld instanceof PDFRadioGroup) {
    return 'RadioGroup';
  }
  if (fld instanceof PDFOptionList) {
    return 'OptionList';
  }
  if (fld instanceof PDFDropdown) {
    return 'Dropdown';
  }
  return '';
};

const renderForm = (row: RowMap, formData?: FormMap, pdfForm?: PDFForm) => {
  if (!pdfForm || !formData) {
    return;
  }
  const fieldMap: Record<string, PDFField> = {};
  pdfForm.getFields().forEach((f) => {
    fieldMap[f.getName()] = f;
  });

  Object.keys(formData).forEach((key) => {
    const index = formData[key];
    let value = row[index];

    if (index === -1 || value === undefined || value === null) {
      return;
    }

    const field = fieldMap[key];
    value = `${value}`;

    switch (getFieldType(field)) {
      case 'TextField':
        pdfForm.getTextField(key).setText(value);
        break;
      case 'CheckBox':
        if (value && value.toLowerCase() === 'true') {
          pdfForm.getCheckBox(key).check();
        } else {
          pdfForm.getCheckBox(key).uncheck();
        }
        break;
      case 'RadioGroup':
        if (pdfForm.getRadioGroup(key).getOptions().includes(value)) {
          pdfForm.getRadioGroup(key).select(value);
        }
        break;
      case 'OptionList':
        if (pdfForm.getOptionList(key).getOptions().includes(value)) {
          pdfForm.getOptionList(key).select(value);
        }
        break;
      case 'Dropdown':
        if (pdfForm.getDropdown(key).getOptions().includes(value)) {
          pdfForm.getDropdown(key).select(value);
        }
        break;
      default:
        break;
    }
  });
};

const renderPage = async (
  row: RowMap,
  page: PDFPage,
  pdfDoc: PDFDocument,
  cachedFonts: FontMap,
  canvasData?: CanvasObjects
) => {
  if (!canvasData) {
    return;
  }

  const { width, height } = page.getSize();
  const ratio = width / canvasData.clientWidth;

  for (let i = 0; i < canvasData.objects.length; i += 1) {
    const obj = canvasData.objects[i];
    if (obj.type === 'text') {
      const o = obj as Fieldbox;

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

      const owidth = (o.width || 100) * ratio;
      const oheight = (o.height || 100) * ratio;

      let alignment = TextAlignment.Left;
      if (o.textAlign === 'right') {
        alignment = TextAlignment.Right;
      } else if (o.textAlign === 'center') {
        alignment = TextAlignment.Center;
      }

      const text = String(row[o.index]);
      if (o.renderType === 'qrcode') {
        const qrSize = Math.max(owidth, oheight);
        const dataURL = await QRCode.toDataURL(text, {
          width: qrSize,
        });
        const pngImage = await pdfDoc.embedPng(dataURL);
        page.drawImage(pngImage, { x, y: y - qrSize });
      } else {
        const multiText = layoutMultilineText(text || '', {
          font,
          fontSize: size,
          bounds: {
            x,
            y,
            width: owidth,
            height: oheight,
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
            maxWidth: owidth,
            color,
          });
        });
      }
    }
  }
};

export const loadForm = async (filename: string) => {
  const pdfBuff = await readFile(filename);
  const pdfDoc = await PDFDocument.load(pdfBuff);
  const form = pdfDoc.getForm();
  return form
    .getFields()
    .map((fld) => ({
      name: fld.getName(),
      type: getFieldType(fld),
    }))
    .filter((v) => v.type);
};

const renderPdf = async (
  output: string,
  pdfFile: string,
  excelFile: string,
  rowsLimit: number,
  combinePdf: boolean,
  saveFile: (
    filename: string,
    content: Uint8Array,
    rowData?: RowMap
  ) => Promise<void>,
  updateProgress: (page: number, total: number, rowData?: RowMap) => void,
  canvasData?: CanvasMap,
  formData?: FormMap
) => {
  const pdfBuff = await readFile(pdfFile);
  let pdfDoc = await PDFDocument.load(pdfBuff);
  let newDoc = await PDFDocument.create();
  let cachedFonts: FontMap = {};

  const rows: RowMap[] = readFirstSheet(excelFile, rowsLimit);
  for (let i = 0; i < rows.length; i += 1) {
    // Step 1: Render pages with form
    renderForm(rows[i], formData, pdfDoc.getForm());

    // Step 2: Render pages with canvas for now
    if (canvasData) {
      await Promise.all(
        pdfDoc.getPageIndices().map(async (pageIndex) => {
          if (canvasData[pageIndex + 1]) {
            const page = pdfDoc.getPage(pageIndex);
            await renderPage(
              rows[i],
              page,
              pdfDoc,
              cachedFonts,
              canvasData[pageIndex + 1]
            );
          }
        })
      );
    }

    // Step 3: Copy to new pdf, load and save will remove fields, but retain value
    const newPages = await newDoc.copyPages(
      await PDFDocument.load(await pdfDoc.save()),
      pdfDoc.getPageIndices()
    );

    newPages.forEach((p) => newDoc.addPage(p));
    updateProgress(i + 1, rows.length, rows[i]);

    if (!combinePdf) {
      const pdfBytes = await newDoc.save();
      const outputs = output.split('.');

      const baseName = outputs.slice(0, outputs.length - 1).join('.');
      const fileEx = outputs[outputs.length - 1];
      const outputName = `${baseName}-${i + 1}.${fileEx}`;

      await saveFile(outputName, pdfBytes, rows[i]);

      // Reset
      newDoc = await PDFDocument.create();
      cachedFonts = {};
    }

    // Load old doc again
    pdfDoc = await PDFDocument.load(pdfBuff);
  }

  if (combinePdf) {
    const pdfBytes = await newDoc.save();
    await saveFile(output, pdfBytes);
    return 1;
  }

  return rows.length;
};

export default renderPdf;
