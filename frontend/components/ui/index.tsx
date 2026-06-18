'use client';
import { JobStatus, JobPriority, WorkerStatus } from '@/lib/api';

// ── Status Badge ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bg: string; dot?: boolean }> = {
  pending:   { label: 'Pending',   color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  queued:    { label: 'Queued',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', dot: true },
  running:   { label: 'Running',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', dot: true },
  retrying:  { label: 'Retrying',  color: '#f97316', bg: 'rgba(249,115,22,0.1)', dot: true },
  completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  failed:    { label: 'Failed',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

export function StatusBadge({ status }: { status: JobStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 500,
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}22`
    }}>
      {cfg.dot && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: cfg.color,
          display: 'inline-block',
          ...(status === 'running' || status === 'queued' ? { animation: 'pulse-glow 1.5s ease-in-out infinite' } : {})
        }} />
      )}
      {cfg.label}
    </span>
  );
}

// ── Priority Badge ───────────────────────────────────────────────────────────
const PRIORITY_CONFIG: Record<JobPriority, { label: string; color: string }> = {
  low:      { label: 'Low',      color: '#64748b' },
  normal:   { label: 'Normal',   color: '#6366f1' },
  high:     { label: 'High',     color: '#f59e0b' },
  critical: { label: 'Critical', color: '#ef4444' },
};

export function PriorityBadge({ priority }: { priority: JobPriority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 7px', borderRadius: 5, fontSize: 11, fontWeight: 600,
      color: cfg.color, background: `${cfg.color}15`, border: `1px solid ${cfg.color}30`,
      textTransform: 'uppercase', letterSpacing: '0.4px'
    }}>
      {cfg.label}
    </span>
  );
}

// ── Worker Status Badge ──────────────────────────────────────────────────────
const WORKER_CONFIG: Record<WorkerStatus, { label: string; color: string; bg: string }> = {
  idle:    { label: 'Idle',    color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  busy:    { label: 'Busy',    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  offline: { label: 'Offline', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
};

export function WorkerBadge({ status }: { status: WorkerStatus }) {
  const cfg = WORKER_CONFIG[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 500,
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}22`
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
      {cfg.label}
    </span>
  );
}

// ── Progress Bar ─────────────────────────────────────────────────────────────
export function ProgressBar({ value, status }: { value: number; status: JobStatus }) {
  const color = status === 'completed' ? 'var(--accent-green)'
    : status === 'failed' ? 'var(--accent-red)'
    : 'var(--accent-blue)';
  return (
    <div style={{ width: '100%', background: 'var(--bg-surface)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${value}%`, borderRadius: 4,
        background: color, transition: 'width 0.5s ease',
        ...(status === 'running' ? {
          background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #3b82f6 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        } : {})
      }} />
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 20, ...style
    }}>
      {children}
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon, color = 'var(--accent-blue)', sub }: {
  label: string; value: number | string; icon: React.ReactNode;
  color?: string; sub?: string;
}) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10,
      transition: 'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</div>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color
        }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

// ── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid var(--border)`,
      borderTopColor: 'var(--accent-blue)',
      animation: 'spin 0.8s linear infinite', flexShrink: 0
    }} />
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '60px 20px', gap: 12, color: 'var(--text-muted)', textAlign: 'center'
    }}>
      <div style={{ opacity: 0.4, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</div>
      <div style={{ fontSize: 13, maxWidth: 280 }}>{description}</div>
    </div>
  );
}

// ── Page Header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>{subtitle}</p>}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({
  children, onClick, variant = 'primary', size = 'md', disabled = false, style = {}
}: {
  children: React.ReactNode; onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md'; disabled?: boolean; style?: React.CSSProperties;
}) {
  const variants = {
    primary: { background: 'var(--accent-blue)', color: 'white', border: 'none' },
    secondary: { background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' },
    danger: { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' },
    ghost: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
  };
  const sizes = { sm: { padding: '6px 12px', fontSize: 12 }, md: { padding: '8px 16px', fontSize: 14 } };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...variants[variant], ...sizes[size],
        borderRadius: 8, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, transition: 'all 0.15s',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontFamily: 'inherit', ...style
      }}
    >
      {children}
    </button>
  );
}

// ── Time formatter ────────────────────────────────────────────────────────────
export function timeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export function duration(start?: number, end?: number): string {
  if (!start) return '—';
  const ms = (end || Date.now()) - start;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}
