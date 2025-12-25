'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApiClient } from '@/lib/api-client';
import { Vote, SliderResponse } from '@/lib/types';
import { DataTable, Column } from '@/components/DataTable';
import { Paginator } from '@/components/Paginator';

export default function PollResponsesPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const params = useParams();
  const router = useRouter();
  const api = useApiClient();
  const [responses, setResponses] = useState<(Vote | SliderResponse)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  const pollId = params.id as string;

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    async function fetchResponses() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (nextCursor) params.set('cursor', nextCursor);
        params.set('limit', '20');

        const response = await api.get<(Vote | SliderResponse)[]>(
          `/admin/polls/${pollId}/responses?${params.toString()}`
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
  }, [isSignedIn, isLoaded, pollId, nextCursor]);

  const columns: Column<Vote | SliderResponse>[] = [
    {
      key: 'type',
      label: 'Type',
      render: (item) => ('value' in item ? 'Slider' : 'Vote'),
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
      <button className="btn" onClick={() => router.back()} style={{ marginBottom: '20px' }}>
        ← Back
      </button>
      <h1>Poll Responses</h1>

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
