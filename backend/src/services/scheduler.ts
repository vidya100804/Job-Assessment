import { v4 as uuidv4 } from 'uuid';
import { jobs, workers, addToHistory, getQueuedJobs, getIdleWorkers } from '../db/store';
import { Job, Worker, JobPriority, LogEntry } from '../types';

const PRIORITY_SCORE: Record<JobPriority, number> = { low: 1, normal: 2, high: 3, critical: 4 };
const HEARTBEAT_TIMEOUT = 15000; // 15s
const SCHEDULE_INTERVAL = 2000;  // 2s

function addLog(job: Job, level: LogEntry['level'], message: string) {
  job.logs.push({ timestamp: Date.now(), level, message });
}

// Simulate job execution on a worker
function executeJob(job: Job, worker: Worker) {
  job.status = 'running';
  job.startedAt = Date.now();
  job.workerId = worker.id;
  worker.status = 'busy';
  worker.currentJobId = job.id;
  addLog(job, 'info', `Job picked up by worker ${worker.name}`);

  // Simulate progress updates and eventual completion/failure
  const duration = 5000 + Math.random() * 10000; // 5-15s
  const failChance = 0.15; // 15% chance of failure
  const steps = 5;
  let step = 0;

  const interval = setInterval(() => {
    if (!jobs.has(job.id)) { clearInterval(interval); return; }
    const current = jobs.get(job.id)!;
    if (current.status !== 'running') { clearInterval(interval); return; }

    step++;
    current.progress = Math.min(Math.round((step / steps) * 100), 95);
    addLog(current, 'info', `Processing step ${step}/${steps} (${current.progress}%)`);
  }, duration / steps);

  setTimeout(() => {
    clearInterval(interval);
    const current = jobs.get(job.id);
    if (!current || current.status !== 'running') return;

    const failed = Math.random() < failChance;
    const wrk = workers.get(worker.id);

    if (failed) {
      current.status = current.retryCount < current.maxRetries ? 'retrying' : 'failed';
      current.progress = 0;
      current.errorMessage = 'Simulated execution error: worker encountered a fatal exception';
      current.retryCount++;
      if (wrk) wrk.failedJobs++;
      addLog(current, 'error', `Job failed (attempt ${current.retryCount}/${current.maxRetries + 1})`);
      if (current.status === 'retrying') {
        addLog(current, 'warn', `Scheduling retry #${current.retryCount}`);
      }
    } else {
      current.status = 'completed';
      current.progress = 100;
      current.completedAt = Date.now();
      if (wrk) wrk.completedJobs++;
      addLog(current, 'info', `Job completed successfully in ${((Date.now() - current.startedAt!) / 1000).toFixed(1)}s`);
      addToHistory(current);
    }

    if (wrk) {
      wrk.status = 'idle';
      wrk.currentJobId = undefined;
    }
  }, duration);
}

// Heartbeat checker — mark workers offline if no heartbeat
function checkHeartbeats() {
  const now = Date.now();
  workers.forEach(worker => {
    if (worker.status !== 'offline' && now - worker.lastHeartbeat > HEARTBEAT_TIMEOUT) {
      worker.status = 'offline';
      // Recover jobs assigned to crashed worker
      jobs.forEach(job => {
        if (job.workerId === worker.id && job.status === 'running') {
          job.status = job.retryCount < job.maxRetries ? 'retrying' : 'failed';
          job.retryCount++;
          job.workerId = undefined;
          job.progress = 0;
          addLog(job, 'warn', `Worker ${worker.name} went offline. Job recovered for re-scheduling.`);
        }
      });
    }
  });
}

// Main dispatch loop
function scheduleLoop() {
  checkHeartbeats();
  const queued = getQueuedJobs();
  const idle = getIdleWorkers();

  const pairs = Math.min(queued.length, idle.length);
  for (let i = 0; i < pairs; i++) {
    executeJob(queued[i], idle[i]);
  }
}

export function startScheduler() {
  setInterval(scheduleLoop, SCHEDULE_INTERVAL);
  console.log('[Scheduler] Started — polling every 2s');
}

export function createJob(
  name: string,
  type: string,
  payload: Record<string, any>,
  priority: JobPriority = 'normal',
  maxRetries = 3
): Job {
  const job: Job = {
    id: uuidv4(),
    name,
    type,
    payload,
    status: 'queued',
    priority,
    priorityScore: PRIORITY_SCORE[priority],
    progress: 0,
    retryCount: 0,
    maxRetries,
    createdAt: Date.now(),
    logs: [{ timestamp: Date.now(), level: 'info', message: 'Job submitted to queue' }],
  };
  jobs.set(job.id, job);
  return job;
}

export function registerWorker(name: string, tags: string[] = []): Worker {
  const worker: Worker = {
    id: uuidv4(),
    name,
    status: 'idle',
    registeredAt: Date.now(),
    lastHeartbeat: Date.now(),
    completedJobs: 0,
    failedJobs: 0,
    tags,
  };
  workers.set(worker.id, worker);
  return worker;
}

export function heartbeat(workerId: string): boolean {
  const worker = workers.get(workerId);
  if (!worker) return false;
  worker.lastHeartbeat = Date.now();
  if (worker.status === 'offline') worker.status = 'idle';
  return true;
}

export function cancelJob(jobId: string): boolean {
  const job = jobs.get(jobId);
  if (!job || job.status === 'completed' || job.status === 'failed') return false;
  job.status = 'failed';
  job.errorMessage = 'Cancelled by user';
  addLog(job, 'warn', 'Job cancelled by user');
  if (job.workerId) {
    const worker = workers.get(job.workerId);
    if (worker) { worker.status = 'idle'; worker.currentJobId = undefined; }
  }
  return true;
}

export function retryJob(jobId: string): boolean {
  const job = jobs.get(jobId);
  if (!job || job.status !== 'failed') return false;
  job.status = 'queued';
  job.retryCount = 0;
  job.progress = 0;
  job.errorMessage = undefined;
  job.workerId = undefined;
  addLog(job, 'info', 'Job manually re-queued');
  return true;
}
