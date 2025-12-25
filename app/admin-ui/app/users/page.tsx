'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useApiClient } from '@/lib/api-client';
import { User } from '@/lib/types';
import { DataTable, Column } from '@/components/DataTable';
import { Paginator } from '@/components/Paginator';
import { useRouter } from 'next/navigation';

export default function UsersPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const api = useApiClient();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  const columns: Column<User>[] = [
    { key: 'handle', label: 'Handle' },
    { key: 'displayName', label: 'Display Name' },
    {
      key: 'isPrivate',
      label: 'Private',
      render: (user) => (user.isPrivate ? 'Yes' : 'No'),
    },
    {
      key: 'counts',
      label: 'Polls',
      render: (user) => user._count?.polls || 0,
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (user) => new Date(user.createdAt).toLocaleDateString(),
    },
  ];

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    async function fetchUsers() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (searchQuery) params.set('query', searchQuery);
        if (nextCursor) params.set('cursor', nextCursor);
        params.set('limit', '20');

        const response = await api.get<User[]>(`/admin/users?${params.toString()}`);
        setUsers(response.data);
        setNextCursor(response.meta?.nextCursor);
      } catch (err: any) {
        setError(err.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
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
      <h1>Users</h1>

      <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="input"
            placeholder="Search by handle, display name, or ID..."
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
            data={users}
            columns={columns}
            onRowClick={(user) => router.push(`/users/${user.id}`)}
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
