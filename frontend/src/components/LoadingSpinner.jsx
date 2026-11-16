import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ size = 28, text = 'Loading...' }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 16px',
        gap: '12px',
        color: '#0284c7',
      }}
    >
      <Loader2 size={size} className="animate-spin" />
      {text && (
        <span style={{ fontSize: '13.5px', color: '#64748b', fontWeight: 500 }}>
          {text}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;
