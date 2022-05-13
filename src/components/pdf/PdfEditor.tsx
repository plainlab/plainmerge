/* eslint-disable no-alert */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { DragEventHandler, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf/dist/esm/entry.webpack';
import { ipcRenderer } from 'electron';
// eslint-disable-next-line
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';
import { StandardFonts, StandardFontValues } from 'pdf-lib';
import { Rect } from 'fabric/fabric-impl';
import { TwitterPicker } from 'react-color';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { SizeMe } from 'react-sizeme';
import { useLocation } from 'react-router-dom';

import { IconName } from '@fortawesome/fontawesome-svg-core';
import { FabricJSCanvas, useFabricJSEditor } from '../fabric/Canvas';
import { readExcelMeta } from '../utils/excel';
import { Fieldbox } from '../fabric/editor';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
export interface DataHeader {
  index: number;
  label: string;
}

type Align = 'left' | 'center' | 'right';

export interface CanvasObjects {
  objects: [Fieldbox | Rect];
  clientWidth: number;
}
export interface RenderPdfState {
  pdfFile: string;
  excelFile: string;
  combinePdf: boolean;
  pageNumber: number;
  canvasData?: Record<number, CanvasObjects>;
  formData?: Record<string, number>;
  configPath?: string;
  filename?: string;
}
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
  const [renderType, setRenderType] = useState('text');

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

  const [headers, setHeaders] = useState<DataHeader[]>([]);
  const [combinePdf, setCombinePdf] = useState(true);
  const [paid, setPaid] = useState(true);

  const loadExcelFile = async (fp: string) => {
    const { firstRow } = await readExcelMeta(fp);
    setHeaders(firstRow);
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
    let canvasData = currentState?.canvasData;
    if (parentRef.current) {
      canvasData = {
        ...canvasData,
        [pageNumber]: {
          ...editor?.dump(),
          clientWidth: parentRef.current.clientWidth,
        },
      };
    }

    const formData = formFields.reduce(
      (p, c) => ({ ...p, [c.name]: c.index }),
      {}
    );

    return {
      pdfFile,
      pageNumber,
      excelFile,
      combinePdf,
      formData,
      canvasData,
    };
  };

  const handleMailMerge = async () => {
    await ipcRenderer.invoke('mail-merge', getCurrentState());
  };

  const handleBuy = async () => {
    await ipcRenderer.invoke('buy-now');
  };

  const handlePreview = async () => {
    await ipcRenderer.invoke('preview-pdf', getCurrentState());
  };

  const handleDocumentLoadSuccess = (doc: { numPages: number }) => {
    setNumPages(doc.numPages);
    setPageNumber((currentState && currentState.pageNumber) || 1);
    setPageLoaded(true);
  };

  const handleClickNext = () => {
    setCurrentState(getCurrentState());
    setShowCanvas(false);
    setPageNumber(pageNumber + 1);
  };

  const handleClickBack = () => {
    setCurrentState(getCurrentState());
    setShowCanvas(false);
    setPageNumber(pageNumber - 1);
  };

  const handlePageLoadSuccess = () => {
    setShowCanvas(true);
  };

  const handleDocumentError = (e: any) => {
    alert(e.message);
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
  const renderTypes = [
    { value: 'text', label: 'Text' },
    { value: 'qrcode', label: 'QR code' },
  ];

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
      renderType,
    });

    setCurrentState(getCurrentState());
  }, [fontFamily, fontSize, fill, align, renderType]);

  useEffect(() => {
    const text = selectedObject as Fieldbox;
    setFontFamily(text?.fontFamily || 'Helvetica');
    setFontSize(text?.fontSize || 16);
    setFill((text?.fill as string) || '#000');
    setAlign((text?.textAlign as Align) || 'left');
    setRenderType(text?.renderType || 'text');
  }, [selectedObject]);

  useEffect(() => {
    if (excelFile) {
      loadExcelFile(excelFile).catch((e) => alert(e.message));
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
      ipcRenderer.invoke('save-config', getCurrentState());
    }
  }, [currentState]);

  useEffect(() => {
    if (
      editor &&
      currentState &&
      currentState.canvasData &&
      currentState.canvasData[pageNumber]
    ) {
      editor.load(currentState.canvasData[pageNumber]);
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
        .catch((e) => alert(e.message));
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

  useEffect(() => {
    ipcRenderer.on('keydown', (_event, key) => {
      handleKeyDown(key);
    });

    ipcRenderer
      .invoke('check-license')
      .then((p) => setPaid(p))
      .catch(() =>
        alert('Can not validate your license. Please try again later.')
      );
  }, []);

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
                      className="absolute block w-5 h-5 bg-white border-2 rounded-full outline-none appearance-none cursor-pointer checked:right-0"
                    />
                  </label>
                </div>
                <p>{formLayout ? 'Form' : 'Canvas'}</p>
              </section>
            ) : null}
          </section>

          <section className="flex items-center justify-between space-x-2">
            {!paid && <p className="text-red-500">Trial limit: 10 records</p>}

            {!paid && (
              <button
                type="button"
                className="text-red-500 btn"
                onClick={handleBuy}
              >
                Register
              </button>
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
              onClick={handleMailMerge}
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
                className="w-24"
                onChange={(e) => setRenderType(e.target.value)}
                value={renderType}
                disabled={!selectedObject}
              >
                {renderTypes.map((r) => (
                  <option value={r.value} key={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>

              <select
                onChange={(e) => setFontFamily(e.target.value)}
                value={fontFamily}
                disabled={!selectedObject || renderType !== 'text'}
              >
                {fonts.map(({ label, value }) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                className="w-14"
                onChange={(e) =>
                  setFontSize(parseInt(e.target.value, 10) || 16)
                }
                value={fontSize}
                disabled={!selectedObject || renderType !== 'text'}
              >
                {fontSizes.map((v) => (
                  <option value={v} key={v}>
                    {v}
                  </option>
                ))}
              </select>

              <section
                className={`flex items-center justify-center border-t border-b rounded-sm ${
                  renderType !== 'text' ? 'opacity-50' : ''
                }`}
              >
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
                className={`p-2 border-2 border-white rounded shadow outline-none w-7 h-7 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  renderType !== 'text' ? 'opacity-50 cursor-default' : ''
                }`}
                style={{ backgroundColor: fill }}
                onClick={() =>
                  selectedObject && renderType === 'text' && setShowPicker(true)
                }
                role="button"
                aria-labelledby="pick"
                onKeyPress={() =>
                  selectedObject && renderType === 'text' && setShowPicker(true)
                }
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
                onClick={handleClickBack}
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
                onClick={handleClickNext}
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
