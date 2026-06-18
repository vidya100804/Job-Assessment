'use client';
import { useEffect, useState, useCallback } from 'react';
import { api, Job, JobPriority, JobStatus } from '@/lib/api';
import {
  StatusBadge, PriorityBadge, ProgressBar, Button, PageHeader,
  Spinner, EmptyState, timeAgo, duration, Card
} from '@/components/ui';
import {
  Plus, X, RefreshCw, StopCircle, ListTodo, ChevronDown,
  Terminal, Clock, Cpu, AlertCircle
} from 'lucide-react';

const JOB_TYPES = ['data-processing', 'ml-training', 'report-generation', 'file-export', 'etl-pipeline', 'image-resize', 'email-batch', 'cleanup'];
const PRIORITIES: JobPriority[] = ['low', 'normal', 'high', 'critical'];
const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Queued', value: 'queued' },
  { label: 'Running', value: 'running' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Retrying', value: 'retrying' },
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Job | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const fetch = useCallback(async () => {
    try {
      const j = await api.getJobs();
      setJobs(j);
      if (selected) setSelected(j.find(x => x.id === selected.id) || null);
    } catch {}
    finally { setLoading(false); }
  }, [selected]);

  useEffect(() => { fetch(); const t = setInterval(fetch, 2500); return () => clearInterval(t); }, [fetch]);

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);

  const doCancel = async (id: string) => {
    setActionLoading(id + '-cancel');
    await api.cancelJob(id).catch(() => {});
    setActionLoading('');
    fetch();
  };

  const doRetry = async (id: string) => {
    setActionLoading(id + '-retry');
    await api.retryJob(id).catch(() => {});
    setActionLoading('');
    fetch();
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <PageHeader
        title="Jobs"
        subtitle="Submit and manage execution jobs across the platform"
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus size={15} /> Submit Job
          </Button>
        }
      />

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{
              padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: 500,
              cursor: 'pointer', border: '1px solid',
              background: filter === f.value ? 'rgba(59,130,246,0.15)' : 'var(--bg-card)',
              color: filter === f.value ? 'var(--accent-blue)' : 'var(--text-secondary)',
              borderColor: filter === f.value ? 'rgba(59,130,246,0.4)' : 'var(--border)',
              transition: 'all 0.15s', fontFamily: 'inherit'
            }}
          >
            {f.label}
            <span style={{
              marginLeft: 6, fontSize: 11, padding: '1px 5px', borderRadius: 4,
              background: filter === f.value ? 'rgba(59,130,246,0.2)' : 'var(--bg-surface)',
              color: 'inherit'
            }}>
              {f.value === 'all' ? jobs.length : jobs.filter(j => j.status === f.value).length}
            </span>
          </button>
        ))}
      </div>

      {/* Job Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<ListTodo size={40} />} title="No jobs found" description="Submit a job or change the filter to see results." />
        ) : (
          <div>
            {/* Table Header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 100px 80px 80px auto',
              padding: '10px 18px', borderBottom: '1px solid var(--border)',
              fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.5px', gap: 12
            }}>
              <span>Job</span><span>Type</span><span>Status</span>
              <span>Progress</span><span>Priority</span><span>Created</span><span>Actions</span>
            </div>
            {filtered.map((job, i) => (
              <div
                key={job.id}
                onClick={() => setSelected(job)}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 100px 80px 80px auto',
                  padding: '13px 18px', gap: 12, alignItems: 'center',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', transition: 'background 0.1s',
                  background: selected?.id === job.id ? 'rgba(59,130,246,0.06)' : 'transparent',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                onMouseLeave={e => (e.currentTarget.style.background = selected?.id === job.id ? 'rgba(59,130,246,0.06)' : 'transparent')}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>{job.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                    {job.id.slice(0, 12)}…
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-surface)', padding: '2px 7px', borderRadius: 5, width: 'fit-content' }}>
                  {job.type}
                </div>
                <StatusBadge status={job.status} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <ProgressBar value={job.progress} status={job.status} />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{job.progress}%</span>
                </div>
                <PriorityBadge priority={job.priority} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(job.createdAt)}</div>
                <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                  {(job.status === 'queued' || job.status === 'running') && (
                    <button
                      onClick={() => doCancel(job.id)}
                      disabled={actionLoading === job.id + '-cancel'}
                      title="Cancel"
                      style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                        color: '#ef4444', borderRadius: 6, padding: '5px 8px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center'
                      }}
                    >
                      <StopCircle size={13} />
                    </button>
                  )}
                  {job.status === 'failed' && (
                    <button
                      onClick={() => doRetry(job.id)}
                      disabled={actionLoading === job.id + '-retry'}
                      title="Retry"
                      style={{
                        background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
                        color: 'var(--accent-blue)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center'
                      }}
                    >
                      <RefreshCw size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Side Drawer - Job Detail */}
      {selected && (
        <JobDetailDrawer
          job={selected}
          onClose={() => setSelected(null)}
          onCancel={doCancel}
          onRetry={doRetry}
        />
      )}

      {/* Submit Modal */}
      {showForm && <SubmitJobModal onClose={() => setShowForm(false)} onSubmit={fetch} />}
    </div>
  );
}

