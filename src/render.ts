import { Rect, Textbox } from 'fabric/fabric-impl';
import {
  PDFDocument,
  StandardFonts,
  PDFFont,
  rgb,
  layoutMultilineText,
  TextAlignment,
} from 'pdf-lib';
import fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

export interface CanvasObjects {
  objects: [Textbox | Rect];
}

export interface RenderPdf {
  pdfFile: string;
  excelFile: string;
  combinePdf: boolean;
  pageNumber: number;
  canvasData: CanvasObjects;
  width: number;
}

type FontMap = Record<string, PDFFont>;
const cachedFonts: FontMap = {};

const getFont = async (font: string | undefined, pdfDoc: PDFDocument) => {
  const key = font || StandardFonts.Helvetica;
  if (!cachedFonts[key]) {
    cachedFonts[key] = await pdfDoc.embedFont(key);
  }
  return cachedFonts[key];
};

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

const renderPdf = async (
  pdfFile: string,
  pageIndex: number,
  canvasData: CanvasObjects,
  width: number
) => {
  const pdfBuff = await readFile(pdfFile);
  const pdfDoc = await PDFDocument.load(pdfBuff);

  const pages = pdfDoc.getPages();
  const page = pages[pageIndex];

  const { width: w, height } = page.getSize();

  const ratio = w / width;

  for (let i = 0; i < canvasData.objects.length; i += 1) {
    const obj = canvasData.objects[i];
    if (obj.type === 'text') {
      const o = obj as Textbox;

      const rgbCode = hexToRgb(o.fill as string);
      const color = rgb(rgbCode.r / 255, rgbCode.g / 255, rgbCode.b / 255);

      // eslint-disable-next-line no-await-in-loop
      const font = await getFont(o.fontFamily, pdfDoc);

      // FIXME: Font size is just an illusion...
      const size = (o.fontSize || 16) * ratio;

      // pdf-lib draw text at baseline, fabric use bounding box
      const offset =
        font.heightAtSize(size) - font.heightAtSize(size, { descender: false });

      const x = (o.left || 0) * ratio + 1;
      const y =
        height - (o.top || 0) * ratio - (o.height || 0) * ratio + offset;

      const multiText = layoutMultilineText(o.text || '', {
        alignment: TextAlignment.Left,
        font,
        fontSize: size,
        bounds: {
          x,
          y,
          width: (o.width || 100) * ratio,
          height: (o.height || 100) * ratio,
        },
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

  const newDoc = await PDFDocument.create();
  const [newPage] = await newDoc.copyPages(pdfDoc, [pageIndex]);
  newDoc.addPage(newPage);
  return newDoc;
};

export default renderPdf;
