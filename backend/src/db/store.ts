import { Job, Worker } from '../types';

// In-memory store — swap with PostgreSQL/SQLite in production
export const jobs = new Map<string, Job>();
export const workers = new Map<string, Worker>();
export const executionHistory: Job[] = [];

export function addToHistory(job: Job) {
  executionHistory.unshift({ ...job });
  if (executionHistory.length > 200) executionHistory.pop();
}

export function getQueuedJobs(): Job[] {
  return Array.from(jobs.values())
    .filter(j => j.status === 'queued' || j.status === 'retrying')
    .sort((a, b) => b.priorityScore - a.priorityScore || a.createdAt - b.createdAt);
}

export function getIdleWorkers(): Worker[] {
  return Array.from(workers.values()).filter(w => w.status === 'idle');
}
