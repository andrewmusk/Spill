'use client';

import { useAuth } from '@clerk/nextjs';
import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApiClient } from '@/lib/api-client';
import { VisibilitySimulationResult } from '@/lib/types';
import { JsonView } from '@/components/JsonView';

function SimulatorContent() {
  const { isSignedIn, isLoaded } = useAuth();
  const searchParams = useSearchParams();
  const api = useApiClient();
  const [viewerUserId, setViewerUserId] = useState('');
  const [targetType, setTargetType] = useState<'poll' | 'response' | 'profile'>('poll');
  const [targetId, setTargetId] = useState('');
  const [result, setResult] = useState<VisibilitySimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize from URL params
  useEffect(() => {
    const viewerUserIdParam = searchParams.get('viewerUserId');
    const targetTypeParam = searchParams.get('targetType');
    const targetIdParam = searchParams.get('targetId');
    
    if (viewerUserIdParam) setViewerUserId(viewerUserIdParam);
    if (targetTypeParam) setTargetType(targetTypeParam as 'poll' | 'response' | 'profile');
    if (targetIdParam) setTargetId(targetIdParam);
  }, [searchParams]);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewerUserId || !targetId) {
      setError('Please provide viewer user ID and target ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.post<VisibilitySimulationResult>('/admin/simulate/visibility', {
        viewerUserId,
        target: {
          type: targetType,
          id: targetId,
        },
      });
      setResult(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to simulate visibility');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return <div className="container">Loading...</div>;
  }

  if (!isSignedIn) {
    return (
      <div className="container">
        <h1>Spill Admin</h1>
        <p>Please sign in to access the admin dashboard.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Visibility Simulator</h1>

      <div className="card">
        <h2>Simulate Visibility Check</h2>
        <form onSubmit={handleSimulate}>
          <div className="form-group">
            <label>Viewer User ID</label>
            <input
              type="text"
              className="input"
              value={viewerUserId}
              onChange={(e) => setViewerUserId(e.target.value)}
              placeholder="Enter user ID who is viewing"
              required
            />
          </div>

          <div className="form-group">
            <label>Target Type</label>
            <select
              className="input"
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as 'poll' | 'response' | 'profile')}
            >
              <option value="poll">Poll</option>
              <option value="response">Response</option>
              <option value="profile">Profile</option>
            </select>
          </div>

          <div className="form-group">
            <label>Target ID</label>
            <input
              type="text"
              className="input"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="Enter poll/response/profile ID"
              required
            />
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Simulating...' : 'Simulate'}
          </button>
        </form>
      </div>

      {error && (
        <div className="card" style={{ background: '#f8d7da', color: '#721c24' }}>
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <>
          <div className="card">
            <h2>Result</h2>
            <div style={{ marginBottom: '16px' }}>
              <strong>Allowed: </strong>
              <span className={`badge ${result.allowed ? 'badge-success' : 'badge-error'}`}>
                {result.allowed ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <strong>Reason: </strong>
              <code>{result.reason}</code>
            </div>
          </div>

          <JsonView data={result.debug} title="Debug Information" />
        </>
      )}
    </div>
  );
}

export default function SimulatorPage() {
  return (
    <Suspense fallback={<div className="container">Loading...</div>}>
      <SimulatorContent />
    </Suspense>
  );
}
