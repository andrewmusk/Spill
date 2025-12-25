'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useApiClient } from '@/lib/api-client';
import { HealthData, DbHealthData } from '@/lib/types';
import { DetailPanel } from '@/components/DetailPanel';

export default function OverviewPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const api = useApiClient();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [dbHealth, setDbHealth] = useState<DbHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    async function fetchData() {
      try {
        setLoading(true);
        const [healthRes, dbRes] = await Promise.all([
          api.get<HealthData>('/admin/health'),
          api.get<DbHealthData>('/admin/db'),
        ]);
        setHealth(healthRes.data);
        setDbHealth(dbRes.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isSignedIn, isLoaded]);

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

  return (
    <div className="container">
      <h1>Spill Admin - Overview</h1>
      
      {health && (
        <DetailPanel
          data={{
            ok: health.ok,
            service: health.service,
            version: health.version,
            commitSha: health.commitSha,
            env: health.env,
            now: health.now,
          }}
          title="Platform Health"
        />
      )}

      {dbHealth && (
        <DetailPanel
          data={{
            ok: dbHealth.ok,
            dbHost: dbHealth.dbHost,
            dbName: dbHealth.dbName,
            latestMigration: dbHealth.migration.latestApplied,
            counts: dbHealth.counts,
          }}
          title="Database Health"
        />
      )}
    </div>
  );
}
