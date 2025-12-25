'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useApiClient } from '@/lib/api-client';
import { Poll } from '@/lib/types';
import { DataTable, Column } from '@/components/DataTable';
import { Paginator } from '@/components/Paginator';
import { useRouter } from 'next/navigation';

export default function PollsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const api = useApiClient();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  const columns: Column<Poll>[] = [
    {
      key: 'question',
      label: 'Question',
      render: (poll) => (
        <div style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {poll.question}
        </div>
      ),
    },
    {
      key: 'owner',
      label: 'Owner',
      render: (poll) => poll.owner?.handle || poll.ownerId,
    },
    {
      key: 'visibility',
      label: 'Visibility',
      render: (poll) => (
        <span className={`badge ${
          poll.visibility === 'PUBLIC' ? 'badge-success' :
          poll.visibility === 'FRIENDS_ONLY' ? 'badge-warning' :
          'badge-error'
        }`}>
          {poll.visibility}
        </span>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (poll) => poll.isContinuous ? 'Slider' : 'Discrete',
    },
    {
      key: 'responses',
      label: 'Responses',
      render: (poll) => (poll._count?.votes || 0) + (poll._count?.sliderResponses || 0),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (poll) => new Date(poll.createdAt).toLocaleDateString(),
    },
  ];

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    async function fetchPolls() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (searchQuery) params.set('query', searchQuery);
        if (nextCursor) params.set('cursor', nextCursor);
        params.set('limit', '20');

        const response = await api.get<Poll[]>(`/admin/polls?${params.toString()}`);
        setPolls(response.data);
        setNextCursor(response.meta?.nextCursor);
      } catch (err: any) {
        setError(err.message || 'Failed to load polls');
      } finally {
        setLoading(false);
      }
    }

    fetchPolls();
  }, [isSignedIn, isLoaded, searchQuery, nextCursor]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(query);
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
      <h1>Polls</h1>

      <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="input"
            placeholder="Search by question or ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn">Search</button>
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
          <DataTable
            data={polls}
            columns={columns}
            onRowClick={(poll) => router.push(`/polls/${poll.id}`)}
          />
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
