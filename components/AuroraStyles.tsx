import React, { useMemo } from 'react';

const generateBoxShadows = (n: number) => {
  let value = '';
  for (let i = 0; i < n; i++) {
    value += `${Math.floor(Math.random() * 2500)}px ${Math.floor(Math.random() * 2500)}px #FFF${i === n - 1 ? '' : ','} `;
  }
  return value;
};

export const AuroraStyles = () => {
  // Generar las estrellas solo una vez para evitar recálculos
  const smallStars = useMemo(() => generateBoxShadows(800), []);
  const mediumStars = useMemo(() => generateBoxShadows(300), []);
  const largeStars = useMemo(() => generateBoxShadows(100), []);

  return (
    <style>{`
      :root { --app-bg-light: #3b82f6; }
      .app-bg { background: var(--app-bg-light); transition: background 0.3s ease; }
      
      .glass { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(4px); }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      
      .dark .app-bg { background: #001e1a; }
      .dark .glass { background: rgba(15, 23, 42, 0.9); border-bottom: 1px solid rgba(255,255,255,0.05); }
      
      @media print {
        body * { visibility: hidden; }
        #print-section, #print-section * { visibility: visible; }
        #print-section { position: absolute; left: 0; top: 0; width: 100%; }
      }

      /* Cosmic Star Animation Styles */
      .star-layer {
        background: transparent;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
      }
      
      .stars-small { 
        width: 1px; 
        height: 1px; 
        box-shadow: ${smallStars}; 
        animation: animStar 150s linear infinite; 
        opacity: 0.8;
      }
      
      .stars-medium { 
        width: 2px; 
        height: 2px; 
        box-shadow: ${mediumStars}; 
        animation: animStar 200s linear infinite; 
        opacity: 0.6;
      }
      
      .stars-large { 
        width: 3px; 
        height: 3px; 
        box-shadow: ${largeStars}; 
        animation: animStar 250s linear infinite; 
        opacity: 0.4;
      }

      @keyframes animStar {
        from { transform: translateY(0px); }
        to { transform: translateY(-2500px); }
      }
    `}</style>
  );
};