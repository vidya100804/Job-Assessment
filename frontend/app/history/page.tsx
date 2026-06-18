'use client';
import { useEffect, useState, useCallback } from 'react';
import { api, Job } from '@/lib/api';
import { StatusBadge, PriorityBadge, ProgressBar, PageHeader, Spinner, EmptyState, Card, timeAgo, duration } from '@/components/ui';
import { Clock, CheckCircle, XCircle, BarChart2 } from 'lucide-react';

export default function HistoryPage() {
  const [history, setHistory] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try { setHistory(await api.getHistory()); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); const t = setInterval(fetch, 5000); return () => clearInterval(t); }, [fetch]);

  const completed = history.filter(j => j.status === 'completed');
  const failed = history.filter(j => j.status === 'failed');
  const avgDuration = completed.length
    ? Math.round(completed.reduce((sum, j) => sum + ((j.completedAt || 0) - (j.startedAt || 0)), 0) / completed.length / 1000)
    : 0;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <PageHeader title="Execution History" subtitle="Completed and failed job records" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Records', value: history.length, icon: <Clock size={15} />, color: 'var(--accent-blue)' },
          { label: 'Completed', value: completed.length, icon: <CheckCircle size={15} />, color: 'var(--accent-green)' },
          { label: 'Failed', value: failed.length, icon: <XCircle size={15} />, color: 'var(--accent-red)' },
          { label: 'Avg Duration', value: `${avgDuration}s`, icon: <BarChart2 size={15} />, color: 'var(--accent-cyan)' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
            padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
            </div>
            <div style={{ color, opacity: 0.7 }}>{icon}</div>
          </div>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        ) : history.length === 0 ? (
          <EmptyState icon={<Clock size={40} />} title="No history yet" description="Completed jobs will appear here." />
        ) : (
          <div>
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 100px 90px 80px 80px',
              padding: '10px 18px', borderBottom: '1px solid var(--border)',
              fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.5px', gap: 12
            }}>
              <span>Job</span><span>Type</span><span>Status</span>
              <span>Progress</span><span>Duration</span><span>Retries</span><span>Finished</span>
            </div>
            {history.map((job, i) => (
              <div key={job.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 100px 90px 80px 80px',
                padding: '13px 18px', gap: 12, alignItems: 'center',
                borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>{job.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{job.id.slice(0, 12)}…</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-surface)', padding: '2px 7px', borderRadius: 5, width: 'fit-content' }}>
                  {job.type}
                </div>
                <StatusBadge status={job.status} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <ProgressBar value={job.progress} status={job.status} />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{job.progress}%</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {duration(job.startedAt, job.completedAt)}
                </div>
                <div style={{ fontSize: 12, color: job.retryCount > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
                  {job.retryCount} / {job.maxRetries}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {job.completedAt ? timeAgo(job.completedAt) : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
