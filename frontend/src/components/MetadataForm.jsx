import React from 'react';
import { AlertCircle } from 'lucide-react';

const MetadataForm = ({ fields = [], values = {}, onChange, disabled, errors = {} }) => {
  if (!fields || fields.length === 0) {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          fontSize: '13px',
          color: '#64748b',
          textAlign: 'center',
        }}
      >
        No dynamic metadata fields currently configured in the system.
      </div>
    );
  }

  const handleInputChange = (key, val, type) => {
    let processedVal = val;
    if (type === 'number') {
      processedVal = val === '' ? '' : Number(val);
    }
    onChange({ ...values, [key]: processedVal }, key);
  };

  const getFieldOptions = (field) => {
    if (!field.options) return [];
    if (Array.isArray(field.options)) return field.options;
    if (typeof field.options === 'string') {
      return field.options.includes(',')
        ? field.options.split(',').map((s) => s.trim()).filter(Boolean)
        : field.options.split(/\s+/).filter(Boolean);
    }
    return [];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {fields.map((field) => {
        const fieldKey = field.key;
        const value = values[fieldKey] ?? '';
        const hasError = !!errors[fieldKey];
        const isRequired = field.required === true || field.required === 'true';
        const optionsList = getFieldOptions(field);

        return (
          <div key={field.id || fieldKey}>
            <label
              className="ds-label"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginBottom: '6px',
              }}
            >
              <span>{field.label}</span>
              {isRequired ? (
                <span
                  style={{
                    color: '#ef4444',
                    fontWeight: 700,
                    fontSize: '14px',
                    lineHeight: 1,
                  }}
                  title="Required field"
                >
                  *
                </span>
              ) : (
                <span
                  style={{
                    color: '#94a3b8',
                    fontSize: '12px',
                    fontWeight: 500,
                    marginLeft: '4px',
                  }}
                >
                  (Optional)
                </span>
              )}
            </label>

            {field.type === 'dropdown' ? (
              <select
                className={`ds-select ${hasError ? 'ds-input-error' : ''}`}
                value={value}
                onChange={(e) => handleInputChange(fieldKey, e.target.value, 'dropdown')}
                disabled={disabled}
              >
                <option value="">-- Select {field.label} --</option>
                {optionsList.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                className={`ds-textarea ${hasError ? 'ds-input-error' : ''}`}
                placeholder={`Enter ${field.label.toLowerCase()}...`}
                value={value}
                onChange={(e) => handleInputChange(fieldKey, e.target.value, 'textarea')}
                disabled={disabled}
                rows={3}
              />
            ) : field.type === 'number' ? (
              <input
                type="number"
                className={`ds-input ${hasError ? 'ds-input-error' : ''}`}
                placeholder={`Enter numeric ${field.label.toLowerCase()}...`}
                value={value}
                onChange={(e) => handleInputChange(fieldKey, e.target.value, 'number')}
                disabled={disabled}
              />
            ) : field.type === 'date' ? (
              <input
                type="date"
                className={`ds-input ${hasError ? 'ds-input-error' : ''}`}
                value={value}
                onChange={(e) => handleInputChange(fieldKey, e.target.value, 'date')}
                disabled={disabled}
              />
            ) : (
              <input
                type="text"
                className={`ds-input ${hasError ? 'ds-input-error' : ''}`}
                placeholder={`Enter ${field.label.toLowerCase()}...`}
                value={value}
                onChange={(e) => handleInputChange(fieldKey, e.target.value, 'text')}
                disabled={disabled}
              />
            )}

            {hasError && (
              <div
                className="ds-error-text"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '6px',
                  color: '#ef4444',
                  fontSize: '12.5px',
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{errors[fieldKey]}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MetadataForm;
