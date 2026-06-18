export type JobStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'retrying';
export type JobPriority = 'low' | 'normal' | 'high' | 'critical';
export type WorkerStatus = 'idle' | 'busy' | 'offline';

export interface Job {
  id: string;
  name: string;
  type: string;
  payload: Record<string, any>;
  status: JobStatus;
  priority: JobPriority;
  priorityScore: number; // numeric: critical=4, high=3, normal=2, low=1
  workerId?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  progress: number; // 0-100
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  logs: LogEntry[];
}

export interface Worker {
  id: string;
  name: string;
  status: WorkerStatus;
  registeredAt: number;
  lastHeartbeat: number;
  currentJobId?: string;
  completedJobs: number;
  failedJobs: number;
  tags: string[];
}

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface Stats {
  totalJobs: number;
  pending: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  totalWorkers: number;
  onlineWorkers: number;
  busyWorkers: number;
}
