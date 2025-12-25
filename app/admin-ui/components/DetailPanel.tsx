import React from 'react';

interface DetailPanelProps {
  data: Record<string, any>;
  title?: string;
}

export function DetailPanel({ data, title }: DetailPanelProps) {
  const renderValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span style={{ color: '#999' }}>null</span>;
    }
    if (typeof value === 'boolean') {
      return <span className={`badge ${value ? 'badge-success' : 'badge-error'}`}>{String(value)}</span>;
    }
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return (
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {value.map((item, idx) => (
              <li key={idx}>{renderValue(item)}</li>
            ))}
          </ul>
        );
      }
      return (
        <div style={{ marginLeft: '16px' }}>
          {Object.entries(value).map(([k, v]) => (
            <div key={k} style={{ marginBottom: '8px' }}>
              <strong>{k}:</strong> {renderValue(v)}
            </div>
          ))}
        </div>
      );
    }
    return String(value);
  };

  return (
    <div className="card">
      {title && <h2>{title}</h2>}
      <div>
        {Object.entries(data).map(([key, value]) => (
          <div key={key} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #eee' }}>
            <strong style={{ display: 'block', marginBottom: '4px', color: '#666' }}>{key}:</strong>
            <div>{renderValue(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
