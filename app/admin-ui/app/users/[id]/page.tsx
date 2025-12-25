'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApiClient } from '@/lib/api-client';
import { UserDetails } from '@/lib/types';
import { DetailPanel } from '@/components/DetailPanel';

export default function UserDetailPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const params = useParams();
  const router = useRouter();
  const api = useApiClient();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = params.id as string;

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    async function fetchUser() {
      try {
        setLoading(true);
        const response = await api.get<UserDetails>(`/admin/users/${userId}`);
        setUser(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load user');
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [isSignedIn, isLoaded, userId]);

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

  if (!user) {
    return (
      <div className="container">
        <div className="card">
          <h2>User not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <button className="btn" onClick={() => router.back()} style={{ marginBottom: '20px' }}>
        ← Back
      </button>
      <h1>User: {user.handle}</h1>

      <DetailPanel
        data={{
          id: user.id,
          clerkId: user.clerkId,
          handle: user.handle,
          displayName: user.displayName,
          bio: user.bio,
          isPrivate: user.isPrivate,
          hideVotesFromFriends: user.hideVotesFromFriends,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }}
        title="Profile"
      />

      <DetailPanel
        data={user.counts}
        title="Counts"
      />

      <DetailPanel
        data={user.relationships}
        title="Relationships"
      />
    </div>
  );
}
