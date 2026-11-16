import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import documentApi from '../api/documentApi';
import accessApi from '../api/accessApi';
import StatCard from '../components/StatCard';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import RequestAccessModal from '../components/RequestAccessModal';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Files,
  UploadCloud,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  KeyRound,
  ArrowUpRight,
  Shield,
  Eye,
  Download,
  Building2,
  FileText,
  Sparkles,
} from 'lucide-react';

const Dashboard = () => {
  const { user, role, divisionName } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [inboxRequests, setInboxRequests] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [requestDocModal, setRequestDocModal] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch accessible documents
      const docsRes = await documentApi.getDocuments();
      if (docsRes.status === 'success') {
        setDocuments(docsRes.documents || []);
      }

      // 2. Fetch my access requests
      const myReqRes = await accessApi.getMyRequests();
      const myReqList =
        myReqRes?.data?.requests ||
        myReqRes?.requests ||
        (Array.isArray(myReqRes?.data) ? myReqRes.data : Array.isArray(myReqRes) ? myReqRes : []);
      setMyRequests(Array.isArray(myReqList) ? myReqList : []);

      // 3. If admin or division admin, also fetch inbox for comprehensive admin counts
      if (role === 'admin' || role === 'division_admin') {
        try {
          const inboxRes = await accessApi.getInbox();
          const inboxList =
            inboxRes?.data?.requests ||
            inboxRes?.requests ||
            (Array.isArray(inboxRes?.data) ? inboxRes.data : Array.isArray(inboxRes) ? inboxRes : []);
          setInboxRequests(Array.isArray(inboxList) ? inboxList : []);
        } catch (e) {
          // Non-critical if user is not authorized
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
      toast.error('Unable to synchronize live dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [role]);

  // Derived metrics from verified backend API responses
  const totalDocsCount = documents.length;
  const userUploadsCount = documents.filter((d) => d.uploaded_by === user?.name).length;
  const pendingRequestsCount = myRequests.filter((r) => r.status === 'pending').length;
  const approvedRequestsCount = myRequests.filter((r) => r.status === 'approved').length;

  const recentDocs = documents.slice(0, 5);

  const handleDownload = async (doc) => {
    try {
      const response = await documentApi.downloadDocument(doc.id);
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
        toast.error('Failed to download document');
      }
    }
  };

  return (
    <div className="page-container">
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '16px',
          padding: '28px 32px',
          color: '#ffffff',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              fontSize: '12px',
              fontWeight: 700,
              marginBottom: '10px',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          >
            <Sparkles size={13} />
            <span>AI-Powered Document Intelligence</span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
            Welcome back, {user?.name || 'DocuSphere User'}
          </h2>
          <p style={{ fontSize: '13.5px', color: '#94a3b8', marginTop: '6px' }}>
            Operating under {divisionName ? `the ${divisionName} Division` : 'Enterprise'} with isolated OCR text indexing.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/upload" className="ds-btn ds-btn-primary">
            <UploadCloud size={16} />
            <span>Upload Document</span>
          </Link>
          <Link
            to="/search"
            className="ds-btn ds-btn-secondary"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}
          >
            <Search size={16} />
            <span>Advanced Search</span>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="ds-grid-4" style={{ marginBottom: '28px' }}>
        <StatCard
          title="Total Accessible Documents"
          value={totalDocsCount}
          icon={Files}
          color="blue"
          description={role === 'admin' ? 'Enterprise-wide documents' : `${divisionName || 'Division'} repository`}
          loading={loading}
        />
        <StatCard
          title="Uploaded By You"
          value={userUploadsCount}
          icon={UploadCloud}
          color="emerald"
          description="Indexed with OCR extraction"
          loading={loading}
        />
        <StatCard
          title="Pending Access Requests"
          value={pendingRequestsCount}
          icon={Clock}
          color="amber"
          description="Awaiting division review"
          loading={loading}
        />
        <StatCard
          title="Approved Cross-Division"
          value={approvedRequestsCount}
          icon={CheckCircle2}
          color="purple"
          description="Granted cross-division access"
          loading={loading}
        />
      </div>

      {/* Content Grid */}
      <div className="ds-grid-3" style={{ gap: '24px' }}>
        {/* Recent Documents Table (2 columns wide) */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="ds-card">
            <div className="ds-card-header">
              <div>
                <div className="ds-card-title">
                  <Files size={18} style={{ color: '#0284c7' }} />
                  <span>Recent Documents</span>
                </div>
                <div className="ds-card-subtitle">
                  Latest files ingested and OCR-indexed in your division
                </div>
              </div>
              <Link to="/documents" className="ds-btn ds-btn-outline ds-btn-sm">
                <span>View All</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>

            <div className="ds-card-body" style={{ padding: 0 }}>
              {loading ? (
                <LoadingSpinner text="Fetching document repository..." />
              ) : recentDocs.length === 0 ? (
                <div className="ds-empty-state">
                  <div className="ds-empty-icon">
                    <FileText size={24} />
                  </div>
                  <div className="ds-empty-title">No documents uploaded yet</div>
                  <div className="ds-empty-desc">
                    Upload your first document to extract OCR text and configure dynamic metadata.
                  </div>
                  <Link to="/upload" className="ds-btn ds-btn-primary ds-btn-sm">
                    <UploadCloud size={15} />
                    <span>Upload Now</span>
                  </Link>
                </div>
              ) : (
                <div className="ds-table-container" style={{ border: 'none', borderRadius: 0 }}>
                  <table className="ds-table">
                    <thead>
                      <tr>
                        <th>Filename</th>
                        <th>Type / Metadata</th>
                        <th>OCR Status</th>
                        <th>Upload Date</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentDocs.map((doc) => {
                        const meta = doc.metadata || {};
                        const reportType = meta.report_type || meta.department || 'Standard';

                        return (
                          <tr key={doc.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FileText size={17} style={{ color: '#0284c7', flexShrink: 0 }} />
                                <div>
                                  <div
                                    style={{
                                      fontWeight: 600,
                                      color: '#0f172a',
                                      maxWidth: '220px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title={doc.filename}
                                  >
                                    {doc.filename}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                                    By {doc.uploaded_by}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="ds-badge ds-badge-gray">
                                {reportType}
                              </span>
                            </td>
                            <td>
                              {doc.ocr_status === 'completed' ? (
                                <span className="ds-badge ds-badge-green">
                                  <CheckCircle2 size={11} /> Completed
                                </span>
                              ) : doc.ocr_status === 'processing' ? (
                                <span className="ds-badge ds-badge-blue">
                                  <Clock size={11} /> In Progress
                                </span>
                              ) : (
                                <span className="ds-badge ds-badge-amber">
                                  <AlertCircle size={11} /> {doc.ocr_status || 'Pending'}
                                </span>
                              )}
                            </td>
                            <td style={{ fontSize: '12.5px', color: '#475569' }}>
                              {doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : '—'}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  className="ds-btn ds-btn-secondary ds-btn-sm"
                                  onClick={() => setSelectedDoc(doc)}
                                  title="Inspect details"
                                >
                                  <Eye size={13} />
                                </button>
                                <button
                                  className="ds-btn ds-btn-primary ds-btn-sm"
                                  onClick={() => handleDownload(doc)}
                                  title="Download"
                                >
                                  <Download size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions & Governance Overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Quick Actions Card */}
          <div className="ds-card">
            <div className="ds-card-header">
              <div className="ds-card-title">Quick Actions</div>
            </div>
            <div className="ds-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link
                to="/upload"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  transition: 'all 0.15s ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#0284c7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
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
                  }}
                >
                  <UploadCloud size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700 }}>Upload New Document</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    Process PDF / Image through OCR
                  </div>
                </div>
              </Link>

              <Link
                to="/search"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  transition: 'all 0.15s ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#0284c7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#f0fdf4',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Search size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700 }}>OCR Keyword Search</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    Search inside scanned pages
                  </div>
                </div>
              </Link>

              <Link
                to="/access-requests"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  transition: 'all 0.15s ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#0284c7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#fffbeb',
                    color: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <KeyRound size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700 }}>Cross-Division Access</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    Track request approvals & inbox
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Division Security Card */}
          <div className="ds-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Shield size={20} style={{ color: '#0284c7' }} />
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                Division Isolation Active
              </div>
            </div>
            <p style={{ fontSize: '12.5px', color: '#64748b', lineHeight: '1.5', margin: 0 }}>
              Documents are encrypted and compartmentalized by division boundaries. Cross-division retrieval is strictly gated behind an auditable administrative approval workflow.
            </p>
          </div>
        </div>
      </div>

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
          onSuccess={() => fetchDashboardData()}
        />
      )}
    </div>
  );
};

export default Dashboard;
