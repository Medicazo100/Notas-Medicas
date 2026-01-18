import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  onSave: (data: string | null) => void;
  initialData: string | null;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, initialData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    setKey(prev => prev + 1);
  }, [initialData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (parent) {
        const rect = parent.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = 160;
    }
    
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';

    if (initialData) {
      const img = new Image();
      img.src = initialData;
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
  }, [key, initialData]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }

    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y);
    }
    if (e.cancelable) e.preventDefault(); 
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
        ctx.lineTo(x, y);
        ctx.stroke();
    }
    if (e.cancelable) e.preventDefault(); 
  };

  const end = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    onSave(canvasRef.current?.toDataURL() || null);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    onSave(null);
  };

  return (
    <div className="relative border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white w-full h-40 touch-none overflow-hidden shadow-sm">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full cursor-crosshair"
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <button onClick={clear} className="absolute top-2 right-2 bg-red-100 text-red-600 text-xs px-3 py-1 rounded hover:bg-red-200 font-medium border border-red-200">
        Borrar
      </button>
      {!initialData && !isDrawing && <span className="absolute inset-0 flex items-center justify-center text-slate-300 pointer-events-none">Firmar aquí</span>}
    </div>
  );
};