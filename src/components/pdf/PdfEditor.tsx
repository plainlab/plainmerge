/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { DragEventHandler, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf/dist/esm/entry.webpack';
import { ipcRenderer } from 'electron';
// eslint-disable-next-line
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';
import { StandardFonts, StandardFontValues } from 'pdf-lib';
import { Textbox } from 'fabric/fabric-impl';
import { TwitterPicker } from 'react-color';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { SizeMe } from 'react-sizeme';

import { FabricJSCanvas, useFabricJSEditor } from '../fabric/Canvas';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const PdfEditor = () => {
  const { editor, onReady, selectedObject } = useFabricJSEditor();

  const [fontFamily, setFontFamily] = useState(
    StandardFonts.Helvetica as string
  );
  const [fontSize, setFontSize] = useState(16);
  const [fill, setFill] = useState('#000');
  const [showPicker, setShowPicker] = useState(false);

  const [pdfFile, setPdfFile] = useState('');
  const [numPages, setNumPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [opening, setOpening] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleOpen = async () => {
    setOpening(true);
    const filters = [{ name: 'PDF Files', extensions: ['pdf'] }];
    const path = await ipcRenderer.invoke('open-file', filters, 'path');
    setOpening(false);

    if (path) {
      setPdfFile(path);
      // Reset nav & canvas
      setLoaded(false);
      setShowCanvas(false);
    }
  };

  const handleSave = async () => {
    ipcRenderer.invoke('render-pdf', {
      pdfFile,
      pageNumber,
      canvasData: editor?.dump(),
    });
  };

  const handleDocumentLoadSuccess = (doc: { numPages: number }) => {
    setNumPages(doc.numPages);
    setPageNumber(1);
    setLoaded(true);
  };

  const handleDocumentError = (e: any) => {
    console.error(e);
  };

  const handleDrop: DragEventHandler = (e) => {
    const { top, left } = canvasRef.current?.getBoundingClientRect() || {
      top: 0,
      left: 0,
    };
    editor?.addText(e.dataTransfer.getData('Text'), {
      left: e.clientX - left,
      top: e.clientY - top,
    });
    e.stopPropagation();
  };

  const handleClickAddText = (text: string) => {
    editor?.addText(text, { top: 100, left: 100 });
  };

  const headings = [
    {
      index: 0,
      label:
        'Heading 1 with long Heading 1 with long Heading 1 with long Heading 1 with long Heading 1 with long Heading 1 with long Heading 1 with long ',
    },
    {
      index: 1,
      label:
        'Heading 2Heading 1 with long Heading 1 with long Heading 1 with long Heading 1 with long Heading 1 with long Heading 1 with long ',
    },
    {
      index: 2,
      label:
        'Heading 3Heading 1 with long Heading 1 with long Heading 1 with long Heading 1 with long Heading 1 with long Heading 1 with long Heading 1 with long ',
    },
  ];

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
    });
  }, [fontFamily, fontSize, fill]);

  useEffect(() => {
    const text = selectedObject as Textbox;
    setFontFamily(text?.fontFamily || 'Helvetica');
    setFontSize(text?.fontSize || 16);
    setFill((text?.fill as string) || '#000');
  }, [selectedObject]);

  return (
    <div className="flex space-x-4">
      <section className="space-y-4 w-60">
        <button
          type="button"
          className="btn"
          onClick={handleOpen}
          disabled={opening}
        >
          Choose Excel...
        </button>

        <ul className="flex flex-col items-center justify-start space-y-2">
          {headings.map(({ index, label }) => (
            <li
              key={index}
              className={`p-3 border flex items-center space-x-2 border-gray-500 rounded bg-gray-50 ${
                pdfFile ? 'cursor-pointer' : 'cursor-not-allowed'
              }`}
              onDragStart={(e) => {
                e.dataTransfer.setData('Text', label);
              }}
              onClick={() => handleClickAddText(label)}
              draggable
            >
              <FontAwesomeIcon icon="plus" className="text-gray-500" />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col flex-1 space-y-4">
        <span className="flex justify-between">
          <button
            type="button"
            className="btn"
            onClick={handleOpen}
            disabled={opening}
          >
            Choose PDF...
          </button>
          <button type="button" className="btn" onClick={handleSave}>
            Mail merge...
          </button>
        </span>

        <section className="flex items-center justify-between">
          {pdfFile ? (
            <section
              className={`relative flex space-x-4 ${
                selectedObject ? '' : 'opacity-30'
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
                className="rounded-sm outline-none active:outline-none focus:ring-2 focus:outline-none focus:ring-blue-500"
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
              >
                <FontAwesomeIcon
                  icon={['far', 'trash-alt']}
                  className="text-red-600"
                />
              </button>
            </section>
          ) : (
            <p />
          )}

          <p>3 pages</p>
        </section>

        <SizeMe>
          {({ size }) => (
            <Document
              file={pdfFile}
              onLoadSuccess={handleDocumentLoadSuccess}
              className="flex flex-1"
              options={{
                cMapUrl: 'cmaps/',
                cMapPacked: true,
              }}
              onLoadError={handleDocumentError}
              onSourceError={handleDocumentError}
            >
              <Page
                pageNumber={pageNumber}
                onLoadSuccess={() => setShowCanvas(true)}
                width={size.width || 500}
              />

              {showCanvas && (
                <FabricJSCanvas
                  className="absolute w-full border border-gray-300"
                  style={{
                    width: size.width || 500,
                    height: size.height || 500,
                  }}
                  onReady={onReady}
                  onDrop={handleDrop}
                  canvasRef={canvasRef}
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
