import React from 'react';

export const AuroraStyles = () => (
  <style>{`
    :root { --app-bg-light: #3b82f6; /* Blue background for the body */ }
    .app-bg { background: var(--app-bg-light); transition: background 0.3s ease; }
    
    .glass { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(4px); }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    
    .dark .app-bg { background: #001e1a; /* Deep Cyberpunk Green */ }
    .dark .glass { background: rgba(15, 23, 42, 0.9); border-bottom: 1px solid rgba(255,255,255,0.05); }
    
    /* Utility for printing */
    @media print {
      body * { visibility: hidden; }
      #print-section, #print-section * { visibility: visible; }
      #print-section { position: absolute; left: 0; top: 0; width: 100%; }
    }
  `}</style>
);