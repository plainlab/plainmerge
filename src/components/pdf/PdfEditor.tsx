/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { DragEventHandler, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf/dist/esm/entry.webpack';
import { ipcRenderer } from 'electron';
// eslint-disable-next-line
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';
import { StandardFonts, StandardFontValues } from 'pdf-lib';
import XLSX from 'xlsx';
import { Textbox } from 'fabric/fabric-impl';
import { TwitterPicker } from 'react-color';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { SizeMe } from 'react-sizeme';

import { IconName } from '@fortawesome/fontawesome-svg-core';
import { FabricJSCanvas, useFabricJSEditor } from '../fabric/Canvas';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface Header {
  index: number;
  label: string;
}

type Align = 'left' | 'center' | 'right';

const PdfEditor = () => {
  const { editor, onReady, selectedObject } = useFabricJSEditor();

  const [fontFamily, setFontFamily] = useState(
    StandardFonts.Helvetica as string
  );
  const [fontSize, setFontSize] = useState(16);
  const [fill, setFill] = useState('#000');
  const [showPicker, setShowPicker] = useState(false);
  const [align, setAlign] = useState<Align>('left');

  const [pdfFile, setPdfFile] = useState('');
  const [excelFile, setExcelFile] = useState('');
  const [numPages, setNumPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [openingPdf, setOpeningPdf] = useState(false);
  const [openingExcel, setOpeningExcel] = useState(false);

  const [loaded, setLoaded] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);

  const parentRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pages, setPages] = useState(1);
  const [headers, setHeaders] = useState<Header[]>([]);
  const [combinePdf, setCombinePdf] = useState(true);

  const handleOpenPdf = async () => {
    setOpeningPdf(true);
    const filters = [{ name: 'PDF Files', extensions: ['pdf'] }];
    const path = await ipcRenderer.invoke('open-file', filters, 'path');
    setOpeningPdf(false);

    if (path) {
      setPdfFile(path);
      // Reset nav & canvas
      setLoaded(false);
      setShowCanvas(false);
    }
  };

  const handleOpenExcel = async () => {
    setOpeningExcel(true);
    const filters = [
      { name: 'Excel Files', extensions: ['xlsx', 'xls', 'ods'] },
    ];
    const path = await ipcRenderer.invoke('open-file', filters, 'path');
    setOpeningExcel(false);

    if (path) {
      setExcelFile(path);
      // Read headers
      const workbook = XLSX.readFile(path, { sheetRows: 1 });
      const sheetsList = workbook.SheetNames;
      const firstSheet = workbook.Sheets[sheetsList[0]];
      const sheetData = XLSX.utils.sheet_to_json(firstSheet, {
        header: 1,
        defval: '',
        blankrows: true,
      });
      const labels = sheetData.map((_v, _i, array) => array).flat(2);
      setHeaders(
        labels.map((label, index) => ({
          index,
          label: label as string,
        }))
      );

      if (firstSheet['!fullref']) {
        const range = XLSX.utils.decode_range(firstSheet['!fullref']);
        const rows = range.e.r - range.s.r;
        setPages(rows);
      }
    }
  };

  const handleRender = async (action: string) => {
    await ipcRenderer.invoke(action, {
      pdfFile,
      pageNumber,
      excelFile,
      combinePdf,
      canvasData: editor?.dump(),
      canvasWidth: parentRef.current?.clientWidth,
    });
  };

  const handleSave = async () => {
    await handleRender('save-pdf');
  };

  const handlePreview = async () => {
    await handleRender('preview-pdf');
  };

  const handleDocumentLoadSuccess = (doc: { numPages: number }) => {
    setNumPages(doc.numPages);
    setPageNumber(1);
    setLoaded(true);
  };

  const handlePageLoadSuccess = () => {
    setShowCanvas(true);
  };

  const handleDocumentError = (e: any) => {
    console.error(e);
  };

  const handleDrop: DragEventHandler = (e) => {
    const { top, left } = canvasRef.current?.getBoundingClientRect() || {
      top: 0,
      left: 0,
    };
    const text = e.dataTransfer.getData('Text');
    const index = e.dataTransfer.getData('Index');
    editor?.addText(text, {
      left: e.clientX - left,
      top: e.clientY - top,
      data: { index },
    });
    e.stopPropagation();
  };

  const handleClickAddText = (text: string, index: number) => {
    editor?.addText(text, { top: 100, left: 100, data: { index } });
  };

  const fonts = StandardFontValues.map((value) => ({
    label: value.replace('-', ' '),
    value,
  }));

  const fontSizes = [8, 10, 12, 14, 16, 18, 24, 30, 36, 48, 60];

  useEffect(() => {
    editor?.updateText({
      fontFamily,
      fontSize,
      fill,
      textAlign: align as string,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontFamily, fontSize, fill, align]);

  useEffect(() => {
    const text = selectedObject as Textbox;
    setFontFamily(text?.fontFamily || 'Helvetica');
    setFontSize(text?.fontSize || 16);
    setFill((text?.fill as string) || '#000');
    setAlign((text?.textAlign as Align) || 'left');
  }, [selectedObject]);

  return (
    <div className="flex flex-1">
      <section className="flex flex-col flex-shrink-0 p-4 space-y-4 bg-gray-200 w-60">
        <span>
          <button
            type="button"
            className="btn"
            onClick={handleOpenExcel}
            disabled={openingExcel}
          >
            Choose Excel...
          </button>
        </span>

        {excelFile ? (
          <ul className="flex flex-col items-center justify-start space-y-2">
            {headers.map(({ index, label }) => (
              <li
                key={index}
                className={`p-2 border items-center w-full flex space-x-2 border-gray-300 rounded bg-gray-50 ${
                  pdfFile ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
                onDragStart={(e) => {
                  e.dataTransfer.setData('Text', label);
                  e.dataTransfer.setData('Index', String(index));
                }}
                onClick={() => handleClickAddText(label, index)}
                draggable
              >
                <FontAwesomeIcon icon="plus" className="text-gray-400" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center justify-between flex-1">
            <p className="flex-1 text-center">No Excel file specified.</p>
          </div>
        )}
      </section>

      <section className="flex flex-col flex-1 p-4 space-y-4 bg-gray-100">
        <span className="flex justify-between">
          <button
            type="button"
            className="btn"
            onClick={handleOpenPdf}
            disabled={openingPdf}
          >
            Choose PDF...
          </button>
          <section className="flex items-center justify-between space-x-2">
            <button
              type="button"
              className="btn"
              onClick={handlePreview}
              disabled={!pdfFile || !excelFile}
            >
              Preview
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleSave}
              disabled={!pdfFile || !excelFile}
            >
              Mail merge...
            </button>
          </section>
        </span>

        {pdfFile ? (
          <section className="flex items-center justify-between">
            <section
              className={`relative flex space-x-4 ${
                selectedObject ? '' : 'opacity-50 cursor-default'
              }`}
            >
              <select
                className="rounded-sm outline-none active:outline-none focus:ring-2 focus:outline-none focus:ring-blue-500"
                onChange={(e) => setFontFamily(e.target.value)}
                value={fontFamily}
                disabled={!selectedObject}
              >
                {fonts.map(({ label, value }) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                className="w-10 rounded-sm outline-none active:outline-none focus:ring-2 focus:outline-none focus:ring-blue-500"
                onChange={(e) =>
                  setFontSize(parseInt(e.target.value, 10) || 16)
                }
                value={fontSize}
                disabled={!selectedObject}
              >
                {fontSizes.map((v) => (
                  <option value={v} key={v}>
                    {v}
                  </option>
                ))}
              </select>

              <section className="flex items-center justify-center border-t border-b rounded-sm">
                {['left', 'center', 'right'].map((al) => (
                  <button
                    type="button"
                    key={al}
                    className={`outline-none focus:outline-none w-10 h-7 ${
                      align === (al as Align) ? 'bg-gray-300' : ''
                    }`}
                    onClick={() => setAlign(al as Align)}
                  >
                    <FontAwesomeIcon
                      icon={['fas', `align-${al}` as IconName]}
                    />
                  </button>
                ))}
              </section>

              <div
                className="p-2 border-2 border-white rounded shadow outline-none w-7 h-7 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: fill }}
                onClick={() => selectedObject && setShowPicker(true)}
                role="button"
                aria-labelledby="pick"
                onKeyPress={() => selectedObject && setShowPicker(true)}
                tabIndex={0}
              />
              {showPicker ? (
                <div className="relative">
                  <div className="absolute z-10">
                    <div
                      role="button"
                      aria-labelledby="cover"
                      className="fixed inset-0"
                      onClick={() => setShowPicker(false)}
                      onKeyPress={() => setShowPicker(false)}
                      tabIndex={0}
                    />
                    <TwitterPicker
                      color={fill}
                      triangle="hide"
                      onChangeComplete={(c) => setFill(c.hex)}
                    />
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                className="btn-link"
                onClick={() => editor?.deleteSelected()}
                disabled={!selectedObject}
              >
                <FontAwesomeIcon
                  icon={['far', 'trash-alt']}
                  className="text-red-600"
                />
              </button>
            </section>

            <section className="flex items-center space-x-2">
              <p>Merge into:</p>
              <label htmlFor="combined" className="flex items-center space-x-1">
                <input
                  type="radio"
                  className="rounded"
                  name="seperator"
                  id="combined"
                  checked={combinePdf}
                  onChange={() => setCombinePdf(true)}
                />
                <p>1 PDF</p>
              </label>
              {pages > 1 ? (
                <label
                  htmlFor="separated"
                  className="flex items-center space-x-1"
                >
                  <input
                    type="radio"
                    name="seperator"
                    id="separated"
                    checked={!combinePdf}
                    onChange={() => setCombinePdf(false)}
                  />
                  <p>{pages} PDFs</p>
                </label>
              ) : null}
            </section>
          </section>
        ) : null}

        <SizeMe monitorHeight>
          {({ size }) => (
            <Document
              file={pdfFile}
              onLoadSuccess={handleDocumentLoadSuccess}
              className="flex items-center justify-center flex-1"
              options={{
                cMapUrl: 'cmaps/',
                cMapPacked: true,
              }}
              onLoadError={handleDocumentError}
              onSourceError={handleDocumentError}
            >
              <Page
                pageNumber={pageNumber}
                onLoadSuccess={handlePageLoadSuccess}
                width={size.width || 500}
              />

              {showCanvas && (
                <FabricJSCanvas
                  className="absolute"
                  onReady={onReady}
                  onDrop={handleDrop}
                  canvasRef={canvasRef}
                  parentRef={parentRef}
                  style={{
                    width: size.width || 500,
                    height: size.height || 500,
                  }}
                  onSize={() => window.dispatchEvent(new Event('resize'))}
                />
              )}
            </Document>
          )}
        </SizeMe>

        {loaded && (
          <div className="flex items-center justify-between">
            {pageNumber > 1 ? (
              <button
                type="button"
                onClick={() => setPageNumber(pageNumber - 1)}
                className="btn-link"
              >
                &lt; Back
              </button>
            ) : (
              <p />
            )}
            <p>
              Page {pageNumber} of {numPages}
            </p>
            {pageNumber < numPages ? (
              <button
                type="button"
                onClick={() => setPageNumber(pageNumber + 1)}
                className="btn-link"
              >
                Next &gt;
              </button>
            ) : (
              <p />
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default PdfEditor;
