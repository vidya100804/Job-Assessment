'use client';
import { useEffect, useState, useCallback } from 'react';
import { api, Stats, Job, Worker } from '@/lib/api';
import { StatCard, ProgressBar, StatusBadge, WorkerBadge, Spinner, timeAgo, duration, Card } from '@/components/ui';
import { Briefcase, CheckCircle, XCircle, Loader, Clock, Server, Zap, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [s, j, w] = await Promise.all([api.getStats(), api.getJobs(), api.getWorkers()]);
      setStats(s); setJobs(j); setWorkers(w);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); const t = setInterval(fetchAll, 2500); return () => clearInterval(t); }, [fetchAll]);

  const running = jobs.filter(j => j.status === 'running').slice(0, 4);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
      <Spinner size={24} />
      <span style={{ color: 'var(--text-secondary)' }}>Connecting to JobFlow...</span>
    </div>
  );

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Live overview of your job execution platform</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Jobs" value={stats?.totalJobs ?? 0} icon={<Briefcase size={16} />} color="var(--accent-blue)" />
        <StatCard label="Running" value={stats?.running ?? 0} icon={<Loader size={16} />} color="var(--accent-blue)" sub="Active now" />
        <StatCard label="Queued" value={stats?.queued ?? 0} icon={<Clock size={16} />} color="var(--accent-amber)" sub="Waiting" />
        <StatCard label="Completed" value={stats?.completed ?? 0} icon={<CheckCircle size={16} />} color="var(--accent-green)" />
        <StatCard label="Failed" value={stats?.failed ?? 0} icon={<XCircle size={16} />} color="var(--accent-red)" />
        <StatCard label="Workers Online" value={`${stats?.onlineWorkers ?? 0}/${stats?.totalWorkers ?? 0}`} icon={<Server size={16} />} color="var(--accent-cyan)" sub={`${stats?.busyWorkers ?? 0} busy`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Active Jobs */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={15} color="var(--accent-blue)" /> Running Jobs
            </div>
            <Link href="/jobs" style={{ fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'none' }}>View all →</Link>
          </div>
          {running.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>No jobs running</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {running.map(job => (
                <Link key={job.id} href={`/jobs`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'var(--bg-surface)', borderRadius: 9, padding: '12px 14px',
                    border: '1px solid var(--border)', cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>{job.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--accent-blue)', fontFamily: 'JetBrains Mono, monospace' }}>{job.progress}%</div>
                    </div>
                    <ProgressBar value={job.progress} status={job.status} />
                    <div style={{ marginTop: 7, fontSize: 11, color: 'var(--text-muted)' }}>
                      {duration(job.startedAt)} elapsed · {job.type}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Workers Panel */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Server size={15} color="var(--accent-cyan)" /> Workers
            </div>
            <Link href="/workers" style={{ fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'none' }}>Manage →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {workers.slice(0, 5).map(w => (
              <div key={w.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--bg-surface)', borderRadius: 8, padding: '10px 12px',
                border: '1px solid var(--border)'
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{w.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    ✓ {w.completedJobs} · heartbeat {timeAgo(w.lastHeartbeat)}
                  </div>
                </div>
                <WorkerBadge status={w.status} />
              </div>
            ))}
            {workers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                No workers registered
              </div>
            )}
          </div>
        </Card>

        {/* Recent Failed */}
        <Card style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={15} color="var(--accent-red)" /> Recent Activity
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {jobs.slice(0, 6).map(job => (
              <div key={job.id} style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto auto auto',
                alignItems: 'center', gap: 16,
                padding: '10px 14px', background: 'var(--bg-surface)',
                borderRadius: 8, border: '1px solid var(--border)', fontSize: 13
              }}>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {job.name}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{job.type}</div>
                <StatusBadge status={job.status} />
                <div style={{ width: 80 }}><ProgressBar value={job.progress} status={job.status} /></div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>{timeAgo(job.createdAt)}</div>
              </div>
            ))}
            {jobs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                No jobs yet — submit your first job on the Jobs page
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
