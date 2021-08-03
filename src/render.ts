import { Rect, Textbox } from 'fabric/fabric-impl';
import { PDFDocument, degrees, StandardFonts, PDFFont } from 'pdf-lib';
import fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

export interface CanvasObjects {
  objects: [Textbox | Rect];
}

export interface RenderPdf {
  pdfFile: string;
  pageNumber: number;
  canvasData: CanvasObjects;
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

const renderPdf = async (
  pdfFile: string,
  pageIndex: number,
  canvasData: CanvasObjects
) => {
  console.log('Render pdf with params', pdfFile, pageIndex, canvasData);
  const pdfBuff = await readFile(pdfFile);
  const pdfDoc = await PDFDocument.load(pdfBuff);

  const pages = pdfDoc.getPages();
  const page = pages[pageIndex];

  const { height } = page.getSize();

  for (let i = 0; i < canvasData.objects.length; i += 1) {
    const obj = canvasData.objects[i];
    if (obj.type === 'text') {
      const o = obj as Textbox;
      // eslint-disable-next-line no-await-in-loop
      const font = await getFont(o.fontFamily, pdfDoc);
      const size = o.fontSize || 16;
      // pdf-lib draw text at baseline, fabric use bounding box
      // this should be descender, not heightAtSize, but whatever...
      const offset = font.heightAtSize(size) / 3;

      page.drawText(o.text || '', {
        x: (o.left || 0) + 1,
        y: height - (o.top || 0) - (o.height || 0) + offset,
        lineHeight: o.lineHeight,
        rotate: degrees(o.angle || 0),
        size,
        font,
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
