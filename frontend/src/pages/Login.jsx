import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  FileText,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        toast.success(`Welcome back, ${res.user.name}!`);
        const destination = location.state?.from?.pathname || '/dashboard';
        navigate(destination, { replace: true });
      } else {
        toast.error(res.message || 'Invalid email or password');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to connect to server. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
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
      }}
    >
      {/* Decorative ambient background lights */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(2, 132, 199, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-5%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(13, 148, 136, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 20px',
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '460px',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(12px)',
            borderRadius: '20px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '36px 36px 24px',
              borderBottom: '1px solid #f1f5f9',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                boxShadow: '0 8px 16px -4px rgba(2, 132, 199, 0.4)',
                marginBottom: '16px',
              }}
            >
              <FileText size={26} />
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
              Docu<span style={{ color: '#0284c7' }}>Sphere</span>
            </h1>
            <p
              style={{
                fontSize: '13.5px',
                color: '#64748b',
                marginTop: '6px',
                fontWeight: 500,
              }}
            >
              Division-Aware Enterprise Document Management
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: '28px 36px 36px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label className="ds-label ds-label-required">Corporate Email</label>
              <div className="ds-input-icon-wrapper">
                <span className="ds-input-icon-left">
                  <Mail size={17} />
                </span>
                <input
                  type="email"
                  className={`ds-input ds-input-with-left-icon ${errors.email ? 'ds-input-error' : ''}`}
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                  }}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
              {errors.email && <div className="ds-error-text">{errors.email}</div>}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <label className="ds-label ds-label-required" style={{ margin: 0 }}>
                  Password
                </label>
              </div>
              <div className="ds-input-icon-wrapper">
                <span className="ds-input-icon-left">
                  <Lock size={17} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`ds-input ds-input-with-left-icon ds-input-with-right-icon ${
                    errors.password ? 'ds-input-error' : ''
                  }`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                  }}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="ds-input-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <div className="ds-error-text">{errors.password}</div>}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
                fontSize: '13px',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#475569',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ borderRadius: '4px', cursor: 'pointer', accentColor: '#0284c7' }}
                />
                Remember this workstation
              </label>
            </div>

            <button
              type="submit"
              className="ds-btn ds-btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '12px', fontSize: '14.5px' }}
            >
              {loading ? (
                'Signing in...'
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>

            <div
              style={{
                marginTop: '24px',
                paddingTop: '20px',
                borderTop: '1px solid #f1f5f9',
                textAlign: 'center',
                fontSize: '13.5px',
                color: '#64748b',
              }}
            >
              Don't have an enterprise account?{' '}
              <Link to="/signup" style={{ fontWeight: 600, color: '#0284c7' }}>
                Register here
              </Link>
            </div>

            <div
              style={{
                marginTop: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '12px',
                color: '#94a3b8',
              }}
            >
              <ShieldCheck size={14} style={{ color: '#0d9488' }} />
              <span>TLS Secured & Role Isolated Gateway</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
