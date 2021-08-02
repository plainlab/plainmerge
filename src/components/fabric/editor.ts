import { useEffect, useState } from 'react';
import { fabric } from 'fabric';

const STROKE = '#000000';

const TEXT = {
  type: 'text',
  left: 100,
  top: 100,
  fontSize: 16,
  fontFamily: 'Arial',
  fill: STROKE,
};

export interface FabricJSEditor {
  canvas: fabric.Canvas;
  addText: (text: string, options: any) => void;
  deleteAll: () => void;
  deleteSelected: () => void;
}

const buildEditor = (canvas: fabric.Canvas): FabricJSEditor => {
  return {
    canvas,
    addText: (text: string, options: any = {}) => {
      const object = new fabric.Textbox(text, {
        ...options,
        ...TEXT,
      });
      object.set({ text });
      canvas.add(object);
    },
    deleteAll: () => {
      canvas.getObjects().forEach((object) => canvas.remove(object));
      canvas.discardActiveObject();
      canvas.renderAll();
    },
    deleteSelected: () => {
      canvas.getActiveObjects().forEach((object) => canvas.remove(object));
      canvas.discardActiveObject();
      canvas.renderAll();
    },
  };
};

const useFabricJSEditor = () => {
  const [canvas, setCanvas] = useState<null | fabric.Canvas>(null);
  const [selectedObjects, setSelectedObject] = useState<fabric.Object[]>([]);
  const [editor, setEditor] = useState<FabricJSEditor>();

  useEffect(() => {
    const bindEvents = (canva: fabric.Canvas) => {
      canva.on('selection:cleared', () => {
        setSelectedObject([]);
      });
      canva.on('selection:created', (e: any) => {
        setSelectedObject(e.selected);
      });
      canva.on('selection:updated', (e: any) => {
        setSelectedObject(e.selected);
      });
      canva.on('selection:updated', (e: any) => {
        setSelectedObject(e.selected);
      });
    };

    if (canvas) {
      bindEvents(canvas);
      setEditor(buildEditor(canvas));
    }
  }, [canvas]);

  return {
    selectedObjects,
    onReady: (canvasReady: fabric.Canvas): void => {
      setCanvas(canvasReady);
      console.log('Fabric canvas ready');
    },
    editor,
  };
};

export { buildEditor, useFabricJSEditor };
