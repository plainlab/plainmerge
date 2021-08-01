import { useEffect, useState } from 'react';
import { fabric } from 'fabric';
import { CIRCLE, RECTANGLE, LINE, TEXT, FILL, STROKE } from './defaultShapes';

export interface FabricJSEditor {
  canvas: fabric.Canvas;
  addCircle: () => void;
  addRectangle: () => void;
  addLine: () => void;
  addText: (text: string, options: any) => void;
  updateText: (text: string) => void;
  deleteAll: () => void;
  deleteSelected: () => void;
  fillColor: string;
  strokeColor: string;
  setFillColor: (color: string) => void;
  setStrokeColor: (color: string) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

const buildEditor = (
  canvas: fabric.Canvas,
  fillColor: string,
  strokeColor: string,
  _setFillColor: (color: string) => void,
  _setStrokeColor: (color: string) => void,
  scaleStep: number
): FabricJSEditor => {
  return {
    canvas,
    addCircle: () => {
      const object = new fabric.Circle({
        ...CIRCLE,
        fill: fillColor,
        stroke: strokeColor,
      });
      canvas.add(object);
    },
    addRectangle: () => {
      const object = new fabric.Rect({
        ...RECTANGLE,
        fill: fillColor,
        stroke: strokeColor,
      });
      canvas.add(object);
    },
    addLine: () => {
      const object = new fabric.Line(LINE.points, {
        ...LINE.options,
        stroke: strokeColor,
      });
      canvas.add(object);
    },
    addText: (text: string, options: any = {}) => {
      const object = new fabric.Textbox(text, {
        ...options,
        ...TEXT,
        fill: strokeColor,
      });
      object.set({ text });
      canvas.add(object);
    },
    updateText: (text: string) => {
      const objects: any[] = canvas.getActiveObjects();
      if (objects.length && objects[0].type === TEXT.type) {
        const textObject: fabric.Textbox = objects[0];
        textObject.set({ text });
        canvas.renderAll();
      }
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
    fillColor,
    strokeColor,
    setFillColor: (fill: string) => {
      _setFillColor(fill);
      canvas.getActiveObjects().forEach((object) => object.set({ fill }));
      canvas.renderAll();
    },
    setStrokeColor: (stroke: string) => {
      _setStrokeColor(stroke);
      canvas.getActiveObjects().forEach((object) => {
        if (object.type === TEXT.type) {
          // use stroke in text fill
          object.set({ fill: stroke });
          return;
        }
        object.set({ stroke });
      });
      canvas.renderAll();
    },
    zoomIn: () => {
      const zoom = canvas.getZoom();
      canvas.setZoom(zoom / scaleStep);
    },
    zoomOut: () => {
      const zoom = canvas.getZoom();
      canvas.setZoom(zoom * scaleStep);
    },
  };
};

interface FabricJSEditorState {
  editor?: FabricJSEditor;
}

export interface FabricJSEditorHook extends FabricJSEditorState {
  selectedObjects?: fabric.Object[];
  onReady: (canvas: fabric.Canvas) => void;
}

interface FabricJSEditorHookProps {
  defaultFillColor?: string;
  defaultStrokeColor?: string;
  scaleStep?: number;
}

const useFabricJSEditor = (
  props: FabricJSEditorHookProps = {}
): FabricJSEditorHook => {
  const scaleStep = props.scaleStep || 0.5;
  const { defaultFillColor, defaultStrokeColor } = props;
  const [canvas, setCanvas] = useState<null | fabric.Canvas>(null);
  const [fillColor, setFillColor] = useState<string>(defaultFillColor || FILL);
  const [strokeColor, setStrokeColor] = useState<string>(
    defaultStrokeColor || STROKE
  );
  const [selectedObjects, setSelectedObject] = useState<fabric.Object[]>([]);

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
    }
  }, [canvas]);

  return {
    selectedObjects,
    onReady: (canvasReady: fabric.Canvas): void => {
      console.log('Fabric canvas ready');
      setCanvas(canvasReady);
    },
    editor: canvas
      ? buildEditor(
          canvas,
          fillColor,
          strokeColor,
          setFillColor,
          setStrokeColor,
          scaleStep
        )
      : undefined,
  };
};

export { buildEditor, useFabricJSEditor };
