import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import searchApi from '../api/searchApi';
import documentApi from '../api/documentApi';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import RequestAccessModal from '../components/RequestAccessModal';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Search,
  FileText,
  Sparkles,
  Download,
  KeyRound,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  Calendar,
  Layers,
  HelpCircle,
  X,
  RotateCcw,
  Tag,
  FileSearch,
  Sliders,
  Info,
  Zap,
} from 'lucide-react';

const SEARCH_MODES = [
  {
    id: 'semantic',
    label: 'Semantic AI Search',
    shortDesc: 'Finds documents based on the meaning and context of your query.',
    badge: 'AI Powered',
    icon: Sparkles,
  },
  {
    id: 'hybrid',
    label: 'Hybrid Search',
    shortDesc: 'Combines exact keyword matching with AI semantic relevance.',
    badge: '40% KW + 60% AI',
    icon: Layers,
  },
  {
    id: 'keyword',
    label: 'Keyword Search',
    shortDesc: 'Finds documents containing matching words or phrases.',
    badge: null,
    icon: Search,
  },
];

const AdvancedSearch = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialMode = searchParams.get('mode') || 'semantic';

  const { user, role, divisionId, divisionName } = useAuth();
  const toast = useToast();
  const searchInputRef = useRef(null);

  const [keyword, setKeyword] = useState(initialQuery);
  const [searchedKeyword, setSearchedKeyword] = useState('');
  const [searchMode, setSearchMode] = useState(
    ['keyword', 'semantic', 'hybrid'].includes(initialMode) ? initialMode : 'semantic'
  );
  const [activeMode, setActiveMode] = useState('semantic');
  const [results, setResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [weights, setWeights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [selectedDoc, setSelectedDoc] = useState(null);
  const [requestDocModal, setRequestDocModal] = useState(null);

  // Execute search using the selected mode endpoint
  const executeSearch = async (searchTerm, modeToUse = searchMode) => {
    const trimmed = searchTerm ? searchTerm.trim() : '';
    if (!trimmed || trimmed.length < 2) {
      toast.error('Search query must be at least 2 characters');
      return;
    }

    if (loading) return; // Prevent duplicate requests

    setLoading(true);
    setHasSearched(true);
    setSearchedKeyword(trimmed);
    setActiveMode(modeToUse);

    try {
      const res = await searchApi.search(trimmed, modeToUse);
      if (res.status === 'success') {
        setResults(res.results || []);
        setTotalResults(res.total ?? res.total_results ?? (res.results?.length || 0));
        setWeights(res.weights || null);
      } else {
        toast.error(res.message || 'Search execution failed');
        setResults([]);
        setTotalResults(0);
        setWeights(null);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Search failed. Please try a different query.';
      toast.error(msg);
      setResults([]);
      setTotalResults(0);
      setWeights(null);
    } finally {
      setLoading(false);
    }
  };

  // Sync search on mount if ?q= is provided
  useEffect(() => {
    if (initialQuery && initialQuery.trim().length >= 2) {
      setKeyword(initialQuery);
      executeSearch(initialQuery, initialMode);
    }
  }, [initialQuery, initialMode]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (keyword.trim().length >= 2) {
      setSearchParams({ q: keyword.trim(), mode: searchMode });
      executeSearch(keyword.trim(), searchMode);
    } else {
      toast.error('Please enter at least 2 characters to search');
    }
  };

  const handleModeChange = (newMode) => {
    setSearchMode(newMode);
    if (hasSearched && keyword.trim().length >= 2) {
      setSearchParams({ q: keyword.trim(), mode: newMode });
      executeSearch(keyword.trim(), newMode);
    } else {
      setSearchParams(keyword.trim() ? { q: keyword.trim(), mode: newMode } : { mode: newMode });
    }
  };

  // Clear search and reset state
  const handleClear = () => {
    setKeyword('');
    setSearchedKeyword('');
    setResults([]);
    setTotalResults(0);
    setWeights(null);
    setHasSearched(false);
    setSearchParams({ mode: searchMode });
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleDownload = async (doc) => {
    try {
      const docId = doc.document_id || doc.id;
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
        toast.error('Cross-division access required. Please request access.');
        setRequestDocModal(doc);
      } else {
        toast.error('Download failed');
      }
    }
  };

  // Safely highlight matching terms in text (for keyword/hybrid matches)
  const highlightMatch = (text, term) => {
    if (!text) return null;
    if (!term || !term.trim()) return text;

    try {
      const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      const parts = String(text).split(regex);

      if (parts.length <= 1) return text;

      return parts.map((part, i) =>
        part.toLowerCase() === term.trim().toLowerCase() ? (
          <mark
            key={i}
            style={{
              backgroundColor: '#fef08a',
              color: '#854d0e',
              fontWeight: 700,
              padding: '1px 4px',
              borderRadius: '3px',
            }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      );
    } catch {
      return text;
    }
  };

  const getOcrBadge = (status) => {
    switch (status) {
      case 'completed':
      case 'processed':
        return (
          <span className="ds-badge ds-badge-green" style={{ fontSize: '11px' }}>
            <CheckCircle2 size={11} /> OCR Indexed
          </span>
        );
      case 'processing':
        return (
          <span className="ds-badge ds-badge-blue" style={{ fontSize: '11px' }}>
            <Clock size={11} /> Processing
          </span>
        );
      case 'failed':
        return (
          <span className="ds-badge ds-badge-red" style={{ fontSize: '11px' }}>
            <AlertCircle size={11} /> OCR Failed
          </span>
        );
      default:
        return (
          <span className="ds-badge ds-badge-gray" style={{ fontSize: '11px' }}>
            <Clock size={11} /> {status || 'Not Processed'}
          </span>
        );
    }
  };

  const currentModeInfo = SEARCH_MODES.find((m) => m.id === searchMode) || SEARCH_MODES[0];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 className="page-title">Enterprise Intelligent Search</h1>
          <span
            className="ds-badge ds-badge-blue"
            style={{ fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <Sparkles size={12} /> AI Powered
          </span>
        </div>
        <p className="page-description">
          Search across scanned PDFs, OCR text extractions, dynamic metadata, and semantic meaning powered by Sentence Transformers.
        </p>
      </div>

      {/* Main Search Control Card */}
      <div
        className="ds-card"
        style={{
          padding: '26px 28px',
          marginBottom: '28px',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Search Mode Tabs / Segmented Control */}
        <div style={{ marginBottom: '18px' }}>
          <div
            style={{
              display: 'flex',
              gap: '6px',
              padding: '4px',
              backgroundColor: '#f1f5f9',
              borderRadius: '10px',
              width: 'fit-content',
              maxWidth: '100%',
              flexWrap: 'wrap',
            }}
          >
            {SEARCH_MODES.map((m) => {
              const Icon = m.icon;
              const isSelected = searchMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleModeChange(m.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13.5px',
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? '#0369a1' : '#475569',
                    backgroundColor: isSelected ? '#ffffff' : 'transparent',
                    boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={15} style={{ color: isSelected ? '#0284c7' : '#64748b' }} />
                  <span>{m.label}</span>
                  {m.badge && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '999px',
                        backgroundColor: isSelected ? '#e0f2fe' : '#e2e8f0',
                        color: isSelected ? '#0284c7' : '#475569',
                      }}
                    >
                      {m.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mode Explanation Callout */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '10px',
              fontSize: '12.5px',
              color: '#64748b',
              padding: '6px 10px',
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
            }}
          >
            <Info size={14} style={{ color: '#0284c7', flexShrink: 0 }} />
            <span>
              <strong>{currentModeInfo.label}:</strong> {currentModeInfo.shortDesc}
              {searchMode === 'semantic' && (
                <span style={{ color: '#0369a1', marginLeft: '6px' }}>
                  (Understands related concepts and synonyms even when exact words differ).
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
          <div className="ds-input-icon-wrapper" style={{ flex: 1, position: 'relative' }}>
            <span className="ds-input-icon-left" style={{ color: '#0284c7' }}>
              <Search size={20} />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              className="ds-input ds-input-with-left-icon"
              placeholder={
                searchMode === 'semantic'
                  ? 'Ask a natural language question or enter concepts (e.g. software engineer qualifications, fiscal compliance)...'
                  : searchMode === 'hybrid'
                  ? 'Search with keywords or concepts for combined semantic + keyword ranking...'
                  : 'Search by exact keyword, filename, or metadata attribute...'
              }
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{
                fontSize: '15px',
                padding: '13px 42px 13px 44px',
                height: '48px',
                boxSizing: 'border-box',
              }}
            />
            {keyword && (
              <button
                type="button"
                onClick={() => {
                  setKeyword('');
                  if (searchInputRef.current) searchInputRef.current.focus();
                }}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  borderRadius: '50%',
                }}
                title="Clear input"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="ds-btn ds-btn-primary"
            style={{ height: '48px', padding: '0 24px', fontSize: '14.5px', fontWeight: 600, flexShrink: 0 }}
            disabled={loading || keyword.trim().length < 2}
          >
            {loading ? (
              <>
                <Clock size={16} className="spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                {searchMode === 'semantic' ? <Sparkles size={16} /> : <Search size={16} />}
                <span>
                  {searchMode === 'semantic'
                    ? 'AI Search'
                    : searchMode === 'hybrid'
                    ? 'Hybrid Search'
                    : 'Search'}
                </span>
              </>
            )}
          </button>

          {(hasSearched || keyword.length > 0) && (
            <button
              type="button"
              className="ds-btn ds-btn-secondary"
              onClick={handleClear}
              style={{ height: '48px', padding: '0 18px', fontSize: '14px', flexShrink: 0 }}
              title="Clear search and reset results"
            >
              <RotateCcw size={15} />
              <span>Clear</span>
            </button>
          )}
        </form>

        {/* Scope and Capability Info Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            marginTop: '16px',
            paddingTop: '14px',
            borderTop: '1px solid #f1f5f9',
            fontSize: '12.5px',
            color: '#64748b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={14} style={{ color: '#0284c7' }} />
            <span>
              Search Scope:{' '}
              <strong style={{ color: '#0f172a' }}>
                {role === 'admin'
                  ? 'All Corporate Divisions (Admin Privileged)'
                  : `${divisionName || 'Current'} Division + Approved Cross-Division Access`}
              </strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
            <Sparkles size={13} style={{ color: '#0284c7' }} />
            <span>Embedding Model: <strong>all-MiniLM-L6-v2</strong> (384-dim normalized)</span>
          </div>
        </div>
      </div>

      {/* Results Header */}
      {hasSearched && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '18px',
            padding: '4px 6px',
          }}
        >
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>
              {totalResults} {totalResults === 1 ? 'matching document' : 'matching documents'} found for
            </span>
            <span
              style={{
                backgroundColor: '#e0f2fe',
                color: '#0369a1',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              "{searchedKeyword}"
            </span>
            <span
              className={`ds-badge ${
                activeMode === 'semantic'
                  ? 'ds-badge-blue'
                  : activeMode === 'hybrid'
                  ? 'ds-badge-cyan'
                  : 'ds-badge-gray'
              }`}
              style={{ fontSize: '11px', textTransform: 'capitalize' }}
            >
              {activeMode} mode
            </span>
          </div>

          <button
            type="button"
            onClick={handleClear}
            style={{
              background: 'none',
              border: 'none',
              color: '#0284c7',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <RotateCcw size={13} />
            <span>Clear Search</span>
          </button>
        </div>
      )}

      {/* Results Content Area */}
      {loading ? (
        <LoadingSpinner
          text={
            searchMode === 'semantic'
              ? 'Computing AI semantic similarity scores...'
              : searchMode === 'hybrid'
              ? 'Computing hybrid keyword and semantic rankings...'
              : 'Searching OCR indexed documents and metadata...'
          }
        />
      ) : hasSearched && results.length === 0 ? (
        /* Empty State */
        <div className="ds-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Search size={28} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            No documents found matching "{searchedKeyword}"
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '480px', margin: '0 auto 20px', lineHeight: '1.5' }}>
            {activeMode === 'semantic'
              ? 'No documents met the semantic similarity threshold for this query.'
              : 'No documents matched your query across filenames, OCR text extractions, or dynamic metadata fields.'}
          </p>

          <div
            style={{
              maxWidth: '440px',
              margin: '0 auto 24px',
              padding: '14px 18px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              textAlign: 'left',
              fontSize: '12.5px',
              color: '#475569',
              lineHeight: '1.6',
            }}
          >
            <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>Search suggestions:</strong>
            <ul style={{ margin: 0, paddingLeft: '18px' }}>
              <li>Try phrasing your query as natural language concepts (e.g. "software engineer background")</li>
              <li>Switch to <strong>Hybrid</strong> or <strong>Keyword</strong> mode to compare matches</li>
              <li>Search terms must be at least 2 characters long</li>
              {role !== 'admin' && (
                <li>Non-admin searches are restricted to your division plus approved access documents</li>
              )}
            </ul>
          </div>

          <button
            type="button"
            className="ds-btn ds-btn-secondary"
            onClick={handleClear}
          >
            <RotateCcw size={15} />
            <span>Clear Search</span>
          </button>
        </div>
      ) : hasSearched && results.length > 0 ? (
        /* Matching Documents List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {results.map((doc, index) => {
            const isSameDivision =
              role === 'admin' || !doc.division_id || doc.division_id === divisionId;

            return (
              <div
                key={doc.document_id || index}
                className="ds-card ds-card-hover"
                style={{ padding: '22px 26px', transition: 'box-shadow 0.15s ease' }}
              >
                {/* Document Top Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '16px',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        backgroundColor: '#e0f2fe',
                        color: '#0284c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <FileText size={22} />
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: '16.5px',
                          fontWeight: 700,
                          color: '#0f172a',
                          margin: 0,
                        }}
                      >
                        {activeMode === 'keyword'
                          ? highlightMatch(doc.filename, searchedKeyword)
                          : doc.filename}
                      </h3>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '10px',
                          fontSize: '12px',
                          color: '#64748b',
                          marginTop: '5px',
                        }}
                      >
                        <span>ID: {doc.document_id?.substring(0, 8)}...</span>
                        <span>•</span>
                        <span>
                          {doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : '—'}
                        </span>
                        <span>•</span>
                        {getOcrBadge(doc.ocr_status)}
                        {doc.division_id && (
                          <>
                            <span>•</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Building size={11} /> Division: {doc.division_id.substring(0, 8)}...
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Scores */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="ds-btn ds-btn-secondary ds-btn-sm"
                        onClick={() => setSelectedDoc(doc)}
                        title="Inspect document metadata and content"
                      >
                        <Eye size={13} />
                        <span>Details</span>
                      </button>

                      {isSameDivision ? (
                        <button
                          className="ds-btn ds-btn-primary ds-btn-sm"
                          onClick={() => handleDownload(doc)}
                          title="Download document file"
                        >
                          <Download size={13} />
                          <span>Download</span>
                        </button>
                      ) : (
                        <button
                          className="ds-btn ds-btn-outline ds-btn-sm"
                          style={{ color: '#0d9488', borderColor: '#0d9488' }}
                          onClick={() => setRequestDocModal(doc)}
                          title="Submit cross-division access request"
                        >
                          <KeyRound size={13} />
                          <span>Request Access</span>
                        </button>
                      )}
                    </div>

                    {/* Relevance Scores Display */}
                    {activeMode === 'semantic' && typeof doc.similarity_score === 'number' && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          fontSize: '12px',
                          fontWeight: 700,
                          border: '1px solid #bae6fd',
                        }}
                        title={`Cosine similarity score: ${doc.similarity_score.toFixed(4)}`}
                      >
                        <Sparkles size={13} />
                        <span>
                          {Math.round(doc.similarity_score * 100)}% Semantic Match
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 500, color: '#0284c7' }}>
                          ({doc.similarity_score.toFixed(4)})
                        </span>
                      </div>
                    )}

                    {activeMode === 'hybrid' && typeof doc.combined_score === 'number' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 9px',
                            borderRadius: '6px',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            fontSize: '12px',
                            fontWeight: 700,
                            border: '1px solid #bae6fd',
                          }}
                          title={`Combined Score: ${doc.combined_score.toFixed(4)} (40% Keyword + 60% Semantic)`}
                        >
                          <Layers size={12} />
                          <span>Combined: {(doc.combined_score * 100).toFixed(1)}%</span>
                        </div>

                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            backgroundColor: '#ecfdf5',
                            color: '#047857',
                            border: '1px solid #a7f3d0',
                            fontWeight: 600,
                          }}
                          title={`AI Semantic Score: ${doc.semantic_score?.toFixed(4)}`}
                        >
                          AI: {((doc.semantic_score || 0) * 100).toFixed(0)}%
                        </span>

                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            backgroundColor: '#f8fafc',
                            color: '#475569',
                            border: '1px solid #e2e8f0',
                            fontWeight: 600,
                          }}
                          title={`Keyword Score: ${doc.keyword_score?.toFixed(4)}`}
                        >
                          KW: {((doc.keyword_score || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Extracted Snippet Context */}
                {doc.snippet ? (
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      fontSize: '13px',
                      lineHeight: '1.6',
                      color: '#334155',
                      fontFamily: 'monospace',
                      wordBreak: 'break-word',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {activeMode === 'semantic' ? (
                        <>
                          <Sparkles size={11} style={{ color: '#0284c7' }} />
                          <span>AI Contextually Matched Passage:</span>
                        </>
                      ) : activeMode === 'hybrid' ? (
                        <>
                          <Layers size={11} style={{ color: '#0284c7' }} />
                          <span>Hybrid Extracted Match Context:</span>
                        </>
                      ) : (
                        <>
                          <Search size={11} style={{ color: '#0284c7' }} />
                          <span>OCR Extracted Match Context:</span>
                        </>
                      )}
                    </div>
                    {activeMode === 'keyword'
                      ? highlightMatch(doc.snippet, searchedKeyword)
                      : doc.snippet}
                  </div>
                ) : (
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      fontSize: '12.5px',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Tag size={13} style={{ color: '#0284c7' }} />
                    <span>Matched on document filename or enterprise metadata attributes.</span>
                  </div>
                )}

                {/* Metadata badges */}
                {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                    {Object.entries(doc.metadata).map(([k, v]) => (
                      <span
                        key={k}
                        className="ds-badge ds-badge-gray"
                        style={{ fontSize: '11.5px', padding: '4px 9px' }}
                      >
                        <strong>{k.replace(/_/g, ' ')}:</strong>{' '}
                        {activeMode === 'keyword' ? highlightMatch(String(v), searchedKeyword) : String(v)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Initial Guidance State */
        <div
          className="ds-card"
          style={{
            padding: '36px 32px',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 32px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                backgroundColor: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Sparkles size={28} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              Multi-Modal Enterprise Document Discovery
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
              Choose a search mode above and enter any natural-language concept or keyword to discover documents across your organization.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '20px',
            }}
          >
            <div
              style={{
                padding: '20px',
                borderRadius: '10px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                <Sparkles size={18} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                Semantic AI Search
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
                Understands natural language and conceptual meaning. Finds documents matching your intent even when exact keywords differ.
              </p>
            </div>

            <div
              style={{
                padding: '20px',
                borderRadius: '10px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#f0fdf4',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                <Layers size={18} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                Hybrid Search
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
                Combines keyword relevance (40%) and AI semantic similarity (60%) for balanced, comprehensive recall and precision.
              </p>
            </div>

            <div
              style={{
                padding: '20px',
                borderRadius: '10px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                <Search size={18} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                Keyword Exact Search
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
                Traditional regex matching across filenames, OCR extracted body text, and dynamic custom metadata attributes.
              </p>
            </div>
          </div>
        </div>
      )}

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
          onSuccess={() => toast.success('Access requested successfully')}
        />
      )}
    </div>
  );
};

export default AdvancedSearch;
