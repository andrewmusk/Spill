'use client';

import React, { useState } from 'react';

interface JsonViewProps {
  data: any;
  title?: string;
  defaultExpanded?: boolean;
}

export function JsonView({ data, title, defaultExpanded = false }: JsonViewProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          marginBottom: expanded ? '16px' : 0,
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <h3 style={{ margin: 0 }}>{title || 'Debug Data'}</h3>
        <span>{expanded ? '▼' : '▶'}</span>
      </div>
      {expanded && (
        <pre
          style={{
            background: '#f8f8f8',
            padding: '16px',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px',
            lineHeight: '1.5',
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
