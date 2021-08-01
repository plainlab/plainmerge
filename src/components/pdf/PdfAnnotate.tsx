import React, { useState } from 'react';
import { Document, Page } from 'react-pdf/dist/esm/entry.webpack';
import { ipcRenderer } from 'electron';
import { FabricJSCanvas, useFabricJSEditor } from '../fabric/Fabric';

const PdfAnnotate = () => {
  const [pdfFile, setPdfFile] = useState('');
  const { editor, onReady } = useFabricJSEditor();
  const [numPages, setNumPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [opening, setOpening] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pdfWidth, setPdfWidth] = useState(0);
  const [pdfHeight, setPdfHeight] = useState(0);

  const handleOpen = async () => {
    setOpening(true);
    const filters = [{ name: 'PDF Files', extensions: ['pdf'] }];
    const path = await ipcRenderer.invoke('open-file', filters, 'path');
    setPdfFile(path);
    setOpening(false);
  };

  const handleSave = async () => {
    ipcRenderer.invoke('render-pdf', pdfFile, editor?.canvas.toJSON());
  };

  const handleAddText = () => {
    editor?.addText('Hi', { top: 200, left: 200 });
  };

  const onDocumentLoadSuccess = (doc: { numPages: number }) => {
    setNumPages(doc.numPages);
    setLoaded(true);
  };

  const onPageLoadSucccess = (doc: { width: number; height: number }) => {
    setPdfWidth(doc.width);
    setPdfHeight(doc.height);
  };

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
        <button type="button" className="btn" onClick={handleAddText}>
          Add text
        </button>
        <button type="button" className="btn" onClick={handleSave}>
          Save...
        </button>
      </span>

      <Document
        file={pdfFile}
        onLoadSuccess={onDocumentLoadSuccess}
        className="relative flex items-center justify-center p-4"
      >
        <Page pageNumber={pageNumber} onLoadSuccess={onPageLoadSucccess} />
        <FabricJSCanvas
          className="absolute w-full h-full border border-blue-500"
          style={{ width: pdfWidth, height: pdfHeight }}
          onReady={onReady}
        />
      </Document>

      {loaded && (
        <div className="flex items-center justify-between">
          {pageNumber > 1 ? (
            <button type="button" onClick={() => setPageNumber(pageNumber - 1)}>
              &lt; Back
            </button>
          ) : (
            <p />
          )}
          <p>
            Page {pageNumber} of {numPages}
          </p>
          {pageNumber < numPages ? (
            <button type="button" onClick={() => setPageNumber(pageNumber + 1)}>
              Next &gt;
            </button>
          ) : (
            <p />
          )}
        </div>
      )}
    </div>
  );
};

export default PdfAnnotate;
