const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export type JobStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'retrying';
export type JobPriority = 'low' | 'normal' | 'high' | 'critical';
export type WorkerStatus = 'idle' | 'busy' | 'offline';

export interface LogEntry { timestamp: number; level: 'info' | 'warn' | 'error'; message: string; }

export interface Job {
  id: string; name: string; type: string; payload: Record<string, any>;
  status: JobStatus; priority: JobPriority; priorityScore: number;
  workerId?: string; createdAt: number; startedAt?: number; completedAt?: number;
  progress: number; retryCount: number; maxRetries: number;
  errorMessage?: string; logs: LogEntry[];
}

export interface Worker {
  id: string; name: string; status: WorkerStatus;
  registeredAt: number; lastHeartbeat: number;
  currentJobId?: string; completedJobs: number; failedJobs: number; tags: string[];
}

export interface Stats {
  totalJobs: number; pending: number; queued: number; running: number;
  completed: number; failed: number;
  totalWorkers: number; onlineWorkers: number; busyWorkers: number;
}

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export const api = {
  getJobs: () => req<Job[]>('/jobs'),
  getJob: (id: string) => req<Job>(`/jobs/${id}`),
  getStats: () => req<Stats>('/jobs/stats'),
  getHistory: () => req<Job[]>('/jobs/history'),
  submitJob: (data: { name: string; type: string; payload?: any; priority?: JobPriority; maxRetries?: number }) =>
    req<Job>('/jobs', { method: 'POST', body: JSON.stringify(data) }),
  cancelJob: (id: string) => req<{ success: boolean }>(`/jobs/${id}/cancel`, { method: 'POST' }),
  retryJob: (id: string) => req<{ success: boolean }>(`/jobs/${id}/retry`, { method: 'POST' }),

  getWorkers: () => req<Worker[]>('/workers'),
  registerWorker: (name: string, tags?: string[]) =>
    req<Worker>('/workers/register', { method: 'POST', body: JSON.stringify({ name, tags }) }),
  heartbeat: (id: string) => req<{ success: boolean }>(`/workers/${id}/heartbeat`, { method: 'POST' }),
  removeWorker: (id: string) => req<{ success: boolean }>(`/workers/${id}`, { method: 'DELETE' }),
};
