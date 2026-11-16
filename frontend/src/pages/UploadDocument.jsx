import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import metadataApi from '../api/metadataApi';
import documentApi from '../api/documentApi';
import UploadDropzone from '../components/UploadDropzone';
import MetadataForm from '../components/MetadataForm';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  UploadCloud,
  FileCheck2,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
} from 'lucide-react';

const UploadDocument = () => {
  const navigate = useNavigate();
  const { user, divisionName } = useAuth();
  const toast = useToast();

  const [file, setFile] = useState(null);
  const [fields, setFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [metadataValues, setMetadataValues] = useState({});
  const [formErrors, setFormErrors] = useState({});

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);

  // Fetch dynamic metadata fields from backend
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await metadataApi.getFields();
        const fieldsList =
          res?.data?.fields ||
          res?.fields ||
          (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);

        if (Array.isArray(fieldsList)) {
          setFields(fieldsList);
          // Set initial default values
          const initial = {};
          fieldsList.forEach((f) => {
            initial[f.key] = '';
          });
          setMetadataValues(initial);
        }
      } catch (err) {
        console.error('Failed to load metadata fields', err);
        toast.error('Unable to fetch dynamic metadata fields schema');
      } finally {
        setLoadingFields(false);
      }
    };

    fetchFields();
  }, [toast]);

  const handleMetadataChange = (newValues, changedKey) => {
    setMetadataValues(newValues);
    if (changedKey && formErrors[changedKey]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[changedKey];
        return next;
      });
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!file) {
      toast.error('Please select a file to upload');
      return false;
    }

    // Dynamic metadata validation following backend field.required property
    fields.forEach((field) => {
      const isRequired = field.required === true || field.required === 'true';
      const val = metadataValues[field.key];
      const isEmpty =
        val === undefined ||
        val === null ||
        (typeof val === 'string' && val.trim() === '');

      if (isRequired && isEmpty) {
        errors[field.key] = `${field.label} is required`;
      }
    });

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error('Please complete all required metadata fields before uploading');
      return false;
    }

    return true;
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      // Clean and sanitize metadata object
      const sanitizedMetadata = {};
      Object.entries(metadataValues).forEach(([k, v]) => {
        if (v !== '' && v !== undefined && v !== null) {
          sanitizedMetadata[k] = v;
        }
      });

      formData.append('metadata', JSON.stringify(sanitizedMetadata));

      const res = await documentApi.uploadDocument(formData, (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      if (res.status === 'success') {
        setUploadResult(res);
        toast.success(`"${res.filename}" uploaded successfully!`);
      } else {
        toast.error(res.message || 'Upload failed');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Document upload failed. Check file type and size.';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setUploadResult(null);
    setUploadProgress(0);
    setFormErrors({});
    const initial = {};
    fields.forEach((f) => {
      initial[f.key] = '';
    });
    setMetadataValues(initial);
  };

  return (
    <div className="page-container" style={{ maxWidth: '960px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title">Upload & Process Document</h1>
        <p className="page-description">
          Files are ingested into MongoDB GridFS, assigned to the {divisionName || 'User'} Division, and processed through OCR text extraction.
        </p>
      </div>

      {uploadResult ? (
        /* Upload Success Summary Card */
        <div className="ds-card" style={{ padding: '36px', textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#ecfdf5',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
            Document Uploaded & Processed Successfully!
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '520px', margin: '0 auto 24px' }}>
            File <strong style={{ color: '#0f172a' }}>{uploadResult.filename}</strong> has been secured in GridFS and cataloged under your division.
          </p>

          <div
            style={{
              maxWidth: '520px',
              margin: '0 auto 28px',
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '13px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Document ID:</span>
              <span style={{ fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>
                {uploadResult.document_id}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b' }}>OCR Pipeline Status:</span>
              <span className="ds-badge ds-badge-green">
                <CheckCircle2 size={12} /> {uploadResult.ocr_status || 'completed'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Extracted Text Index Size:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>
                {uploadResult.extracted_text_length ?? 0} characters
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button className="ds-btn ds-btn-secondary" onClick={handleReset}>
              <RotateCcw size={15} />
              <span>Upload Another File</span>
            </button>
            <Link to="/documents" className="ds-btn ds-btn-primary">
              <FileText size={15} />
              <span>View In Document Repository</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Upload Form */
        <form onSubmit={handleUploadSubmit}>
          <div className="ds-card" style={{ marginBottom: '24px' }}>
            <div className="ds-card-header">
              <div className="ds-card-title">
                <UploadCloud size={18} style={{ color: '#0284c7' }} />
                <span>Select Document File</span>
              </div>
            </div>
            <div className="ds-card-body">
              <UploadDropzone file={file} onFileSelect={setFile} disabled={uploading} />
            </div>
          </div>

          {/* Dynamic Metadata Form Card */}
          <div className="ds-card" style={{ marginBottom: '24px' }}>
            <div className="ds-card-header">
              <div>
                <div className="ds-card-title">
                  <Sparkles size={18} style={{ color: '#0d9488' }} />
                  <span>Dynamic Metadata Attributes</span>
                </div>
                <div className="ds-card-subtitle">
                  Configured enterprise schema fields will be associated with this file
                </div>
              </div>
            </div>
            <div className="ds-card-body">
              {loadingFields ? (
                <LoadingSpinner text="Loading dynamic metadata schema..." />
              ) : (
                <MetadataForm
                  fields={fields}
                  values={metadataValues}
                  onChange={handleMetadataChange}
                  disabled={uploading}
                  errors={formErrors}
                />
              )}
            </div>
          </div>

          {/* Upload Progress Bar */}
          {uploading && (
            <div
              className="ds-card"
              style={{
                padding: '20px',
                marginBottom: '24px',
                backgroundColor: '#f0f9ff',
                borderColor: '#bae6fd',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0369a1',
                }}
              >
                <span>Uploading and extracting OCR text...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#e0f2fe',
                  borderRadius: '999px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${uploadProgress}%`,
                    backgroundColor: '#0284c7',
                    borderRadius: '999px',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="ds-btn ds-btn-secondary"
              onClick={() => navigate('/documents')}
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ds-btn ds-btn-primary ds-btn-lg"
              disabled={uploading || !file}
            >
              {uploading ? (
                'Processing OCR & Saving...'
              ) : (
                <>
                  <UploadCloud size={18} />
                  <span>Upload & Index Document</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default UploadDocument;
