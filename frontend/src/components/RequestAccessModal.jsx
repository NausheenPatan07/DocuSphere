import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';
import accessApi from '../api/accessApi';
import { KeyRound, X, FileText, Send, Hash } from 'lucide-react';

const RequestAccessModal = ({ document = null, onClose, onSuccess }) => {
  const toast = useToast();
  
  const initialDocId = document?.id || document?.document_id || '';
  const [docId, setDocId] = useState(initialDocId);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!docId.trim()) {
      newErrors.docId = 'Document ID is required';
    } else if (!/^[0-9a-fA-F]{24}$/.test(docId.trim())) {
      newErrors.docId = 'Document ID must be a valid 24-character hexadecimal ID';
    }

    if (!reason.trim()) {
      newErrors.reason = 'Please provide a business justification for requesting access';
    } else if (reason.trim().length > 1000) {
      newErrors.reason = 'Reason cannot exceed 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setErrors({});

    try {
      const cleanDocId = docId.trim();
      const cleanReason = reason.trim();
      const res = await accessApi.requestAccess(cleanDocId, cleanReason);

      if (res.status === 'success') {
        toast.success('Access request submitted successfully! Awaiting division approval.');
        if (onSuccess) onSuccess(res);
        onClose();
      } else {
        toast.error(res.message || 'Failed to request access');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Access request failed. Please check the Document ID.';
      toast.error(msg);
      setErrors({ form: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const isPreFilled = Boolean(document?.id || document?.document_id);

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ds-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              <KeyRound size={20} />
            </div>
            <div>
              <div className="ds-modal-title">Request Cross-Division Access</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Submit justification to division administrators for authorization
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

        <form onSubmit={handleSubmit}>
          <div className="ds-modal-body">
            {errors.form && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  fontSize: '13px',
                  marginBottom: '16px',
                  border: '1px solid #fecaca',
                }}
              >
                {errors.form}
              </div>
            )}

            {isPreFilled ? (
              /* Pre-filled document info preview */
              <div
                style={{
                  padding: '14px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <FileText size={22} style={{ color: '#0284c7', flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 700,
                      color: '#0f172a',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {document.filename || 'Document'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                    ID: {docId}
                  </div>
                </div>
              </div>
            ) : (
              /* Standalone Document ID Input */
              <div className="ds-form-group">
                <label className="ds-label ds-label-required">Document ID (Target File)</label>
                <div className="ds-input-icon-wrapper">
                  <span className="ds-input-icon-left">
                    <Hash size={16} />
                  </span>
                  <input
                    type="text"
                    className={`ds-input ds-input-with-left-icon ${errors.docId ? 'ds-input-error' : ''}`}
                    placeholder="Enter 24-character hexadecimal Document ID (e.g., 6afafb9077ddc792c96922c4)"
                    value={docId}
                    onChange={(e) => {
                      setDocId(e.target.value);
                      if (errors.docId) setErrors((prev) => ({ ...prev, docId: null }));
                    }}
                    disabled={submitting}
                  />
                </div>
                {errors.docId && <div className="ds-error-text">{errors.docId}</div>}
                <div className="ds-help-text">
                  Provide the unique identifier of the cross-division document you require access to.
                </div>
              </div>
            )}

            {/* Business Justification */}
            <div className="ds-form-group" style={{ marginBottom: 0 }}>
              <label className="ds-label ds-label-required">
                Reason / Business Justification
              </label>
              <textarea
                className={`ds-textarea ${errors.reason ? 'ds-input-error' : ''}`}
                rows={4}
                placeholder="Explain why you require cross-division access (e.g., cross-department financial audit, technical collaboration, regulatory compliance review)..."
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (errors.reason) setErrors((prev) => ({ ...prev, reason: null }));
                }}
                maxLength={1000}
                disabled={submitting}
              />
              {errors.reason && <div className="ds-error-text">{errors.reason}</div>}
              <div className="ds-help-text" style={{ textAlign: 'right' }}>
                {reason.length}/1000 characters
              </div>
            </div>
          </div>

          <div className="ds-modal-footer">
            <button
              type="button"
              className="ds-btn ds-btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ds-btn ds-btn-primary"
              disabled={submitting || !docId.trim() || !reason.trim()}
            >
              {submitting ? (
                'Submitting Request...'
              ) : (
                <>
                  <Send size={15} />
                  <span>Submit Access Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestAccessModal;
