import React, { useRef, useState } from 'react';
import { UploadCloud, File, FileText, Image as ImageIcon, X, Check } from 'lucide-react';

const UploadDropzone = ({ file, onFileSelect, disabled }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileObj) => {
    if (!fileObj) return <FileText size={32} />;
    const type = fileObj.type || '';
    if (type.includes('image')) return <ImageIcon size={32} style={{ color: '#0d9488' }} />;
    if (type.includes('pdf')) return <FileText size={32} style={{ color: '#0284c7' }} />;
    return <File size={32} style={{ color: '#64748b' }} />;
  };

  return (
    <div>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept=".pdf,.png,.jpg,.jpeg,.txt"
        disabled={disabled}
      />

      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragOver ? '#0284c7' : '#cbd5e1'}`,
            borderRadius: '16px',
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: isDragOver ? '#f0f9ff' : '#ffffff',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: isDragOver ? '#e0f2fe' : '#f8fafc',
              color: isDragOver ? '#0284c7' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              transition: 'all 0.2s ease',
            }}
          >
            <UploadCloud size={28} />
          </div>

          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
            Choose a file or drag & drop it here
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            Supported enterprise formats: PDF, PNG, JPG, JPEG, TXT (up to 50 MB)
          </div>

          <button
            type="button"
            className="ds-btn ds-btn-secondary ds-btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            disabled={disabled}
          >
            Browse Workstation Files
          </button>
        </div>
      ) : (
        <div
          style={{
            border: '1px solid #bae6fd',
            borderRadius: '16px',
            padding: '20px',
            backgroundColor: '#f0f9ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                border: '1px solid #e0f2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {getFileIcon(file)}
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '14.5px',
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '350px',
                }}
              >
                {file.name}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                {formatFileSize(file.size)} • {file.type || 'Document'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="ds-btn ds-btn-secondary ds-btn-sm"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
            >
              Change
            </button>
            <button
              type="button"
              className="ds-btn ds-btn-icon"
              style={{ color: '#ef4444' }}
              onClick={() => onFileSelect(null)}
              disabled={disabled}
              title="Remove file"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadDropzone;
