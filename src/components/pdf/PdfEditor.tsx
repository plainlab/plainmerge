/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
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
import { Rect, Textbox } from 'fabric/fabric-impl';
import { TwitterPicker } from 'react-color';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { SizeMe } from 'react-sizeme';
import { useLocation } from 'react-router-dom';

import { IconName } from '@fortawesome/fontawesome-svg-core';
import { FabricJSCanvas, useFabricJSEditor } from '../fabric/Canvas';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface Header {
  index: number;
  label: string;
}

type Align = 'left' | 'center' | 'right';

interface MyTextbox extends Textbox {
  index: number;
}
export interface CanvasObjects {
  objects: [MyTextbox | Rect];
}
export interface RenderPdfState {
  pdfFile: string;
  excelFile: string;
  combinePdf: boolean;
  pageNumber: number;
  canvasData?: CanvasObjects;
  canvasWidth?: number;
  formData?: Record<string, number>;
}

const getRowsLimit = () => {
  if (process.env.PAID) {
    return 100_000;
  }
  return 10;
};

interface FieldType {
  type: string;
  name: string;
  index: number;
  order: number;
  show: boolean;
}

const PdfEditor = () => {
  const { state } = useLocation<RenderPdfState>();
  const [currentState, setCurrentState] = useState<RenderPdfState>();

  const { editor, onReady, selectedObject } = useFabricJSEditor();

  const [formLayout, setFormLayout] = useState(false);
  const [formFields, setFormFields] = useState<FieldType[]>([]);

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

  const [pageLoaded, setPageLoaded] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [searchField, setSearchField] = useState('');

  const parentRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pages, setPages] = useState(1);
  const [headers, setHeaders] = useState<Header[]>([]);
  const [combinePdf, setCombinePdf] = useState(true);

  const loadExcelFile = async (fp: string) => {
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
    setHeaders(
      labels.map((label, index) => ({
        index,
        label: label as string,
      }))
    );

    if (firstSheet['!fullref']) {
      const range = XLSX.utils.decode_range(firstSheet['!fullref']);
      const rows = range.e.r - range.s.r;
      const rowLimit = getRowsLimit();
      setPages(Math.min(rows, rowLimit));
    }
  };

  const handleOpenPdf = async () => {
    setOpeningPdf(true);
    const filters = [{ name: 'PDF Files', extensions: ['pdf'] }];
    const path = await ipcRenderer.invoke('open-file', filters, 'path');
    setOpeningPdf(false);

    if (path) {
      setPdfFile(path);
      // Reset nav & canvas
      setPageLoaded(false);
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
    }
  };

  const getCurrentState = (): RenderPdfState => {
    return {
      pdfFile,
      pageNumber,
      excelFile,
      combinePdf,
      formData: formFields.reduce((p, c) => ({ ...p, [c.name]: c.index }), {}),

      // FIXME: Better way to keep canvas state?
      canvasData: parentRef.current ? editor?.dump() : currentState?.canvasData,
      canvasWidth: parentRef.current
        ? parentRef.current?.clientWidth
        : currentState?.canvasWidth,
    };
  };

  const handleRender = async (action: string) => {
    await ipcRenderer.invoke(action, getCurrentState());
  };

  const handleSave = async () => {
    await handleRender('save-pdf');
  };

  const handlePreview = async () => {
    await handleRender('preview-pdf');
  };

  const handleDocumentLoadSuccess = (doc: { numPages: number }) => {
    setNumPages(doc.numPages);
    setPageNumber((currentState && currentState.pageNumber) || 1);
    setPageLoaded(true);
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
    setCurrentState(getCurrentState());
  };

  const handleClickAddText = (text: string, index: number) => {
    editor?.addText(text, { top: 100, left: 100, data: { index } });
    setCurrentState(getCurrentState());
  };

  const handleDeleteObject = () => {
    editor?.deleteSelected();
    setCurrentState(getCurrentState());
  };

  const handleSearch = (e: { target: { value: string } }) => {
    setSearchField(e.target.value);
  };

  const fonts = StandardFontValues.map((value) => ({
    label: value.replace('-', ' '),
    value,
  }));

  const fontSizes = [8, 10, 12, 14, 16, 18, 24, 30, 36, 48, 60];

  const handleKeyDown = (key: string) => {
    if (selectedObject) {
      switch (key) {
        case 'ArrowDown':
          editor?.updateText({
            top: (selectedObject.top || 1) + 1,
          });
          break;
        case 'ArrowUp':
          editor?.updateText({
            top: (selectedObject.top || 1) - 1,
          });
          break;
        case 'ArrowLeft':
          editor?.updateText({
            left: (selectedObject.left || 1) - 1,
          });
          break;
        case 'ArrowRight':
          editor?.updateText({
            left: (selectedObject.left || 1) + 1,
          });
          break;
        default:
          break;
      }
      setCurrentState(getCurrentState());
    }
  };

  ipcRenderer.on('keydown', (_event, key) => {
    handleKeyDown(key);
  });

  const handleChangeFormField = (e: any, fld: FieldType) => {
    setFormFields(
      formFields.map((f) =>
        f.name === fld.name ? { ...f, index: parseInt(e.target.value, 10) } : f
      )
    );
  };

  useEffect(() => {
    editor?.updateText({
      fontFamily,
      fontSize,
      fill,
      textAlign: align as string,
    });

    setCurrentState(getCurrentState());
  }, [fontFamily, fontSize, fill, align]);

  useEffect(() => {
    const text = selectedObject as Textbox;
    setFontFamily(text?.fontFamily || 'Helvetica');
    setFontSize(text?.fontSize || 16);
    setFill((text?.fill as string) || '#000');
    setAlign((text?.textAlign as Align) || 'left');
  }, [selectedObject]);

  useEffect(() => {
    if (excelFile) {
      loadExcelFile(excelFile).catch(console.error);
    }
  }, [excelFile]);

  useEffect(() => {
    if (currentState) {
      if (!pdfFile) {
        setPdfFile(currentState.pdfFile);

        // Reset nav & canvas
        setPageLoaded(false);
        setShowCanvas(false);
      }

      if (!excelFile) {
        setExcelFile(currentState.excelFile);
      }

      setCombinePdf(currentState.combinePdf);
      ipcRenderer.invoke('save-config', currentState);
    }
  }, [currentState]);

  useEffect(() => {
    if (editor && currentState && currentState.canvasData) {
      editor.load(currentState.canvasData);
    }
  }, [editor]);

  useEffect(() => {
    if (pdfFile) {
      ipcRenderer
        .invoke('load-form', { filename: pdfFile })
        .then((fields: FieldType[]) =>
          setFormFields(
            fields.map((f, idx) => {
              let index = -1;
              if (currentState && currentState.formData) {
                index = currentState.formData[f.name];
              }
              return {
                ...f,
                index,
                order: idx + 1,
                show: true,
              };
            })
          )
        )
        .catch(console.error);
    }
  }, [pdfFile]);

  useEffect(() => {
    if (state) {
      setCurrentState(state);
    }
  }, [state]);

  useEffect(() => {
    if (searchField.trim()) {
      setFormFields(
        formFields.map((f) => ({
          ...f,
          show: !!f.name.match(new RegExp(searchField, 'gi')),
        }))
      );
    } else {
      setFormFields(formFields.map((f) => ({ ...f, show: true })));
    }
  }, [searchField]);

  return (
    <div className="flex flex-1">
      <section className="flex flex-col flex-shrink-0 p-4 space-y-4 bg-gray-200 w-60">
        <span className="flex items-center justify-between">
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
          <p className="flex-1 text-center">No Excel file specified.</p>
        )}
      </section>

      <section className="flex flex-col justify-start flex-1 p-4 space-y-4 bg-gray-100">
        <span className="flex justify-between">
          <section className="flex items-center justify-center space-x-4">
            <button
              type="button"
              className="btn"
              onClick={handleOpenPdf}
              disabled={openingPdf}
            >
              Choose PDF...
            </button>

            {formFields.length ? (
              <section className="flex items-center justify-center space-x-2 text-xs">
                <div className="relative inline-block w-8 align-middle transition duration-200 ease-in select-none">
                  <label
                    htmlFor="toggle"
                    className="block h-5 overflow-hidden bg-gray-300 rounded-full cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      name="toggle"
                      id="toggle"
                      checked={formLayout}
                      onChange={() => setFormLayout(!formLayout)}
                      className="absolute block w-5 h-5 bg-white border-2 rounded-full appearance-none cursor-pointer checked:right-0"
                    />
                  </label>
                </div>
                <p>{formLayout ? 'Form' : 'Canvas'}</p>
              </section>
            ) : null}
          </section>

          <section className="flex items-center justify-between space-x-2">
            {process.env.PAID ? null : (
              <p className="text-red-500">Trial limit: 10 PDFs</p>
            )}
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
                selectedObject && !formLayout ? '' : 'opacity-50 cursor-default'
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
                onClick={() => handleDeleteObject()}
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

        {formLayout ? (
          <section className="flex flex-col items-stretch justify-start flex-1 space-y-4">
            <div className="flex items-center px-2 space-x-1 text-gray-400 bg-gray-200 rounded-md focus-within:text-gray-600 focus-within:ring-1 focus-within:ring-blue-500">
              <FontAwesomeIcon icon="search" />
              <input
                type="text"
                className="w-full p-1 bg-gray-200 border-none rounded-r-md focus:ring-0"
                value={searchField}
                onChange={handleSearch}
                placeholder="Search..."
              />
              {searchField && (
                <FontAwesomeIcon
                  icon="times-circle"
                  onClick={() => setSearchField('')}
                />
              )}
            </div>

            <ol className="flex flex-col items-start justify-center space-y-4">
              {formFields
                .filter((f) => f.show)
                .map((fld) => (
                  <li
                    key={fld.name}
                    className="flex items-center justify-between w-full py-1 space-x-2 border-b border-gray-200 border-dashed"
                  >
                    <p className="flex items-center justify-start flex-1 space-x-2 truncate">
                      <span className="opacity-70">{fld.order}.</span>
                      <span className="font-medium">{fld.name}</span>
                      <span className="text-xs opacity-70">({fld.type})</span>:
                    </p>
                    <select
                      className="flex-shrink-0 rounded-sm outline-none bg-gray-50 active:outline-none focus:ring-2 focus:outline-none focus:ring-blue-500 h-7"
                      onChange={(e) => handleChangeFormField(e, fld)}
                      value={fld.index}
                    >
                      {[{ index: -1, label: '---' }, ...headers].map((h) => (
                        <option value={h.index} key={h.index}>
                          {h.label}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
            </ol>
          </section>
        ) : (
          <Document
            file={pdfFile}
            onLoadSuccess={handleDocumentLoadSuccess}
            className="relative flex items-start justify-center flex-1"
            options={{
              cMapUrl: 'cmaps/',
              cMapPacked: true,
            }}
            onLoadError={handleDocumentError}
            onSourceError={handleDocumentError}
          >
            <SizeMe monitorHeight>
              {({ size }) => (
                <>
                  <Page
                    pageNumber={pageNumber}
                    onLoadSuccess={handlePageLoadSuccess}
                    width={size.width || 500}
                    className="flex-1"
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
                </>
              )}
            </SizeMe>
          </Document>
        )}

        {pageLoaded && !formLayout && (
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
