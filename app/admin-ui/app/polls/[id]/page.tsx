'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApiClient } from '@/lib/api-client';
import { PollDetails } from '@/lib/types';
import { DetailPanel } from '@/components/DetailPanel';

export default function PollDetailPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const params = useParams();
  const router = useRouter();
  const api = useApiClient();
  const [poll, setPoll] = useState<PollDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollId = params.id as string;

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    async function fetchPoll() {
      try {
        setLoading(true);
        const response = await api.get<PollDetails>(`/admin/polls/${pollId}`);
        setPoll(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load poll');
      } finally {
        setLoading(false);
      }
    }

    fetchPoll();
  }, [isSignedIn, isLoaded, pollId]);

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

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  if (error) {
    return (
      <div className="container">
        <div className="card">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="container">
        <div className="card">
          <h2>Poll not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <button className="btn" onClick={() => router.back()} style={{ marginBottom: '20px' }}>
        ← Back
      </button>
      <h1>Poll: {poll.question}</h1>

      <DetailPanel
        data={{
          id: poll.id,
          question: poll.question,
          owner: poll.owner?.handle || poll.ownerId,
          visibility: poll.visibility,
          isContinuous: poll.isContinuous,
          privateLinkToken: poll.privateLinkToken,
          expiresAt: poll.expiresAt,
          createdAt: poll.createdAt,
        }}
        title="Poll Metadata"
      />

      <DetailPanel
        data={poll.counts}
        title="Counts"
      />

      {poll.options && poll.options.length > 0 && (
        <div className="card">
          <h2>Options</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Text</th>
                <th>Votes</th>
              </tr>
            </thead>
            <tbody>
              {poll.options.map((opt) => (
                <tr key={opt.id}>
                  <td>{opt.position}</td>
                  <td>{opt.text}</td>
                  <td>{opt._count.votes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <h2>Response Distribution</h2>
        <DetailPanel data={poll.responseDistribution} />
      </div>

      <div style={{ marginTop: '20px' }}>
        <a href={`/polls/${pollId}/responses`} className="btn">
          View All Responses
        </a>
        <a
          href={`/simulator?viewerUserId=&targetType=poll&targetId=${pollId}`}
          className="btn"
          style={{ marginLeft: '10px' }}
        >
          Test Visibility
        </a>
      </div>
    </div>
  );
}
