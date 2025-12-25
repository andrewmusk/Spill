'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useApiClient } from '@/lib/api-client';
import { Vote, SliderResponse } from '@/lib/types';
import { DataTable, Column } from '@/components/DataTable';
import { Paginator } from '@/components/Paginator';

export default function ResponsesPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const api = useApiClient();
  const [responses, setResponses] = useState<(Vote | SliderResponse)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [pollId, setPollId] = useState('');
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [filterUserId, setFilterUserId] = useState('');
  const [filterPollId, setFilterPollId] = useState('');

  const columns: Column<Vote | SliderResponse>[] = [
    {
      key: 'type',
      label: 'Type',
      render: (item) => ('value' in item ? 'Slider' : 'Vote'),
    },
    {
      key: 'poll',
      label: 'Poll',
      render: (item) => item.poll?.question || item.pollId,
    },
    {
      key: 'user',
      label: 'User',
      render: (item) => {
        if ('voter' in item) return item.voter?.handle || item.voterId;
        return item.user?.handle || item.userId;
      },
    },
    {
      key: 'response',
      label: 'Response',
      render: (item) => {
        if ('value' in item) return item.value;
        if ('option' in item) return item.option?.text || 'N/A';
        return 'N/A';
      },
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (item) => new Date(item.createdAt).toLocaleString(),
    },
  ];

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    async function fetchResponses() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (filterUserId) params.set('userId', filterUserId);
        if (filterPollId) params.set('pollId', filterPollId);
        if (nextCursor) params.set('cursor', nextCursor);
        params.set('limit', '20');

        const response = await api.get<(Vote | SliderResponse)[]>(
          `/admin/responses?${params.toString()}`
        );
        setResponses(response.data);
        setNextCursor(response.meta?.nextCursor);
      } catch (err: any) {
        setError(err.message || 'Failed to load responses');
      } finally {
        setLoading(false);
      }
    }

    fetchResponses();
  }, [isSignedIn, isLoaded, filterUserId, filterPollId, nextCursor]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setFilterUserId(userId);
    setFilterPollId(pollId);
    setNextCursor(undefined);
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
      <h1>Responses</h1>

      <form onSubmit={handleFilter} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            className="input"
            placeholder="Filter by User ID..."
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ flex: 1 }}
          />
          <input
            type="text"
            className="input"
            placeholder="Filter by Poll ID..."
            value={pollId}
            onChange={(e) => setPollId(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn">Filter</button>
        </div>
      </form>

      {error && (
        <div className="card" style={{ background: '#f8d7da', color: '#721c24' }}>
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <DataTable data={responses} columns={columns} />
          <Paginator
            nextCursor={nextCursor}
            onNext={() => {
              // nextCursor is already set, will trigger useEffect
            }}
          />
        </>
      )}
    </div>
  );
}
