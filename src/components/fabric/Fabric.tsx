import React, { CSSProperties, useEffect, useRef } from 'react';
import { fabric } from 'fabric';

import { useFabricJSEditor } from './editor';

export interface Props {
  className?: string;
  onReady?: (canvas: fabric.Canvas) => void;
  style?: CSSProperties;
}

const FabricJSCanvas = ({ className, onReady, style }: Props) => {
  const canvasEl = useRef(null);
  const canvasElParent = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = new fabric.Canvas(canvasEl.current);
    const setCurrentDimensions = () => {
      canvas.setHeight(canvasElParent.current?.clientHeight || 0);
      canvas.setWidth(canvasElParent.current?.clientWidth || 0);
      canvas.renderAll();
    };
    const resizeCanvas = () => {
      setCurrentDimensions();
    };
    setCurrentDimensions();

    window.addEventListener('resize', resizeCanvas, false);

    if (onReady) {
      onReady(canvas);
    }

    return () => {
      canvas.dispose();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div ref={canvasElParent} className={className} style={style}>
      <canvas ref={canvasEl} />
    </div>
  );
};

export { FabricJSCanvas, useFabricJSEditor };
