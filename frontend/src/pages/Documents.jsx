import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import documentApi from '../api/documentApi';
import metadataApi from '../api/metadataApi';
import DocumentTable from '../components/DocumentTable';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import RequestAccessModal from '../components/RequestAccessModal';
import {
  Files,
  UploadCloud,
  Search,
  Filter,
  RefreshCw,
  Building,
  Shield,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';

const Documents = () => {
  const { user, role, divisionId, divisionName } = useAuth();
  const toast = useToast();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ocrFilter, setOcrFilter] = useState('all');
  const [metadataFields, setMetadataFields] = useState([]);
  const [metadataFilters, setMetadataFilters] = useState({});
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [requestDocModal, setRequestDocModal] = useState(null);

  const fetchDocuments = async (query = searchTerm, currentMetaFilters = metadataFilters) => {
    setLoading(true);
    try {
      const params = {};
      if (typeof query === 'string' && query.trim()) {
        params.q = query.trim();
      }

      Object.entries(currentMetaFilters).forEach(([k, v]) => {
        if (typeof v === 'string' && v.trim()) {
          params[k] = v.trim();
        }
      });

      const res = await documentApi.getDocuments(params);
      if (res.status === 'success') {
        setDocuments(res.documents || []);
      }
    } catch (err) {
      console.error('Failed to load documents', err);
      toast.error('Unable to fetch documents from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const metaRes = await metadataApi.getFields();
        if (metaRes.status === 'success' && Array.isArray(metaRes.fields)) {
          setMetadataFields(metaRes.fields);
        }
      } catch (err) {
        console.error('Failed to load dynamic metadata fields', err);
      }
      fetchDocuments('', {});
    };
    init();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDocuments(searchTerm, metadataFilters);
  };

  const handleMetadataFilterChange = (key, value) => {
    const updated = {
      ...metadataFilters,
      [key]: value,
    };
    setMetadataFilters(updated);
    fetchDocuments(searchTerm, updated);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setOcrFilter('all');
    setMetadataFilters({});
    fetchDocuments('', {});
  };

  const getFieldOptions = (field) => {
    if (!field.options) return [];
    if (Array.isArray(field.options)) return field.options;
    if (typeof field.options === 'string') {
      return field.options.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    ocrFilter !== 'all' ||
    Object.values(metadataFilters).some((v) => typeof v === 'string' && v.trim() !== '');

  const handleDownload = async (doc) => {
    try {
      const docId = doc.id || doc.document_id;
      const response = await documentApi.downloadDocument(docId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${doc.filename}`);
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('Cross-division access restricted. Please submit an access request.');
        setRequestDocModal(doc);
      } else {
        toast.error('Failed to download document');
      }
    }
  };

  // Filter documents in memory for OCR status
  const filteredDocuments = documents.filter((doc) => {
    if (ocrFilter !== 'all' && doc.ocr_status !== ocrFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="page-container">
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 className="page-title">Document Repository</h1>
          <p className="page-description">
            {role === 'admin'
              ? 'Enterprise-wide documents across all corporate divisions'
              : `Compartmentalized repository for the ${divisionName || 'Division'} Department`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="ds-btn ds-btn-secondary"
            onClick={() => fetchDocuments(searchTerm, metadataFilters)}
            disabled={loading}
            title="Refresh repository"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <Link to="/upload" className="ds-btn ds-btn-primary">
            <UploadCloud size={16} />
            <span>Upload Document</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="ds-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Top Row: Filename search & OCR status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            {/* Filename Search Form */}
            <form
              onSubmit={handleSearchSubmit}
              style={{ display: 'flex', gap: '8px', flex: '1', minWidth: '280px' }}
            >
              <div className="ds-input-icon-wrapper" style={{ flex: 1 }}>
                <span className="ds-input-icon-left">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  className="ds-input ds-input-with-left-icon"
                  placeholder="Filter by document filename..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button type="submit" className="ds-btn ds-btn-secondary ds-btn-sm">
                Search
              </button>
            </form>

            {/* OCR Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Filter size={14} />
                <span>OCR Status:</span>
              </span>
              <select
                className="ds-select"
                style={{ width: '160px', padding: '6px 10px', fontSize: '13px' }}
                value={ocrFilter}
                onChange={(e) => setOcrFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
                <option value="not_processed">Not Processed</option>
              </select>

              {hasActiveFilters && (
                <button
                  className="ds-btn ds-btn-outline ds-btn-sm"
                  onClick={handleResetFilters}
                  title="Reset all search and filter values"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Dynamic Metadata Filter Row */}
          {metadataFields.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
                paddingTop: '12px',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  color: '#475569',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <SlidersHorizontal size={13} style={{ color: '#0284c7' }} />
                <span>Metadata Filters:</span>
              </span>

              {metadataFields.map((field) => {
                const val = metadataFilters[field.key] || '';
                if (field.type === 'dropdown') {
                  const optionsList = getFieldOptions(field);
                  return (
                    <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>
                        {field.label}:
                      </span>
                      <select
                        className="ds-select"
                        style={{ minWidth: '150px', padding: '5px 8px', fontSize: '12.5px' }}
                        value={val}
                        onChange={(e) => handleMetadataFilterChange(field.key, e.target.value)}
                      >
                        <option value="">All {field.label}s</option>
                        {optionsList.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }

                return (
                  <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>
                      {field.label}:
                    </span>
                    <input
                      type="text"
                      className="ds-input"
                      style={{ width: '150px', padding: '5px 8px', fontSize: '12.5px' }}
                      placeholder={`Filter ${field.label.toLowerCase()}...`}
                      value={val}
                      onChange={(e) => handleMetadataFilterChange(field.key, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          fetchDocuments(searchTerm, metadataFilters);
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Document Table */}
      <DocumentTable
        documents={filteredDocuments}
        loading={loading}
        onInspect={(doc) => setSelectedDoc(doc)}
        onDownload={handleDownload}
        onRequestAccess={(doc) => setRequestDocModal(doc)}
        currentUserId={user?.id}
        currentUserRole={role}
        currentUserDivisionId={divisionId}
      />

      {/* Document Inspector Modal */}
      {selectedDoc && (
        <DocumentPreviewModal
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onRequestAccess={(doc) => setRequestDocModal(doc)}
        />
      )}

      {/* Request Access Modal */}
      {requestDocModal && (
        <RequestAccessModal
          document={requestDocModal}
          onClose={() => setRequestDocModal(null)}
          onSuccess={() => fetchDocuments(searchTerm)}
        />
      )}
    </div>
  );
};

export default Documents;
