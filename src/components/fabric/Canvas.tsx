import React, {
  CSSProperties,
  DragEventHandler,
  RefObject,
  useEffect,
} from 'react';
import { fabric } from 'fabric';
import { withSize } from 'react-sizeme';

import { useFabricJSEditor } from './editor';

export interface Props {
  className?: string;
  onReady?: (canvas: fabric.Canvas) => void;
  onDrop?: DragEventHandler;
  style?: CSSProperties;
  canvasRef: RefObject<HTMLCanvasElement>;
  parentRef: RefObject<HTMLDivElement>;
}

const FabricJSCanvasWithoutSize = ({
  className,
  onReady,
  onDrop,
  style,
  canvasRef,
  parentRef,
}: Props) => {
  const setCurrentDimensions = (canvas: fabric.Canvas) => {
    canvas.setHeight(parentRef?.current?.clientHeight || 0);
    canvas.setWidth(parentRef?.current?.clientWidth || 0);
    canvas.renderAll();
  };

  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current);
    const resizeCanvas = () => {
      setCurrentDimensions(canvas);
    };

    window.addEventListener('resize', resizeCanvas, false);

    if (onReady) {
      onReady(canvas);
      setCurrentDimensions(canvas);
    }

    return () => {
      canvas.dispose();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div className={className} ref={parentRef} style={style} onDrop={onDrop}>
      <canvas ref={canvasRef} />
    </div>
  );
};

const FabricJSCanvas = withSize()(FabricJSCanvasWithoutSize);

export { FabricJSCanvas, useFabricJSEditor };
