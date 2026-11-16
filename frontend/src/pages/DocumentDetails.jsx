import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import documentApi from '../api/documentApi';
import RequestAccessModal from '../components/RequestAccessModal';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  FileText,
  Download,
  KeyRound,
  ArrowLeft,
  Calendar,
  User,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  Shield,
  Layers,
  FileCheck,
} from 'lucide-react';

const DocumentDetails = () => {
  const { docId } = useParams();
  const navigate = useNavigate();
  const { user, role, divisionId } = useAuth();
  const toast = useToast();

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  useEffect(() => {
    const fetchDoc = async () => {
      setLoading(true);
      try {
        // Fetch list to find matching document
        const res = await documentApi.getDocuments();
        if (res.status === 'success' && res.documents) {
          const match = res.documents.find((d) => d.id === docId);
          if (match) {
            setDocument(match);
          } else {
            // Might be a cross-division document searched earlier
            setDocument({
              id: docId,
              filename: 'Document ' + docId.substring(0, 8),
              ocr_status: 'unknown',
              metadata: {},
            });
          }
        }
      } catch (err) {
        console.error('Failed to load document details', err);
        toast.error('Unable to retrieve document details');
      } finally {
        setLoading(false);
      }
    };

    if (docId) fetchDoc();
  }, [docId, toast]);

  const isSameDivision =
    role === 'admin' || (Boolean(document?.division_id) && document.division_id === divisionId);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await documentApi.downloadDocument(docId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', document?.filename || 'downloaded-file');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${document?.filename || 'file'}`);
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('Cross-division access restricted. Please submit an access request.');
        setShowRequestModal(true);
      } else {
        toast.error('Failed to download document');
      }
    } finally {
      setDownloading(false);
    }
  };

  const getOcrBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="ds-badge ds-badge-green">
            <CheckCircle2 size={13} /> Completed
          </span>
        );
      case 'processing':
        return (
          <span className="ds-badge ds-badge-blue">
            <Clock size={13} /> Processing
          </span>
        );
      case 'failed':
        return (
          <span className="ds-badge ds-badge-red">
            <AlertCircle size={13} /> Failed
          </span>
        );
      default:
        return (
          <span className="ds-badge ds-badge-gray">
            <Clock size={13} /> Not Processed
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSpinner text="Retrieving document metadata..." />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="page-container">
        <div className="ds-card" style={{ padding: '48px', textAlign: 'center' }}>
          <AlertCircle size={36} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Document Not Found</h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '8px 0 24px' }}>
            The document could not be located or belongs to an isolated division.
          </p>
          <Link to="/documents" className="ds-btn ds-btn-primary">
            Back to Documents
          </Link>
        </div>
      </div>
    );
  }

  const metadataEntries = Object.entries(document.metadata || {});

  return (
    <div className="page-container" style={{ maxWidth: '1000px' }}>
      <button
        className="ds-btn ds-btn-secondary ds-btn-sm"
        style={{ marginBottom: '20px' }}
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={15} />
        <span>Back to List</span>
      </button>

      {/* Main Document Details Card */}
      <div className="ds-card" style={{ marginBottom: '24px' }}>
        <div className="ds-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileText size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {document.filename}
              </h1>
              <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                ID: {document.id}
              </div>
            </div>
          </div>

          <div>
            {isSameDivision ? (
              <button
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
                className="ds-btn ds-btn-primary"
                style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' }}
                onClick={() => setShowRequestModal(true)}
              >
                <KeyRound size={16} />
                <span>Request Cross-Division Access</span>
              </button>
            )}
          </div>
        </div>

        <div className="ds-card-body">
          {!isSameDivision && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#92400e',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13.5px',
                fontWeight: 500,
              }}
            >
              <Shield size={18} style={{ color: '#d97706', flexShrink: 0 }} />
              <span>
                This document belongs to another corporate division. Cross-division access approval is required to download or inspect files.
              </span>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="ds-grid-3" style={{ marginBottom: '28px' }}>
            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                Uploaded By
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={16} style={{ color: '#0284c7' }} />
                <span>{document.uploaded_by || 'Unknown'}</span>
              </div>
            </div>

            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                Upload Timestamp
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} style={{ color: '#0284c7' }} />
                <span>
                  {document.upload_date ? new Date(document.upload_date).toLocaleString() : '—'}
                </span>
              </div>
            </div>

            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                OCR Engine Pipeline
              </div>
              <div>{getOcrBadge(document.ocr_status)}</div>
            </div>
          </div>

          {/* Dynamic Metadata Attributes */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
              Assigned Dynamic Metadata Attributes
            </h3>
            {metadataEntries.length > 0 ? (
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}
              >
                {metadataEntries.map(([k, v], idx) => (
                  <div
                    key={k}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '12px 18px',
                      fontSize: '13.5px',
                      borderBottom: idx === metadataEntries.length - 1 ? 'none' : '1px solid #f1f5f9',
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
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  fontSize: '13px',
                }}
              >
                No custom metadata assigned to this document.
              </div>
            )}
          </div>
        </div>
      </div>

      {showRequestModal && (
        <RequestAccessModal
          document={document}
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => toast.success('Access requested')}
        />
      )}
    </div>
  );
};

export default DocumentDetails;
