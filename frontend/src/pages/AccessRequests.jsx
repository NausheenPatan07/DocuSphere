import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import accessApi from '../api/accessApi';
import documentApi from '../api/documentApi';
import LoadingSpinner from '../components/LoadingSpinner';
import RequestAccessModal from '../components/RequestAccessModal';
import {
  KeyRound,
  Inbox,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Building,
  User,
  FileText,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
  Plus,
} from 'lucide-react';

const AccessRequests = () => {
  const { user, role } = useAuth();
  const toast = useToast();

  const isReviewer = role === 'admin' || role === 'division_admin';

  const [activeTab, setActiveTab] = useState('my-requests');
  const [myRequests, setMyRequests] = useState([]);
  const [inboxRequests, setInboxRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // 1. Fetch user's own requests
      const response = await accessApi.getMyRequests();
      // Ensure frontend reads requests array from response.data.requests
      const requestsList =
        response?.data?.requests ||
        response?.requests ||
        (Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []);

      setMyRequests(Array.isArray(requestsList) ? requestsList : []);

      // 2. If reviewer, fetch approval inbox
      if (isReviewer) {
        try {
          const inboxRes = await accessApi.getInbox();
          const inboxList =
            inboxRes?.data?.requests ||
            inboxRes?.requests ||
            (Array.isArray(inboxRes?.data) ? inboxRes.data : Array.isArray(inboxRes) ? inboxRes : []);
          setInboxRequests(Array.isArray(inboxList) ? inboxList : []);
        } catch (e) {
          console.error('Failed to load inbox requests', e);
        }
      }
    } catch (err) {
      console.error('Error fetching access requests', err);
      toast.error('Unable to fetch access requests from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [role]);

  const handleDecision = async (requestId, decision) => {
    setProcessingId(requestId);
    try {
      const res = await accessApi.decideRequest(requestId, decision);
      if (res.status === 'success') {
        toast.success(`Request ${decision} successfully`);
        // Refresh requests
        fetchRequests();
      } else {
        toast.error(res.message || `Failed to ${decision} request`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || `Unable to ${decision} request`;
      toast.error(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownloadApproved = async (documentId, filename) => {
    try {
      const response = await documentApi.downloadDocument(documentId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || `doc-${documentId}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Downloaded approved document');
    } catch (err) {
      toast.error('Could not download file.');
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase().trim();
    switch (s) {
      case 'approved':
        return (
          <span className="ds-badge ds-badge-green">
            <CheckCircle2 size={12} /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="ds-badge ds-badge-red">
            <XCircle size={12} /> Rejected
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="ds-badge ds-badge-amber">
            <Clock size={12} /> Pending Review
          </span>
        );
    }
  };

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
        <div>
          <h1 className="page-title">Cross-Division Access Management</h1>
          <p className="page-description">
            Audit-tracked cross-division requests governed by division administrators
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="ds-btn ds-btn-secondary"
            onClick={fetchRequests}
            disabled={loading}
            title="Refresh requests"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            className="ds-btn ds-btn-primary"
            onClick={() => setShowNewRequestModal(true)}
            id="new-access-request-btn"
          >
            <Plus size={16} />
            <span>New Access Request</span>
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '24px',
        }}
      >
        <button
          onClick={() => setActiveTab('my-requests')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'my-requests' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'my-requests' ? '#0284c7' : '#64748b',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Send size={16} />
          <span>My Requests</span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '11px',
              backgroundColor: activeTab === 'my-requests' ? '#e0f2fe' : '#f1f5f9',
              color: activeTab === 'my-requests' ? '#0284c7' : '#64748b',
            }}
          >
            {myRequests.length}
          </span>
        </button>

        {isReviewer && (
          <button
            onClick={() => setActiveTab('inbox')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'inbox' ? '3px solid #0284c7' : '3px solid transparent',
              color: activeTab === 'inbox' ? '#0284c7' : '#64748b',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Inbox size={16} />
            <span>Requests Inbox</span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                backgroundColor: inboxRequests.length > 0 ? '#fee2e2' : '#f1f5f9',
                color: inboxRequests.length > 0 ? '#991b1b' : '#64748b',
              }}
            >
              {inboxRequests.length}
            </span>
          </button>
        )}
      </div>

      {/* Tab 1: My Requests */}
      {activeTab === 'my-requests' && (
        <div className="ds-card">
          <div className="ds-card-header">
            <div>
              <div className="ds-card-title">My Outgoing Access Requests</div>
              <div className="ds-card-subtitle">
                Requests you submitted to inspect or download documents from other divisions
              </div>
            </div>
          </div>

          <div className="ds-card-body" style={{ padding: 0 }}>
            {loading ? (
              <LoadingSpinner text="Fetching your submitted requests..." />
            ) : myRequests.length === 0 ? (
              <div className="ds-empty-state">
                <div className="ds-empty-icon">
                  <KeyRound size={26} />
                </div>
                <div className="ds-empty-title">No access requests submitted</div>
                <div className="ds-empty-desc">
                  When you need to access a document belonging to another division, submit an access request with the document ID.
                </div>
                <button
                  className="ds-btn ds-btn-primary ds-btn-sm"
                  onClick={() => setShowNewRequestModal(true)}
                  style={{ marginTop: '8px' }}
                >
                  <Plus size={15} />
                  <span>New Access Request</span>
                </button>
              </div>
            ) : (
              <div className="ds-table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Owner Division ID</th>
                      <th>Justification / Reason</th>
                      <th>Submitted Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.map((req) => (
                      <tr key={req.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FileText size={17} style={{ color: '#0284c7', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                {req.filename || `Doc ${req.document_id.substring(0, 8)}...`}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                                ID: {req.document_id}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="ds-badge ds-badge-gray" style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                            {req.document_owner_division_id}
                          </span>
                        </td>

                        <td style={{ maxWidth: '300px' }}>
                          <div
                            style={{
                              fontSize: '13px',
                              color: '#334155',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={req.reason}
                          >
                            {req.reason || 'No reason provided'}
                          </div>
                        </td>

                        <td style={{ fontSize: '12.5px', color: '#64748b' }}>
                          {req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}
                        </td>

                        <td>{getStatusBadge(req.status)}</td>

                        <td style={{ textAlign: 'right' }}>
                          {String(req.status || '').toLowerCase() === 'approved' && (
                            <button
                              className="ds-btn ds-btn-success ds-btn-sm"
                              onClick={() => handleDownloadApproved(req.document_id, req.filename)}
                            >
                              <Download size={13} />
                              <span>Download</span>
                            </button>
                          )}
                          {String(req.status || '').toLowerCase() === 'pending' && (
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Awaiting review</span>
                          )}
                          {String(req.status || '').toLowerCase() === 'rejected' && (
                            <span style={{ fontSize: '12px', color: '#ef4444' }}>Declined</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Requests Inbox (Admins & Division Admins only) */}
      {activeTab === 'inbox' && isReviewer && (
        <div className="ds-card">
          <div className="ds-card-header">
            <div>
              <div className="ds-card-title">Cross-Division Approval Inbox</div>
              <div className="ds-card-subtitle">
                Pending requests requiring your division administrative decision
              </div>
            </div>
          </div>

          <div className="ds-card-body" style={{ padding: 0 }}>
            {loading ? (
              <LoadingSpinner text="Fetching review inbox..." />
            ) : inboxRequests.length === 0 ? (
              <div className="ds-empty-state">
                <div className="ds-empty-icon" style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}>
                  <CheckCircle2 size={26} />
                </div>
                <div className="ds-empty-title">Inbox Zero! No pending requests</div>
                <div className="ds-empty-desc">
                  All cross-division access requests for your department have been reviewed.
                </div>
              </div>
            ) : (
              <div className="ds-table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Requester</th>
                      <th>Requested Document</th>
                      <th>Business Justification</th>
                      <th>Request Date</th>
                      <th style={{ textAlign: 'right' }}>Review Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inboxRequests.map((req) => (
                      <tr key={req.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: '#f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#0284c7',
                                fontWeight: 700,
                                fontSize: '12px',
                              }}
                            >
                              {req.requester?.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                {req.requester?.name || 'Unknown User'}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                {req.requester?.email || req.requested_by}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={16} style={{ color: '#0284c7' }} />
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                {req.filename || 'Document'}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                                ID: {req.document_id.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ maxWidth: '320px' }}>
                          <div
                            style={{
                              fontSize: '13px',
                              color: '#334155',
                              backgroundColor: '#f8fafc',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            "{req.reason || 'No justification provided'}"
                          </div>
                        </td>

                        <td style={{ fontSize: '12.5px', color: '#64748b' }}>
                          {req.created_at ? new Date(req.created_at).toLocaleString() : '—'}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button
                              className="ds-btn ds-btn-success ds-btn-sm"
                              onClick={() => handleDecision(req.id, 'approved')}
                              disabled={processingId === req.id}
                            >
                              <CheckCircle2 size={14} />
                              <span>Approve</span>
                            </button>
                            <button
                              className="ds-btn ds-btn-danger ds-btn-sm"
                              onClick={() => handleDecision(req.id, 'rejected')}
                              disabled={processingId === req.id}
                            >
                              <XCircle size={14} />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Standalone New Access Request Modal */}
      {showNewRequestModal && (
        <RequestAccessModal
          onClose={() => setShowNewRequestModal(false)}
          onSuccess={() => fetchRequests()}
        />
      )}
    </div>
  );
};

export default AccessRequests;
