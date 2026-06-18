import { v4 as uuidv4 } from 'uuid';
import { getQueuedJobs, getIdleWorkers, JobModel, WorkerModel } from '../db/store';
import { Job, Worker, JobPriority, LogEntry } from '../types';

const PRIORITY_SCORE: Record<JobPriority, number> = { low: 1, normal: 2, high: 3, critical: 4 };
const HEARTBEAT_TIMEOUT = 15000; // 15s
const SCHEDULE_INTERVAL = 2000;  // 2s

// Simulate job execution on a worker
async function executeJob(job: Job, worker: Worker) {
  try {
    // 1. Mark job as running and assign to worker
    await JobModel.updateOne(
      { id: job.id },
      {
        $set: {
          status: 'running',
          startedAt: Date.now(),
          workerId: worker.id
        },
        $push: {
          logs: { timestamp: Date.now(), level: 'info', message: `Job picked up by worker ${worker.name}` }
        }
      }
    );

    // 2. Mark worker as busy and assign job
    await WorkerModel.updateOne(
      { id: worker.id },
      {
        $set: {
          status: 'busy',
          currentJobId: job.id
        }
      }
    );

    // Simulate progress updates and eventual completion/failure
    const duration = 5000 + Math.random() * 10000; // 5-15s
    const failChance = 0.15; // 15% chance of failure
    const steps = 5;
    let step = 0;

    const interval = setInterval(async () => {
      try {
        const current = await JobModel.findOne({ id: job.id });
        if (!current || current.status !== 'running') {
          clearInterval(interval);
          return;
        }

        step++;
        const progress = Math.min(Math.round((step / steps) * 100), 95);
        
        await JobModel.updateOne(
          { id: job.id },
          {
            $set: { progress },
            $push: {
              logs: { timestamp: Date.now(), level: 'info', message: `Processing step ${step}/${steps} (${progress}%)` }
            }
          }
        );
      } catch (err) {
        console.error(`[Scheduler] Error updating progress for job ${job.id}:`, err);
        clearInterval(interval);
      }
    }, duration / steps);

    setTimeout(async () => {
      clearInterval(interval);
      try {
        const current = await JobModel.findOne({ id: job.id });
        if (!current || current.status !== 'running') return;

        const failed = Math.random() < failChance;
        const wrk = await WorkerModel.findOne({ id: worker.id });

        if (failed) {
          const newStatus = current.retryCount < current.maxRetries ? 'retrying' : 'failed';
          const newRetryCount = current.retryCount + 1;
          
          await JobModel.updateOne(
            { id: job.id },
            {
              $set: {
                status: newStatus,
                progress: 0,
                errorMessage: 'Simulated execution error: worker encountered a fatal exception',
                retryCount: newRetryCount
              },
              $push: {
                logs: [
                  { timestamp: Date.now(), level: 'error', message: `Job failed (attempt ${newRetryCount}/${current.maxRetries + 1})` },
                  ...(newStatus === 'retrying' ? [{ timestamp: Date.now(), level: 'warn', message: `Scheduling retry #${newRetryCount}` }] : [])
                ]
              }
            }
          );

          if (wrk) {
            await WorkerModel.updateOne(
              { id: worker.id },
              {
                $inc: { failedJobs: 1 },
                $set: { status: 'idle', currentJobId: undefined }
              }
            );
          }
        } else {
          await JobModel.updateOne(
            { id: job.id },
            {
              $set: {
                status: 'completed',
                progress: 100,
                completedAt: Date.now()
              },
              $push: {
                logs: { timestamp: Date.now(), level: 'info', message: `Job completed successfully in ${((Date.now() - current.startedAt!) / 1000).toFixed(1)}s` }
              }
            }
          );

          if (wrk) {
            await WorkerModel.updateOne(
              { id: worker.id },
              {
                $inc: { completedJobs: 1 },
                $set: { status: 'idle', currentJobId: undefined }
              }
            );
          }
        }
      } catch (err) {
        console.error(`[Scheduler] Error finalizing job ${job.id}:`, err);
      }
    }, duration);
  } catch (err) {
    console.error(`[Scheduler] Error starting job ${job.id}:`, err);
  }
}

