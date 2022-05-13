import { useEffect, useState } from 'react';
import { fabric } from 'fabric';
import { ITextboxOptions, Textbox } from 'fabric/fabric-impl';

const TextOptions: ITextboxOptions = {
  type: 'textbox',
  left: 100,
  top: 100,
  fontSize: 16,
  fontFamily: 'Helvetica',
  fill: '#000000',
  width: 100,
  lockScalingY: true,
  lockSkewingX: true,
  lockSkewingY: true,
  lockRotation: true,
  lockScalingFlip: true,
  lockUniScaling: true,
  editable: false,
  originX: 'left',
  originY: 'top',
  padding: 1,
};

const props = [
  'type',
  'left',
  'top',
  'fontSize',
  'fontFamily',
  'fill',
  'width',
  'lockScalingY',
  'lockSkewingX',
  'lockSkewingY',
  'lockRotation',
  'lockScalingFlip',
  'lockUniScaling',
  'editable',
  'originX',
  'originY',
  'padding',
];

export interface Fieldbox extends Textbox {
  index: number;
  renderType: string;
}

export interface FabricJSEditor {
  canvas: fabric.Canvas;
  dump: () => any;
  load: (data: any) => void;
  addText: (text: string, extraOptions?: ITextboxOptions) => void;
  updateText: (extraOptions?: Partial<Fieldbox>) => void;
  deleteAll: () => void;
  deleteSelected: () => void;
}

const buildEditor = (canvas: fabric.Canvas): FabricJSEditor => {
  return {
    canvas,
    dump: () => {
      return {
        objects: canvas.getObjects().map((o) => {
          const out = o.toJSON(props);
          out.index = o.data && parseInt(o.data.index, 10);
          out.renderType = o.data?.renderType || 'text';
          return out;
        }),
      };
    },
    load: (data) => {
      canvas.loadFromJSON(data, () => {});
      canvas.getObjects().forEach((o, i) => {
        if (data.objects[i].index !== undefined) {
          o.data = {
            index: data.objects[i].index,
            renderType: data.objects[i].renderType,
          };

          // Handle legacy text type
          if (o.type === 'text') {
            o.type = 'textbox';
          }
        }
      });
      canvas.renderAll();
    },
    addText: (text: string, extraOptions?: ITextboxOptions) => {
      const object = new fabric.Textbox(text, {
        ...TextOptions,
        ...extraOptions,
      });
      object.set({ text });
      canvas.add(object);
    },
    updateText: (extraOptions?: Partial<Fieldbox>) => {
      const objects: any[] = canvas.getActiveObjects();
      if (objects.length && objects[0].type.includes('text')) {
        const textObject: Fieldbox = objects[0];
        if (extraOptions) {
          extraOptions.data = {
            ...textObject.data,
            renderType: extraOptions.renderType,
          };
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