// ── Job Detail Drawer ─────────────────────────────────────────────────────────
function JobDetailDrawer({ job, onClose, onCancel, onRetry }: {
  job: Job; onClose: () => void;
  onCancel: (id: string) => void; onRetry: (id: string) => void;
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }}
      />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 440,
        background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
        zIndex: 50, overflow: 'auto', display: 'flex', flexDirection: 'column',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{job.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontFamily: 'JetBrains Mono, monospace' }}>{job.id}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Status row */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <StatusBadge status={job.status} />
            <PriorityBadge priority={job.priority} />
          </div>

          {/* Progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Progress</span>
              <span style={{ fontSize: 12, color: 'var(--accent-blue)', fontFamily: 'JetBrains Mono, monospace' }}>{job.progress}%</span>
            </div>
            <ProgressBar value={job.progress} status={job.status} />
          </div>

          {/* Meta grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Type', value: job.type, icon: <Cpu size={12} /> },
              { label: 'Retries', value: `${job.retryCount} / ${job.maxRetries}`, icon: <RefreshCw size={12} /> },
              { label: 'Created', value: timeAgo(job.createdAt), icon: <Clock size={12} /> },
              { label: 'Duration', value: duration(job.startedAt, job.completedAt), icon: <Clock size={12} /> },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                  {icon} {label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{value}</div>
              </div>
            ))}
          </div>

          {job.errorMessage && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <AlertCircle size={12} /> Error
              </div>
              <div style={{ fontSize: 12, color: '#fca5a5' }}>{job.errorMessage}</div>
            </div>
          )}

          {/* Payload */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 8 }}>Payload</div>
            <pre style={{
              background: 'var(--bg-surface)', borderRadius: 8, padding: '10px 12px',
              border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-secondary)',
              overflow: 'auto', fontFamily: 'JetBrains Mono, monospace', margin: 0, maxHeight: 120
            }}>
              {JSON.stringify(job.payload, null, 2)}
            </pre>
          </div>

          {/* Logs */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Terminal size={12} /> Execution Logs
            </div>
            <div style={{
              background: '#050810', borderRadius: 8, padding: '10px 12px',
              border: '1px solid var(--border)', maxHeight: 200, overflow: 'auto'
            }}>
              {job.logs.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No logs yet</div>
              ) : [...job.logs].reverse().map((log, i) => (
                <div key={i} style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', marginBottom: 4, display: 'flex', gap: 8 }}>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span style={{ color: log.level === 'error' ? '#f87171' : log.level === 'warn' ? '#fbbf24' : '#6ee7b7' }}>
                    [{log.level.toUpperCase()}]
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{log.message}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            {(job.status === 'queued' || job.status === 'running') && (
              <Button variant="danger" onClick={() => onCancel(job.id)}>
                <StopCircle size={14} /> Cancel
              </Button>
            )}
            {job.status === 'failed' && (
              <Button onClick={() => onRetry(job.id)}>
                <RefreshCw size={14} /> Retry Job
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Submit Job Modal ──────────────────────────────────────────────────────────
function SubmitJobModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: () => void }) {
  const [form, setForm] = useState({
    name: '', type: 'data-processing', priority: 'normal' as JobPriority,
    maxRetries: 3, payload: '{}'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Job name is required'); return; }
    let payload = {};
    try { payload = JSON.parse(form.payload); } catch { setError('Invalid JSON payload'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.submitJob({ name: form.name, type: form.type, priority: form.priority, maxRetries: form.maxRetries, payload });
      onSubmit(); onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }} />
      <div style={{
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 70, padding: 20
      }}>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '24px', width: '100%', maxWidth: 480,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>Submit New Job</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Job Name *">
              <input
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Weekly Report Generation"
                style={inputStyle}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Type">
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                  {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as JobPriority })} style={inputStyle}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Max Retries">
              <input
                type="number" min={0} max={10} value={form.maxRetries}
                onChange={e => setForm({ ...form, maxRetries: Number(e.target.value) })}
                style={inputStyle}
              />
            </Field>

            <Field label="Payload (JSON)">
              <textarea
                value={form.payload}
                onChange={e => setForm({ ...form, payload: e.target.value })}
                rows={4}
                style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace', resize: 'vertical' }}
              />
            </Field>

            {error && (
              <div style={{ fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.08)', padding: '8px 12px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Spinner size={14} /> : <Plus size={14} />}
                {submitting ? 'Submitting...' : 'Submit Job'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', background: 'var(--bg-surface)',
  border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)',
  fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box'
};
