import React, { DragEventHandler, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf/dist/esm/entry.webpack';
import { ipcRenderer } from 'electron';
// eslint-disable-next-line
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';
import { StandardFonts, StandardFontValues } from 'pdf-lib';
import { Textbox } from 'fabric/fabric-impl';
import { FabricJSCanvas, useFabricJSEditor } from '../fabric/Canvas';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const PdfEditor = () => {
  const { editor, onReady, selectedObject } = useFabricJSEditor();

  const [fontFamily, setFontFamily] = useState(
    StandardFonts.Helvetica as string
  );
  const [fontSize, setFontSize] = useState(16);

  const [pdfFile, setPdfFile] = useState('');
  const [numPages, setNumPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [opening, setOpening] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [pdfWidth, setPdfWidth] = useState(0);
  const [pdfHeight, setPdfHeight] = useState(0);
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

  const handlePageLoadSucccess = (doc: { width: number; height: number }) => {
    setPdfWidth(doc.width);
    setPdfHeight(doc.height);
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
    editor?.addText(e.dataTransfer.getData('Text'), {
      left: e.clientX - left,
      top: e.clientY - top,
    });
    e.stopPropagation();
  };

  const headings = [
    {
      index: 0,
      label: 'Heading 1',
    },
    {
      index: 1,
      label: 'Heading 2',
    },
    {
      index: 2,
      label: 'Heading 3',
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
    });
  }, [fontFamily, fontSize]);

  useEffect(() => {
    const text = selectedObject as Textbox;
    setFontFamily(text?.fontFamily || 'Helvetica');
    setFontSize(text?.fontSize || 16);
  }, [selectedObject]);

  return (
    <div>
      <span className="flex space-x-2">
        <button
          type="button"
          className="btn"
          onClick={handleOpen}
          disabled={opening}
        >
          Open...
        </button>
        <button type="button" className="btn" onClick={handleSave}>
          Save...
        </button>
      </span>

      <section className="flex">
        <section>
          <section className="flex-shrink-0 w-50">
            <p>Field list</p>
            <ul className="flex flex-col items-center justify-start space-y-2">
              {headings.map(({ index, label }) => (
                <li
                  key={index}
                  className="p-3 border border-gray-500 rounded"
                  onDragStart={(e) => {
                    e.dataTransfer.setData('Text', label);
                  }}
                  draggable
                >
                  {label}
                </li>
              ))}
            </ul>
          </section>
        </section>

        <section className="flex flex-col flex-1">
          <section className="flex">
            <select
              onChange={(e) => setFontFamily(e.target.value)}
              value={fontFamily}
            >
              {fonts.map(({ label, value }) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              onChange={(e) => setFontSize(parseInt(e.target.value, 10) || 16)}
              value={fontSize}
            >
              {fontSizes.map((v) => (
                <option value={v} key={v}>
                  {v}
                </option>
              ))}
            </select>
          </section>

          <Document
            file={pdfFile}
            onLoadSuccess={handleDocumentLoadSuccess}
            className="relative flex items-center justify-center p-4"
            options={{
              cMapUrl: 'cmaps/',
              cMapPacked: true,
            }}
            onLoadError={handleDocumentError}
            onSourceError={handleDocumentError}
          >
            <Page
              pageNumber={pageNumber}
              onLoadSuccess={handlePageLoadSucccess}
            />

            {showCanvas && (
              <FabricJSCanvas
                className="absolute w-full h-full border border-gray-300"
                style={{ width: pdfWidth, height: pdfHeight }}
                onReady={onReady}
                onDrop={handleDrop}
                canvasRef={canvasRef}
              />
            )}
          </Document>

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
      </section>
    </div>
  );
};

export default PdfEditor;
