import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import auditApi from '../api/auditApi';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  History,
  ShieldAlert,
  ShieldCheck,
  Filter,
  RefreshCw,
  FileText,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  Download,
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Eye,
  X,
  Copy,
  Check,
} from 'lucide-react';

const AuditLogs = () => {
  const { user, role } = useAuth();
  const toast = useToast();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [actionFilter, setActionFilter] = useState('all');
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal inspection
  const [selectedLog, setSelectedLog] = useState(null);
  const [copied, setCopied] = useState(false);

  // Fetch audit logs from backend
  const fetchLogs = useCallback(
    async (currentPage = page, currentAction = actionFilter, currentLimit = limit) => {
      setLoading(true);
      setError(null);
      try {
        const response = await auditApi.getAuditLogs({
          page: currentPage,
          limit: currentLimit,
          action: currentAction,
        });

        if (response && response.status === 'success') {
          const logRecords = response.logs || response.audit_logs || [];
          setLogs(logRecords);
          setTotalRecords(response.total ?? logRecords.length);
          setTotalPages(response.total_pages ?? Math.ceil((response.total || 1) / currentLimit));
          setPage(response.page ?? currentPage);
        } else {
          setError(response?.message || 'Failed to retrieve audit logs');
        }
      } catch (err) {
        console.error('Audit logs fetch error:', err);
        const errMsg =
          err.response?.data?.message ||
          (err.response?.status === 403
            ? 'Access forbidden. Administrator role required.'
            : 'Unable to connect to audit logging service.');
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    },
    [page, actionFilter, limit]
  );

  useEffect(() => {
    fetchLogs(page, actionFilter, limit);
  }, [page, actionFilter, limit, fetchLogs]);

  const handleActionChange = (e) => {
    const newAction = e.target.value;
    setActionFilter(newAction);
    setPage(1); // reset to page 1 on filter change
  };

  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value, 10);
    setLimit(newLimit);
    setPage(1);
  };

  const handleResetFilters = () => {
    setActionFilter('all');
    setPage(1);
  };

  const handleCopyJson = (details) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(details, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Event details copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Timestamp Formatter
  const formatTimestamp = (isoString) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return String(isoString);
    }
  };

  // Action badge renderer
  const getActionBadge = (action) => {
    switch (action) {
      case 'document_uploaded':
        return (
          <span className="ds-badge ds-badge-green" style={{ fontSize: '11.5px' }}>
            <UploadCloud size={12} /> Upload
          </span>
        );
      case 'document_downloaded':
        return (
          <span className="ds-badge ds-badge-blue" style={{ fontSize: '11.5px' }}>
            <Download size={12} /> Download
          </span>
        );
      case 'access_request_created':
        return (
          <span className="ds-badge ds-badge-amber" style={{ fontSize: '11.5px' }}>
            <KeyRound size={12} /> Request Created
          </span>
        );
      case 'access_request_approved':
        return (
          <span className="ds-badge ds-badge-green" style={{ fontSize: '11.5px' }}>
            <CheckCircle2 size={12} /> Approved
          </span>
        );
      case 'access_request_rejected':
        return (
          <span className="ds-badge ds-badge-red" style={{ fontSize: '11.5px' }}>
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return (
          <span className="ds-badge ds-badge-gray" style={{ fontSize: '11.5px' }}>
            <Info size={12} /> {action?.replace(/_/g, ' ') || 'Event'}
          </span>
        );
    }
  };

  // Actor Role badge renderer
  const getRoleBadge = (roleStr) => {
    switch (roleStr) {
      case 'admin':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fecaca',
            }}
          >
            Admin
          </span>
        );
      case 'division_admin':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fde68a',
            }}
          >
            Div Admin
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              border: '1px solid #bae6fd',
            }}
          >
            Employee
          </span>
        );
    }
  };

  // Details Summary Helper
  const renderDetailsSummary = (log) => {
    const details = log.details || {};
    if (!details || Object.keys(details).length === 0) {
      return <span style={{ color: '#94a3b8', fontSize: '12px' }}>No additional metadata</span>;
    }

    if (log.action === 'document_uploaded') {
      return (
        <span style={{ fontSize: '12px', color: '#475569' }}>
          OCR: <strong>{details.ocr_status || 'completed'}</strong>
          {details.extracted_text_length !== undefined && ` (${details.extracted_text_length} chars)`}
        </span>
      );
    }

    if (log.action === 'document_downloaded') {
      const accessLabel = details.access_type === 'same_division' ? 'Same Division' : 'Cross-Division';
      return (
        <span style={{ fontSize: '12px', color: '#475569' }}>
          Type: <strong>{accessLabel}</strong>
        </span>
      );
    }

    if (log.action === 'access_request_created' && details.reason) {
      return (
        <span
          style={{
            fontSize: '12px',
            color: '#475569',
            maxWidth: '180px',
            display: 'inline-block',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={details.reason}
        >
          Reason: <em>"{details.reason}"</em>
        </span>
      );
    }

    if (details.status) {
      return (
        <span style={{ fontSize: '12px', color: '#475569' }}>
          Status: <strong>{details.status}</strong>
        </span>
      );
    }

    return (
      <span style={{ fontSize: '12px', color: '#64748b' }}>
        {Object.keys(details).length} field(s) recorded
      </span>
    );
  };

  // RBAC Guard
  if (role && role !== 'admin') {
    return (
      <div className="page-container" style={{ paddingTop: '80px', textAlign: 'center' }}>
        <div className="ds-card" style={{ maxWidth: '500px', margin: '0 auto', padding: '36px 24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <ShieldAlert size={28} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Access Restricted
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
            The Audit Log Viewer is exclusively restricted to System Administrators. Your current role is (
            <strong>{role}</strong>).
          </p>
          <a href="/dashboard" className="ds-btn ds-btn-primary">
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
            }}
          >
            <History size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="page-title" style={{ margin: 0 }}>
                Admin Audit Trail
              </h1>
              <span className="ds-badge ds-badge-blue">
                <ShieldCheck size={12} /> Compliance & Security
              </span>
            </div>
            <p className="page-description">
              Tamper-evident system activity log recording uploads, downloads, and access-control governance.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="ds-btn ds-btn-secondary"
            onClick={() => fetchLogs(page, actionFilter, limit)}
            disabled={loading}
            title="Refresh audit events"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Control Card */}
      <div
        className="ds-card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} style={{ color: '#64748b' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Filter Event:</span>
          </div>

          <select
            className="ds-select"
            value={actionFilter}
            onChange={handleActionChange}
            style={{ width: '220px', height: '38px', fontSize: '13px', padding: '6px 12px' }}
          >
            <option value="all">All Event Types</option>
            <option value="document_uploaded">Document Uploaded</option>
            <option value="document_downloaded">Document Downloaded</option>
            <option value="access_request_created">Access Request Created</option>
            <option value="access_request_approved">Access Request Approved</option>
            <option value="access_request_rejected">Access Request Rejected</option>
          </select>

          {actionFilter !== 'all' && (
            <button
              onClick={handleResetFilters}
              className="ds-btn ds-btn-secondary ds-btn-sm"
              style={{ height: '38px' }}
            >
              <X size={14} />
              <span>Clear Filter</span>
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Per page:</span>
          <select
            className="ds-select"
            value={limit}
            onChange={handleLimitChange}
            style={{ width: '80px', height: '38px', fontSize: '13px', padding: '6px 8px' }}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>

          <span
            style={{
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#0284c7',
              backgroundColor: '#e0f2fe',
              padding: '6px 12px',
              borderRadius: '6px',
            }}
          >
            Total: {totalRecords} events
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="ds-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <LoadingSpinner text="Retrieving verified audit logs from MongoDB..." size={36} />
        </div>
      ) : error ? (
        /* Error State */
        <div
          className="ds-card"
          style={{
            padding: '40px 24px',
            textAlign: 'center',
            borderColor: '#fecaca',
            backgroundColor: '#fffaf0',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <AlertCircle size={26} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Failed to Load Audit Logs
          </h3>
          <p style={{ fontSize: '13.5px', color: '#64748b', maxWidth: '440px', margin: '0 auto 20px' }}>
            {error}
          </p>
          <button
            className="ds-btn ds-btn-primary ds-btn-sm"
            onClick={() => fetchLogs(page, actionFilter, limit)}
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      ) : logs.length === 0 ? (
        /* Empty State */
        <div className="ds-card" style={{ padding: '64px 20px', textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <History size={28} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
            No Audit Records Found
          </h3>
          <p style={{ fontSize: '13.5px', color: '#64748b', maxWidth: '400px', margin: '0 auto 20px' }}>
            {actionFilter !== 'all'
              ? `There are no recorded audit logs matching the event filter "${actionFilter}".`
              : 'No audit records have been captured yet in the system.'}
          </p>
          {actionFilter !== 'all' && (
            <button className="ds-btn ds-btn-secondary ds-btn-sm" onClick={handleResetFilters}>
              Reset Action Filter
            </button>
          )}
        </div>
      ) : (
        /* Audit Records Table */
        <div className="ds-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="ds-table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="ds-table">
              <thead>
                <tr>
                  <th style={{ width: '180px' }}>Timestamp</th>
                  <th style={{ width: '150px' }}>Action</th>
                  <th style={{ width: '220px' }}>Actor</th>
                  <th style={{ width: '110px' }}>Role</th>
                  <th style={{ width: '240px' }}>Target Document</th>
                  <th>Event Details</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const logId = log.id || log._id;
                  return (
                    <tr key={logId}>
                      {/* Timestamp */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
                          <span
                            style={{
                              fontSize: '12.5px',
                              fontWeight: 600,
                              color: '#1e293b',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatTimestamp(log.created_at)}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td>{getActionBadge(log.action)}</td>

                      {/* Actor (Name & Email) */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: '13px',
                              color: '#0f172a',
                            }}
                          >
                            {log.actor_name || 'System / Anonymous'}
                          </span>
                          <span
                            style={{
                              fontSize: '11.5px',
                              color: '#64748b',
                            }}
                          >
                            {log.actor_email || log.actor_id || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Actor Role */}
                      <td>{getRoleBadge(log.actor_role)}</td>

                      {/* Document Filename */}
                      <td>
                        {log.document_filename ? (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: '#0f172a',
                              fontWeight: 600,
                              fontSize: '13px',
                              maxWidth: '220px',
                            }}
                            title={log.document_filename}
                          >
                            <FileText size={14} style={{ color: '#0284c7', flexShrink: 0 }} />
                            <span
                              style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {log.document_filename}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '13px' }}>—</span>
                        )}
                      </td>

                      {/* Event Details Summary */}
                      <td>{renderDetailsSummary(log)}</td>

                      {/* Action Inspect Button */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="ds-btn ds-btn-secondary ds-btn-sm"
                          style={{ padding: '4px 8px', fontSize: '11.5px' }}
                          onClick={() => setSelectedLog(log)}
                          title="Inspect raw audit payload"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              fontSize: '13px',
              color: '#64748b',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              Showing{' '}
              <strong>{(page - 1) * limit + 1}</strong> to{' '}
              <strong>{Math.min(page * limit, totalRecords)}</strong> of{' '}
              <strong>{totalRecords}</strong> events
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="ds-btn ds-btn-secondary ds-btn-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              <span
                style={{
                  fontWeight: 600,
                  color: '#0f172a',
                  padding: '4px 10px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '6px',
                }}
              >
                Page {page} of {Math.max(totalPages, 1)}
              </span>

              <button
                className="ds-btn ds-btn-secondary ds-btn-sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Detail Inspection Modal */}
      {selectedLog && (
        <div className="ds-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div
            className="ds-modal"
            style={{ maxWidth: '640px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="ds-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <History size={18} />
                </div>
                <div>
                  <h3 className="ds-modal-title" style={{ fontSize: '16px', margin: 0 }}>
                    Audit Event Details
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    ID: {selectedLog.id || selectedLog._id}
                  </span>
                </div>
              </div>
              <button
                className="ds-btn-icon"
                onClick={() => setSelectedLog(null)}
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="ds-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Event Metadata Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                }}
              >
                <div>
                  <span style={{ color: '#64748b', fontSize: '11.5px', display: 'block' }}>
                    ACTION TYPE
                  </span>
                  <div style={{ marginTop: '4px' }}>{getActionBadge(selectedLog.action)}</div>
                </div>

                <div>
                  <span style={{ color: '#64748b', fontSize: '11.5px', display: 'block' }}>
                    TIMESTAMP
                  </span>
                  <span style={{ fontWeight: 600, color: '#0f172a', marginTop: '4px', display: 'block' }}>
                    {formatTimestamp(selectedLog.created_at)}
                  </span>
                </div>

                <div>
                  <span style={{ color: '#64748b', fontSize: '11.5px', display: 'block' }}>
                    ACTOR NAME & ROLE
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                      {selectedLog.actor_name || 'System / Anonymous'}
                    </span>
                    {getRoleBadge(selectedLog.actor_role)}
                  </div>
                </div>

                <div>
                  <span style={{ color: '#64748b', fontSize: '11.5px', display: 'block' }}>
                    ACTOR EMAIL
                  </span>
                  <span style={{ color: '#0f172a', marginTop: '4px', display: 'block' }}>
                    {selectedLog.actor_email || '—'}
                  </span>
                </div>

                <div>
                  <span style={{ color: '#64748b', fontSize: '11.5px', display: 'block' }}>
                    TARGET DOCUMENT
                  </span>
                  <span style={{ fontWeight: 600, color: '#0f172a', marginTop: '4px', display: 'block' }}>
                    {selectedLog.document_filename || selectedLog.document_id || 'None'}
                  </span>
                </div>

                <div>
                  <span style={{ color: '#64748b', fontSize: '11.5px', display: 'block' }}>
                    ACCESS REQUEST ID
                  </span>
                  <span style={{ color: '#0f172a', marginTop: '4px', display: 'block' }}>
                    {selectedLog.access_request_id || 'None'}
                  </span>
                </div>
              </div>

              {/* Event Details JSON */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                    Action Details Payload
                  </span>
                  <button
                    className="ds-btn ds-btn-secondary ds-btn-sm"
                    style={{ fontSize: '11.5px', padding: '3px 8px' }}
                    onClick={() => handleCopyJson(selectedLog.details)}
                  >
                    {copied ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>

                <pre
                  style={{
                    margin: 0,
                    padding: '14px',
                    borderRadius: '8px',
                    backgroundColor: '#0f172a',
                    color: '#38bdf8',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono, monospace)',
                    overflowX: 'auto',
                    maxHeight: '220px',
                    lineHeight: '1.5',
                  }}
                >
                  {JSON.stringify(selectedLog.details || {}, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="ds-modal-footer">
              <button className="ds-btn ds-btn-secondary" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
