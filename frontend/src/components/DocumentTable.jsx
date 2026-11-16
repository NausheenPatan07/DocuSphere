import React, { useState } from 'react';
import {
  FileText,
  Download,
  Eye,
  KeyRound,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

const DocumentTable = ({
  documents = [],
  loading = false,
  onInspect,
  onDownload,
  onRequestAccess,
  currentUserId,
  currentUserRole,
  currentUserDivisionId,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.ceil(documents.length / pageSize) || 1;
  const paginatedDocs = documents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getOcrBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="ds-badge ds-badge-green">
            <CheckCircle2 size={12} /> Completed
          </span>
        );
      case 'processing':
        return (
          <span className="ds-badge ds-badge-blue">
            <Clock size={12} /> Processing
          </span>
        );
      case 'failed':
        return (
          <span className="ds-badge ds-badge-red">
            <AlertCircle size={12} /> Failed
          </span>
        );
      default:
        return (
          <span className="ds-badge ds-badge-gray">
            <Clock size={12} /> Pending
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
        Loading document repository...
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="ds-empty-state">
        <div className="ds-empty-icon">
          <FileText size={28} />
        </div>
        <div className="ds-empty-title">No documents found</div>
        <div className="ds-empty-desc">
          No documents match your query or division filter.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="ds-table-container">
        <table className="ds-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Metadata Attributes</th>
              <th>Uploaded By</th>
              <th>Upload Date</th>
              <th>OCR Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDocs.map((doc) => {
              const docId = doc.id || doc.document_id;
              const isSameDivision =
                currentUserRole === 'admin' ||
                !doc.division_id ||
                doc.division_id === currentUserDivisionId;

              const metadataEntries = Object.entries(doc.metadata || {});

              return (
                <tr key={docId}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: '#e0f2fe',
                          color: '#0284c7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <FileText size={18} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            color: '#0f172a',
                            maxWidth: '260px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={doc.filename}
                        >
                          {doc.filename}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          ID: {docId?.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '240px' }}>
                      {metadataEntries.length > 0 ? (
                        metadataEntries.slice(0, 2).map(([k, v]) => (
                          <span
                            key={k}
                            className="ds-badge ds-badge-gray"
                            style={{ fontSize: '11px', textTransform: 'capitalize' }}
                          >
                            {k.replace(/_/g, ' ')}: {String(v)}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>None</span>
                      )}
                      {metadataEntries.length > 2 && (
                        <span className="ds-badge ds-badge-gray" style={{ fontSize: '10px' }}>
                          +{metadataEntries.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>

                  <td>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                      {doc.uploaded_by || 'Unknown'}
                    </div>
                  </td>

                  <td>
                    <div style={{ fontSize: '12.5px', color: '#475569' }}>
                      {doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : '—'}
                    </div>
                  </td>

                  <td>{getOcrBadge(doc.ocr_status)}</td>

                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        className="ds-btn ds-btn-secondary ds-btn-sm"
                        onClick={() => onInspect && onInspect(doc)}
                        title="View details"
                      >
                        <Eye size={14} />
                        <span>View</span>
                      </button>

                      {isSameDivision ? (
                        <button
                          className="ds-btn ds-btn-primary ds-btn-sm"
                          onClick={() => onDownload && onDownload(doc)}
                          title="Download document"
                        >
                          <Download size={14} />
                          <span>Download</span>
                        </button>
                      ) : (
                        <button
                          className="ds-btn ds-btn-outline ds-btn-sm"
                          style={{ color: '#0d9488', borderColor: '#0d9488' }}
                          onClick={() => onRequestAccess && onRequestAccess(doc)}
                          title="Request division access"
                        >
                          <KeyRound size={14} />
                          <span>Request Access</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 8px 0',
            fontSize: '13px',
            color: '#64748b',
          }}
        >
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, documents.length)} of {documents.length} documents
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="ds-btn ds-btn-secondary ds-btn-sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <span style={{ fontWeight: 600, color: '#0f172a', padding: '0 4px' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="ds-btn ds-btn-secondary ds-btn-sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentTable;
