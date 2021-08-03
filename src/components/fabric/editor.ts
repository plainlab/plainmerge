import { useEffect, useState } from 'react';
import { fabric } from 'fabric';
import { ITextboxOptions, Textbox } from 'fabric/fabric-impl';

const TextOptions: ITextboxOptions = {
  type: 'text',
  left: 100,
  top: 100,
  fontSize: 16,
  fontFamily: 'Helvetica',
  fill: '#000000',
  width: 200,
  lockRotation: true,
  lockSkewingX: true,
  lockSkewingY: true,
  lockScalingX: true,
  lockScalingY: true,
  hasControls: false,
  editable: false,
  originX: 'left',
  originY: 'top',
  padding: 1,
};

export interface FabricJSEditor {
  canvas: fabric.Canvas;
  dump: () => any;
  load: (data: any) => void;
  addText: (text: string, extraOptions?: ITextboxOptions) => void;
  updateText: (extraOptions?: Partial<Textbox>) => void;
  deleteAll: () => void;
  deleteSelected: () => void;
}

const buildEditor = (canvas: fabric.Canvas): FabricJSEditor => {
  return {
    canvas,
    dump: () => {
      return canvas.toJSON();
    },
    load: (data) => {
      canvas.loadFromJSON(data, () => {});
    },
    addText: (text: string, extraOptions?: ITextboxOptions) => {
      const object = new fabric.Textbox(text, {
        ...TextOptions,
        ...extraOptions,
      });
      object.set({ text });
      canvas.add(object);
    },
    updateText: (extraOptions?: Partial<Textbox>) => {
      const objects: any[] = canvas.getActiveObjects();
      if (objects.length && objects[0].type === 'text') {
        const textObject: fabric.Textbox = objects[0];
        if (extraOptions) {
          textObject.set(extraOptions);
          canvas.renderAll();
        }
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
  };
};

const useFabricJSEditor = () => {
  const [canvas, setCanvas] = useState<null | fabric.Canvas>(null);
  const [selectedObject, setSelectedObject] = useState<fabric.Object>();
  const [editor, setEditor] = useState<FabricJSEditor>();

  useEffect(() => {
    const bindEvents = (canva: fabric.Canvas) => {
      canva.on('selection:cleared', () => {
        setSelectedObject(undefined);
      });
      canva.on('selection:created', (e: any) => {
        setSelectedObject(e.selected[0]);
      });
      canva.on('selection:updated', (e: any) => {
        setSelectedObject(e.selected[0]);
      });
      canva.on('selection:updated', (e: any) => {
        setSelectedObject(e.selected[0]);
      });
    };

    if (canvas) {
      bindEvents(canvas);
      setEditor(buildEditor(canvas));
    }
  }, [canvas]);

  return {
    selectedObject,
    onReady: (canvasReady: fabric.Canvas): void => {
      setCanvas(canvasReady);
      console.log('Fabric canvas ready');
    },
    editor,
  };
};

export { buildEditor, useFabricJSEditor };
