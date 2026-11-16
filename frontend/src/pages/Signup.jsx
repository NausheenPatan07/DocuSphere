import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import divisionsApi from '../api/divisionsApi';
import {
  FileText,
  User,
  Mail,
  Lock,
  Building2,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';

const Signup = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    division_id: '',
  });

  const [divisions, setDivisions] = useState([]);
  const [loadingDivisions, setLoadingDivisions] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchDivisions = async () => {
      try {
        const data = await divisionsApi.getDivisions();
        if (Array.isArray(data)) {
          setDivisions(data);
          if (data.length > 0) {
            setFormData((prev) => ({ ...prev, division_id: data[0].id }));
          }
        }
      } catch (err) {
        console.error('Failed to load divisions', err);
        toast.error('Could not load enterprise divisions list');
      } finally {
        setLoadingDivisions(false);
      }
    };

    fetchDivisions();
  }, [toast]);

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Corporate email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.division_id) {
      newErrors.division_id = 'Please select your department / division';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        division_id: formData.division_id,
      };

      const res = await register(payload);
      if (res.status === 'success') {
        toast.success('Registration successful! Please sign in with your credentials.');
        navigate('/login');
      } else {
        toast.error(res.message || 'Registration failed');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration error. Email may already be registered.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        position: 'relative',
        overflow: 'hidden',
        padding: '32px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          margin: 'auto',
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(12px)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '32px 36px 20px',
            borderBottom: '1px solid #f1f5f9',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              boxShadow: '0 8px 16px -4px rgba(2, 132, 199, 0.4)',
              marginBottom: '12px',
            }}
          >
            <FileText size={24} />
          </div>

          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Create Enterprise Account
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: '#64748b',
              marginTop: '4px',
              fontWeight: 500,
            }}
          >
            Join DocuSphere with division isolation and RBAC security
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 36px 36px' }}>
          <div className="ds-form-group">
            <label className="ds-label ds-label-required">Full Name</label>
            <div className="ds-input-icon-wrapper">
              <span className="ds-input-icon-left">
                <User size={17} />
              </span>
              <input
                type="text"
                className={`ds-input ds-input-with-left-icon ${errors.name ? 'ds-input-error' : ''}`}
                placeholder="Jane Doe"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: null });
                }}
                disabled={submitting}
              />
            </div>
            {errors.name && <div className="ds-error-text">{errors.name}</div>}
          </div>

          <div className="ds-form-group">
            <label className="ds-label ds-label-required">Corporate Email</label>
            <div className="ds-input-icon-wrapper">
              <span className="ds-input-icon-left">
                <Mail size={17} />
              </span>
              <input
                type="email"
                className={`ds-input ds-input-with-left-icon ${errors.email ? 'ds-input-error' : ''}`}
                placeholder="jane.doe@company.com"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: null });
                }}
                disabled={submitting}
              />
            </div>
            {errors.email && <div className="ds-error-text">{errors.email}</div>}
          </div>

          <div className="ds-form-group">
            <label className="ds-label ds-label-required">Department / Division</label>
            <div className="ds-input-icon-wrapper">
              <span className="ds-input-icon-left">
                <Building2 size={17} />
              </span>
              <select
                className={`ds-select ds-input-with-left-icon ${errors.division_id ? 'ds-input-error' : ''}`}
                value={formData.division_id}
                onChange={(e) => {
                  setFormData({ ...formData, division_id: e.target.value });
                  if (errors.division_id) setErrors({ ...errors, division_id: null });
                }}
                disabled={submitting || loadingDivisions}
              >
                {loadingDivisions ? (
                  <option value="">Loading divisions from server...</option>
                ) : (
                  divisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} Division
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="ds-help-text">
              Role is automatically provisioned as Division Employee by backend policy.
            </div>
            {errors.division_id && <div className="ds-error-text">{errors.division_id}</div>}
          </div>

          <div className="ds-grid-2" style={{ gap: '14px', marginBottom: '20px' }}>
            <div>
              <label className="ds-label ds-label-required">Password</label>
              <div className="ds-input-icon-wrapper">
                <span className="ds-input-icon-left">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`ds-input ds-input-with-left-icon ds-input-with-right-icon ${
                    errors.password ? 'ds-input-error' : ''
                  }`}
                  placeholder="Min 8 chars"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (errors.password) setErrors({ ...errors, password: null });
                  }}
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="ds-input-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <div className="ds-error-text">{errors.password}</div>}
            </div>

            <div>
              <label className="ds-label ds-label-required">Confirm Password</label>
              <div className="ds-input-icon-wrapper">
                <span className="ds-input-icon-left">
                  <Lock size={16} />
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`ds-input ds-input-with-left-icon ds-input-with-right-icon ${
                    errors.confirmPassword ? 'ds-input-error' : ''
                  }`}
                  placeholder="Repeat"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                  }}
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="ds-input-icon-right"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <div className="ds-error-text">{errors.confirmPassword}</div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="ds-btn ds-btn-primary"
            disabled={submitting}
            style={{ width: '100%', padding: '12px', fontSize: '14.5px' }}
          >
            {submitting ? (
              'Creating Enterprise Account...'
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>

          <div
            style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #f1f5f9',
              textAlign: 'center',
              fontSize: '13.5px',
              color: '#64748b',
            }}
          >
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 600, color: '#0284c7' }}>
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
