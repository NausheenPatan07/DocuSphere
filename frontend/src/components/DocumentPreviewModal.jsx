import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import documentApi from '../api/documentApi';
import {
  FileText,
  X,
  Download,
  Calendar,
  User,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  KeyRound,
  ExternalLink,
} from 'lucide-react';

const DocumentPreviewModal = ({ document, onClose, onRequestAccess }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);

  if (!document) return null;

  const docId = document.id || document.document_id;
  const isSameDivision = !document.division_id || user?.role === 'admin' || user?.division_id === document.division_id;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await documentApi.downloadDocument(docId);
      
      // Create download link for blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', document.filename || 'downloaded-file');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${document.filename}`);
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('Cross-division access restricted. Please submit an access request.');
      } else {
        toast.error('Unable to download file.');
      }
    } finally {
      setDownloading(false);
    }
  };

  const getOcrBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="ds-badge ds-badge-green"><CheckCircle2 size={12} /> OCR Extracted</span>;
      case 'processing':
        return <span className="ds-badge ds-badge-blue"><Clock size={12} /> Processing</span>;
      case 'failed':
        return <span className="ds-badge ds-badge-red"><AlertCircle size={12} /> OCR Error</span>;
      default:
        return <span className="ds-badge ds-badge-gray"><Clock size={12} /> Not Processed</span>;
    }
  };

  const metadataObj = document.metadata || {};

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="ds-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={22} />
            </div>
            <div>
              <div className="ds-modal-title" style={{ maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {document.filename}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                ID: {docId}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="ds-modal-body">
          {/* Status banner */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: isSameDivision ? '#f0fdf4' : '#fffbeb',
              border: `1px solid ${isSameDivision ? '#bbf7d0' : '#fef08a'}`,
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: '13px', color: isSameDivision ? '#166534' : '#854d0e', fontWeight: 600 }}>
              {isSameDivision ? 'Authorized division document' : 'Cross-division document'}
            </div>
            {getOcrBadge(document.ocr_status)}
          </div>

          {/* Properties grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '14px',
              marginBottom: '22px',
            }}
          >
            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                Uploaded By
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={15} style={{ color: '#0284c7' }} />
                <span>{document.uploaded_by || 'Enterprise User'}</span>
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                Upload Timestamp
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} style={{ color: '#0284c7' }} />
                <span>
                  {document.upload_date ? new Date(document.upload_date).toLocaleString() : 'Recent'}
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Metadata Section */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
              Document Dynamic Metadata
            </h4>
            {Object.keys(metadataObj).length > 0 ? (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                {Object.entries(metadataObj).map(([k, v], idx) => (
                  <div
                    key={k}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      fontSize: '13px',
                      borderBottom: idx === Object.keys(metadataObj).length - 1 ? 'none' : '1px solid #f1f5f9',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                    }}
                  >
                    <span style={{ color: '#64748b', fontWeight: 600, textTransform: 'capitalize' }}>
                      {k.replace(/_/g, ' ')}
                    </span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>{String(v)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#94a3b8', fontSize: '13px' }}>
                No custom metadata assigned to this document.
              </div>
            )}
          </div>

          {/* Snippet / Search match preview if present */}
          {document.snippet && (
            <div>
              <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                OCR Extracted Context Snippet
              </h4>
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: '#334155',
                  fontFamily: 'monospace',
                }}
              >
                {document.snippet}
              </div>
            </div>
          )}
        </div>

        <div className="ds-modal-footer">
          <button type="button" className="ds-btn ds-btn-secondary" onClick={onClose}>
            Close
          </button>

          {isSameDivision ? (
            <button
              type="button"
              className="ds-btn ds-btn-primary"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                'Downloading...'
              ) : (
                <>
                  <Download size={16} />
                  <span>Download File</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              className="ds-btn ds-btn-primary"
              style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' }}
              onClick={() => {
                onClose();
                if (onRequestAccess) onRequestAccess(document);
              }}
            >
              <KeyRound size={16} />
              <span>Request Cross-Division Access</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;