// Heartbeat checker — mark workers offline if no heartbeat
async function checkHeartbeats() {
  const now = Date.now();
  const allWorkers = await WorkerModel.find({ status: { $ne: 'offline' } });
  
  for (const worker of allWorkers) {
    if (now - worker.lastHeartbeat > HEARTBEAT_TIMEOUT) {
      await WorkerModel.updateOne(
        { id: worker.id },
        { $set: { status: 'offline' } }
      );
      
      // Recover jobs assigned to crashed worker
      const runningJobs = await JobModel.find({ workerId: worker.id, status: 'running' });
      for (const job of runningJobs) {
        const newStatus = job.retryCount < job.maxRetries ? 'retrying' : 'failed';
        const newRetryCount = job.retryCount + 1;
        
        await JobModel.updateOne(
          { id: job.id },
          {
            $set: {
              status: newStatus,
              retryCount: newRetryCount,
              workerId: undefined,
              progress: 0
            },
            $push: {
              logs: {
                timestamp: Date.now(),
                level: 'warn',
                message: `Worker ${worker.name} went offline. Job recovered for re-scheduling.`
              }
            }
          }
        );
      }
    }
  }
}

// Main dispatch loop
async function scheduleLoop() {
  await checkHeartbeats();
  const queued = await getQueuedJobs();
  const idle = await getIdleWorkers();

  const pairs = Math.min(queued.length, idle.length);
  for (let i = 0; i < pairs; i++) {
    await executeJob(queued[i], idle[i]);
  }
}

export function startScheduler() {
  console.log('[Scheduler] Started — polling every 2s');
  
  async function tick() {
    try {
      await scheduleLoop();
    } catch (err) {
      console.error('[Scheduler] Error in schedule loop:', err);
    } finally {
      setTimeout(tick, SCHEDULE_INTERVAL);
    }
  }
  
  setTimeout(tick, SCHEDULE_INTERVAL);
}

export async function createJob(
  name: string,
  type: string,
  payload: Record<string, any>,
  priority: JobPriority = 'normal',
  maxRetries = 3
): Promise<Job> {
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
  const doc = await new JobModel(job).save();
  return doc.toObject();
}

export async function registerWorker(name: string, tags: string[] = []): Promise<Worker> {
  const existing = await WorkerModel.findOne({ name });
  if (existing) {
    existing.status = 'idle';
    existing.lastHeartbeat = Date.now();
    existing.tags = tags;
    const doc = await existing.save();
    return doc.toObject();
  }

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
  const doc = await new WorkerModel(worker).save();
  return doc.toObject();
}

export async function heartbeat(workerId: string): Promise<boolean> {
  const worker = await WorkerModel.findOne({ id: workerId });
  if (!worker) return false;
  
  worker.lastHeartbeat = Date.now();
  if (worker.status === 'offline') {
    worker.status = 'idle';
  }
  await worker.save();
  return true;
}

export async function cancelJob(jobId: string): Promise<boolean> {
  const job = await JobModel.findOne({ id: jobId });
  if (!job || job.status === 'completed' || job.status === 'failed') return false;

  job.status = 'failed';
  job.errorMessage = 'Cancelled by user';
  job.logs.push({ timestamp: Date.now(), level: 'warn', message: 'Job cancelled by user' });
  await job.save();

  if (job.workerId) {
    const worker = await WorkerModel.findOne({ id: job.workerId });
    if (worker) {
      worker.status = 'idle';
      worker.currentJobId = undefined;
      await worker.save();
    }
  }
  return true;
}

export async function retryJob(jobId: string): Promise<boolean> {
  const job = await JobModel.findOne({ id: jobId });
  if (!job || job.status !== 'failed') return false;

  job.status = 'queued';
  job.retryCount = 0;
  job.progress = 0;
  job.errorMessage = undefined;
  job.workerId = undefined;
  job.logs.push({ timestamp: Date.now(), level: 'info', message: 'Job manually re-queued' });
  await job.save();
  return true;
}
