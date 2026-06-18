'use client';
import { useEffect, useState, useCallback } from 'react';
import { api, Worker } from '@/lib/api';
import { WorkerBadge, Button, PageHeader, Spinner, EmptyState, Card, timeAgo } from '@/components/ui';
import { Server, Plus, X, Trash2, RefreshCw, Cpu, CheckCircle, XCircle, Activity } from 'lucide-react';

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [removing, setRemoving] = useState('');
  const [sendingHb, setSendingHb] = useState('');

  const fetch = useCallback(async () => {
    try { setWorkers(await api.getWorkers()); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); const t = setInterval(fetch, 3000); return () => clearInterval(t); }, [fetch]);

  const remove = async (id: string) => {
    setRemoving(id);
    await api.removeWorker(id).catch(() => {});
    setRemoving('');
    fetch();
  };

  const sendHb = async (id: string) => {
    setSendingHb(id);
    await api.heartbeat(id).catch(() => {});
    setSendingHb('');
    fetch();
  };

  const online = workers.filter(w => w.status !== 'offline');
  const offline = workers.filter(w => w.status === 'offline');

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <PageHeader
        title="Workers"
        subtitle="Register and monitor execution workers"
        actions={<Button onClick={() => setShowForm(true)}><Plus size={15} /> Register Worker</Button>}
      />

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Workers', value: workers.length, color: 'var(--accent-blue)', icon: <Server size={15} /> },
          { label: 'Online', value: online.length, color: 'var(--accent-green)', icon: <Activity size={15} /> },
          { label: 'Busy', value: workers.filter(w => w.status === 'busy').length, color: 'var(--accent-blue)', icon: <Cpu size={15} /> },
          { label: 'Offline', value: offline.length, color: '#64748b', icon: <XCircle size={15} /> },
        ].map(({ label, value, color, icon }) => (
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

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>
      ) : workers.length === 0 ? (
        <Card>
          <EmptyState icon={<Server size={40} />} title="No workers registered" description="Register a worker to start processing jobs." />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {workers.map(worker => (
            <WorkerCard
              key={worker.id} worker={worker}
              onRemove={() => remove(worker.id)} removing={removing === worker.id}
              onHeartbeat={() => sendHb(worker.id)} sendingHb={sendingHb === worker.id}
            />
          ))}
        </div>
      )}

      {showForm && <RegisterWorkerModal onClose={() => setShowForm(false)} onSubmit={fetch} />}
    </div>
  );
}

function WorkerCard({ worker, onRemove, removing, onHeartbeat, sendingHb }: {
  worker: Worker; onRemove: () => void; removing: boolean;
  onHeartbeat: () => void; sendingHb: boolean;
}) {
  const hbAge = Date.now() - worker.lastHeartbeat;
  const hbWarning = hbAge > 10000 && worker.status !== 'offline';

  return (
    <div style={{
      background: 'var(--bg-card)', border: `1px solid ${worker.status === 'offline' ? 'var(--border)' : worker.status === 'busy' ? 'rgba(59,130,246,0.3)' : 'rgba(16,185,129,0.25)'}`,
      borderRadius: 12, padding: '18px 20px', opacity: worker.status === 'offline' ? 0.65 : 1,
      transition: 'all 0.2s'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: worker.status === 'offline' ? 'var(--bg-surface)' : worker.status === 'busy' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: worker.status === 'offline' ? 'var(--text-muted)' : worker.status === 'busy' ? 'var(--accent-blue)' : 'var(--accent-green)'
          }}>
            <Server size={17} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{worker.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{worker.id.slice(0, 16)}…</div>
          </div>
        </div>
        <WorkerBadge status={worker.status} />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Completed', value: worker.completedJobs, icon: <CheckCircle size={11} />, color: 'var(--accent-green)' },
          { label: 'Failed', value: worker.failedJobs, icon: <XCircle size={11} />, color: 'var(--accent-red)' },
          { label: 'Registered', value: timeAgo(worker.registeredAt), icon: <Activity size={11} />, color: 'var(--text-muted)' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ background: 'var(--bg-surface)', borderRadius: 7, padding: '8px 10px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, marginBottom: 4 }}>{icon} {label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tags */}
      {worker.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
          {worker.tags.map(tag => (
            <span key={tag} style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 5,
              background: 'rgba(99,102,241,0.1)', color: '#a5b4fc',
              border: '1px solid rgba(99,102,241,0.2)', fontWeight: 500
            }}>{tag}</span>
          ))}
        </div>
      )}

      {/* Heartbeat */}
      <div style={{
        fontSize: 11, color: hbWarning ? 'var(--accent-amber)' : 'var(--text-muted)',
        marginBottom: 14, display: 'flex', alignItems: 'center', gap: 5
      }}>
        {hbWarning && '⚠ '}Last heartbeat: {timeAgo(worker.lastHeartbeat)}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onHeartbeat} disabled={sendingHb || worker.status === 'offline'}
          style={{
            flex: 1, padding: '7px', borderRadius: 7, fontSize: 12, fontWeight: 500,
            background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)',
            border: '1px solid rgba(59,130,246,0.2)', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'inherit',
            opacity: worker.status === 'offline' ? 0.4 : 1
          }}
        >
          <RefreshCw size={12} className={sendingHb ? 'animate-spin' : ''} />
          Heartbeat
        </button>
        <button
          onClick={onRemove} disabled={removing}
          style={{
            padding: '7px 10px', borderRadius: 7, background: 'rgba(239,68,68,0.1)',
            color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', fontFamily: 'inherit'
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function RegisterWorkerModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: () => void }) {
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Worker name is required'); return; }
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    setSubmitting(true);
    try {
      await api.registerWorker(name.trim(), tagList);
      onSubmit(); onClose();
    } catch (e: any) { setError(e.message); setSubmitting(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }} />
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70 }}>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
          padding: 24, width: '100%', maxWidth: 400, animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>Register Worker</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Worker Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Delta-Worker"
                style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Tags (comma separated)</label>
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. compute, ml, gpu"
                style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
            {error && <div style={{ fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.08)', padding: '8px 12px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Spinner size={14} /> : <Plus size={14} />}
                Register
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
