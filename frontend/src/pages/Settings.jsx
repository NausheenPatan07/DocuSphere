import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import metadataApi from '../api/metadataApi';
import divisionsApi from '../api/divisionsApi';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Settings as SettingsIcon,
  Plus,
  Layers,
  Shield,
  Building2,
  CheckCircle2,
  AlertCircle,
  ListPlus,
  Tag,
  Key,
  Calendar,
  Type,
  Hash,
  AlignLeft,
  ChevronRight,
  Info,
} from 'lucide-react';

const Settings = () => {
  const { user, role, divisionName } = useAuth();
  const toast = useToast();

  const isAdmin = role === 'admin';

  const [activeTab, setActiveTab] = useState('metadata');
  const [fields, setFields] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Field Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState('text');
  const [newRequired, setNewRequired] = useState(false);
  const [newOptionsStr, setNewOptionsStr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fieldsRes, divsRes] = await Promise.all([
        metadataApi.getFields(),
        divisionsApi.getDivisions(),
      ]);

      if (fieldsRes.status === 'success') {
        setFields(fieldsRes.fields || []);
      }
      if (Array.isArray(divsRes)) {
        setDivisions(divsRes);
      }
    } catch (err) {
      console.error('Failed to load settings data', err);
      toast.error('Unable to fetch system configuration data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateField = async (e) => {
    e.preventDefault();
    if (!newKey.trim() || !newLabel.trim()) {
      setError('Key and Label are required');
      return;
    }

    if (newType === 'dropdown') {
      const opts = newOptionsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (opts.length === 0) {
        setError('Dropdown fields must have at least one option');
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        key: newKey.trim().toLowerCase().replace(/\s+/g, '_'),
        label: newLabel.trim(),
        type: newType,
        required: newRequired,
        options:
          newType === 'dropdown'
            ? newOptionsStr
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
      };

      const res = await metadataApi.createField(payload);
      if (res.status === 'success') {
        toast.success(`Metadata field "${payload.label}" registered successfully`);
        setShowAddModal(false);
        setNewKey('');
        setNewLabel('');
        setNewType('text');
        setNewRequired(false);
        setNewOptionsStr('');
        fetchData();
      } else {
        toast.error(res.message || 'Failed to create field');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create metadata field';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'number':
        return <Hash size={14} style={{ color: '#0284c7' }} />;
      case 'date':
        return <Calendar size={14} style={{ color: '#0d9488' }} />;
      case 'dropdown':
        return <ListPlus size={14} style={{ color: '#7c3aed' }} />;
      case 'textarea':
        return <AlignLeft size={14} style={{ color: '#f59e0b' }} />;
      default:
        return <Type size={14} style={{ color: '#475569' }} />;
    }
  };

  return (
    <div className="page-container">
      {/* Page Title */}
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title">Governance & Administration</h1>
        <p className="page-description">
          Manage dynamic document metadata schemas, view corporate divisions, and verify RBAC permissions.
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '24px',
        }}
      >
        <button
          onClick={() => setActiveTab('metadata')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'metadata' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'metadata' ? '#0284c7' : '#64748b',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <Layers size={16} />
          <span>Dynamic Metadata Fields</span>
        </button>

        <button
          onClick={() => setActiveTab('divisions')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'divisions' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'divisions' ? '#0284c7' : '#64748b',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <Building2 size={16} />
          <span>Corporate Divisions</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'roles' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'roles' ? '#0284c7' : '#64748b',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <Shield size={16} />
          <span>Permissions & Security</span>
        </button>
      </div>

      {/* Tab 1: Dynamic Metadata Schema */}
      {activeTab === 'metadata' && (
        <div>
          <div className="ds-card">
            <div className="ds-card-header">
              <div>
                <div className="ds-card-title">Configured Metadata Fields</div>
                <div className="ds-card-subtitle">
                  Active fields dynamically prompted on every document ingestion
                </div>
              </div>

              {isAdmin ? (
                <button
                  className="ds-btn ds-btn-primary ds-btn-sm"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus size={15} />
                  <span>Add Metadata Field</span>
                </button>
              ) : (
                <span className="ds-badge ds-badge-gray" style={{ fontSize: '12px' }}>
                  Admin privileges required to add fields
                </span>
              )}
            </div>

            <div className="ds-card-body" style={{ padding: 0 }}>
              {loading ? (
                <LoadingSpinner text="Fetching active metadata fields..." />
              ) : fields.length === 0 ? (
                <div className="ds-empty-state">
                  <div className="ds-empty-icon">
                    <Layers size={26} />
                  </div>
                  <div className="ds-empty-title">No metadata fields defined</div>
                  <div className="ds-empty-desc">
                    {isAdmin
                      ? 'Add your first enterprise metadata field to begin collecting structured document attributes.'
                      : 'The system administrator has not defined custom metadata attributes yet.'}
                  </div>
                </div>
              ) : (
                <div className="ds-table-container" style={{ border: 'none', borderRadius: 0 }}>
                  <table className="ds-table">
                    <thead>
                      <tr>
                        <th>Field Label</th>
                        <th>Database Key</th>
                        <th>Data Type</th>
                        <th>Validation</th>
                        <th>Options / Constraints</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field) => (
                        <tr key={field.id || field.key}>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{field.label}</div>
                          </td>
                          <td>
                            <code
                              style={{
                                backgroundColor: '#f1f5f9',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                color: '#0284c7',
                              }}
                            >
                              {field.key}
                            </code>
                          </td>
                          <td>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                textTransform: 'capitalize',
                                fontWeight: 600,
                              }}
                            >
                              {getTypeIcon(field.type)}
                              <span>{field.type}</span>
                            </div>
                          </td>
                          <td>
                            {field.required ? (
                              <span className="ds-badge ds-badge-red" style={{ fontSize: '11px' }}>
                                Required
                              </span>
                            ) : (
                              <span className="ds-badge ds-badge-gray" style={{ fontSize: '11px' }}>
                                Optional
                              </span>
                            )}
                          </td>
                          <td>
                            {field.type === 'dropdown' ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {(Array.isArray(field.options)
                                  ? field.options
                                  : typeof field.options === 'string'
                                  ? field.options.split(',')
                                  : []
                                ).map((opt) => (
                                  <span key={opt} className="ds-badge ds-badge-gray" style={{ fontSize: '11px' }}>
                                    {String(opt).trim()}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Standard Input</span>
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
        </div>
      )}

      {/* Tab 2: Corporate Divisions */}
      {activeTab === 'divisions' && (
        <div className="ds-card">
          <div className="ds-card-header">
            <div>
              <div className="ds-card-title">Corporate Divisions</div>
              <div className="ds-card-subtitle">
                Registered departments providing document compartmentalization
              </div>
            </div>
          </div>

          <div className="ds-card-body" style={{ padding: 0 }}>
            {loading ? (
              <LoadingSpinner text="Fetching divisions..." />
            ) : (
              <div className="ds-table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Division Name</th>
                      <th>Division Unique Identifier</th>
                      <th>Your Association</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divisions.map((div) => {
                      const isMyDivision = user?.division_id === div.id;

                      return (
                        <tr key={div.id}>
                          <td>
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
                                <Building2 size={16} />
                              </div>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                                {div.name} Division
                              </span>
                            </div>
                          </td>
                          <td>
                            <code
                              style={{
                                backgroundColor: '#f1f5f9',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                color: '#475569',
                              }}
                            >
                              {div.id}
                            </code>
                          </td>
                          <td>
                            {isMyDivision ? (
                              <span className="ds-badge ds-badge-green">
                                <CheckCircle2 size={12} /> Assigned Division
                              </span>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                External Division
                              </span>
                            )}
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
      )}

      {/* Tab 3: Permissions Matrix */}
      {activeTab === 'roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="ds-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              Your Active Session Privileges
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '16px' }}>
              <div style={{ padding: '14px 20px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', minWidth: '220px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Authenticated User
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{user?.email}</div>
              </div>

              <div style={{ padding: '14px 20px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', minWidth: '220px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  System Role
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0284c7', marginTop: '4px', textTransform: 'uppercase' }}>
                  {role}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {isAdmin
                    ? 'Full Administrator'
                    : role === 'division_admin'
                    ? 'Division Access Approver'
                    : 'Standard Ingestion & Search'}
                </div>
              </div>

              <div style={{ padding: '14px 20px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', minWidth: '220px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Assigned Department
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0d9488', marginTop: '4px' }}>
                  {divisionName || 'All Divisions'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Isolation Policy Enforced</div>
              </div>
            </div>
          </div>

          {/* Role Capabilities Matrix */}
          <div className="ds-card">
            <div className="ds-card-header">
              <div className="ds-card-title">Role-Based Access Control (RBAC) Matrix</div>
            </div>
            <div className="ds-card-body" style={{ padding: 0 }}>
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Capability</th>
                    <th>Employee</th>
                    <th>Division Admin</th>
                    <th>System Admin</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Upload & Process OCR Documents</td>
                    <td><CheckCircle2 size={16} style={{ color: '#10b981' }} /></td>
                    <td><CheckCircle2 size={16} style={{ color: '#10b981' }} /></td>
                    <td><CheckCircle2 size={16} style={{ color: '#10b981' }} /></td>
                  </tr>
                  <tr>
                    <td>Search Division OCR Text</td>
                    <td><CheckCircle2 size={16} style={{ color: '#10b981' }} /></td>
                    <td><CheckCircle2 size={16} style={{ color: '#10b981' }} /></td>
                    <td><CheckCircle2 size={16} style={{ color: '#10b981' }} /></td>
                  </tr>
                  <tr>
                    <td>Search Across All Divisions</td>
                    <td>—</td>
                    <td>—</td>
                    <td><CheckCircle2 size={16} style={{ color: '#10b981' }} /></td>
                  </tr>
                  <tr>
                    <td>Submit Cross-Division Access Request</td>
                    <td><CheckCircle2 size={16} style={{ color: '#10b981' }} /></td>
                    <td><CheckCircle2 size={16} style={{ color: '#10b981' }} /></td>
                    <td><CheckCircle2 size={16} style={{ color: '#10b981' }} /></td>
                  </tr>
                  <tr>
                    <td>Approve Division Access Requests</td>
                    <td>—</td>
                    <td><CheckCircle2 size={16} style={{ color: '#10b981' }} /> (Own division)</td>
                    <td><CheckCircle2 size={16} style={{ color: '#10b981' }} /> (All divisions)</td>
                  </tr>
                  <tr>
                    <td>Configure Metadata Fields</td>
                    <td>—</td>
                    <td>—</td>
                    <td><CheckCircle2 size={16} style={{ color: '#10b981' }} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Metadata Field Modal (Admin Only) */}
      {showAddModal && isAdmin && (
        <div className="ds-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="ds-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ds-modal-header">
              <div className="ds-modal-title">Create Dynamic Metadata Field</div>
            </div>

            <form onSubmit={handleCreateField}>
              <div className="ds-modal-body">
                {error && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      fontSize: '13px',
                      marginBottom: '16px',
                    }}
                  >
                    {error}
                  </div>
                )}

                <div className="ds-form-group">
                  <label className="ds-label ds-label-required">Field Label</label>
                  <input
                    type="text"
                    className="ds-input"
                    placeholder="e.g., Report Type, Department, Expense Code"
                    value={newLabel}
                    onChange={(e) => {
                      setNewLabel(e.target.value);
                      if (!newKey) {
                        setNewKey(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                      }
                    }}
                    required
                  />
                </div>

                <div className="ds-form-group">
                  <label className="ds-label ds-label-required">Field Key (database column)</label>
                  <input
                    type="text"
                    className="ds-input"
                    placeholder="e.g., report_type, expense_code"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    required
                  />
                  <div className="ds-help-text">
                    Unique identifier used in document JSON and OCR queries.
                  </div>
                </div>

                <div className="ds-form-group">
                  <label className="ds-label ds-label-required">Field Input Type</label>
                  <select
                    className="ds-select"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                  >
                    <option value="text">Text (Single-line input)</option>
                    <option value="textarea">Textarea (Multi-line paragraph)</option>
                    <option value="number">Number</option>
                    <option value="date">Date (YYYY-MM-DD)</option>
                    <option value="dropdown">Dropdown Select</option>
                  </select>
                </div>

                {newType === 'dropdown' && (
                  <div className="ds-form-group">
                    <label className="ds-label ds-label-required">
                      Dropdown Options (Comma-separated)
                    </label>
                    <input
                      type="text"
                      className="ds-input"
                      placeholder="e.g., Financial Audit, Technical Spec, HR Policy"
                      value={newOptionsStr}
                      onChange={(e) => setNewOptionsStr(e.target.value)}
                      required
                    />
                    <div className="ds-help-text">
                      Separate choices with commas.
                    </div>
                  </div>
                )}

                <div className="ds-form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13.5px', color: '#1e293b' }}>
                    <input
                      type="checkbox"
                      checked={newRequired}
                      onChange={(e) => setNewRequired(e.target.checked)}
                      style={{ accentColor: '#0284c7' }}
                    />
                    Mark as mandatory / required during document upload
                  </label>
                </div>
              </div>

              <div className="ds-modal-footer">
                <button
                  type="button"
                  className="ds-btn ds-btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ds-btn ds-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Creating Field...' : 'Save Metadata Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
