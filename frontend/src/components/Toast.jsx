import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({ id, message, type = 'info', duration = 4000, onClose }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onClose, 200);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleManualClose = () => {
    setExiting(true);
    setTimeout(onClose, 200);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0 }} />;
      case 'error':
        return <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />;
      case 'warning':
        return <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />;
      default:
        return <Info size={18} style={{ color: '#0284c7', flexShrink: 0 }} />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success': return '#a7f3d0';
      case 'error': return '#fecaca';
      case 'warning': return '#fde68a';
      default: return '#bae6fd';
    }
  };

  return (
    <div
      style={{
        pointerEvents: 'auto',
        background: '#ffffff',
        border: `1px solid ${getBorderColor()}`,
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateY(8px) scale(0.96)' : 'translateY(0) scale(1)',
      }}
    >
      {getIcon()}
      <div style={{ flex: 1, fontSize: '13.5px', color: '#1e293b', fontWeight: 500, lineHeight: 1.4 }}>
        {message}
      </div>
      <button
        onClick={handleManualClose}
        style={{
          background: 'transparent',
          border: 'none',
          padding: '4px',
          color: '#94a3b8',
          cursor: 'pointer',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
      >
        <X size={15} />
      </button>
    </div>
  );
};

export default Toast;
