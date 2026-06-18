import { JobModel, WorkerModel } from './models';
import { Job, Worker } from '../types';

export { JobModel, WorkerModel };

export async function getQueuedJobs(): Promise<Job[]> {
  const docs = await JobModel.find({
    status: { $in: ['queued', 'retrying'] }
  }).sort({ priorityScore: -1, createdAt: 1 });
  return docs.map(d => d.toObject());
}

export async function getIdleWorkers(): Promise<Worker[]> {
  const docs = await WorkerModel.find({ status: 'idle' });
  return docs.map(d => d.toObject());
}

export async function getExecutionHistory(): Promise<Job[]> {
  const docs = await JobModel.find({
    status: { $in: ['completed', 'failed'] }
  })
  .sort({ completedAt: -1, createdAt: -1 })
  .limit(50);
  return docs.map(d => d.toObject());
}

export async function getJobById(id: string): Promise<Job | null> {
  const doc = await JobModel.findOne({ id });
  return doc ? doc.toObject() : null;
}

export async function saveJob(job: Job): Promise<Job> {
  const doc = await JobModel.findOneAndUpdate(
    { id: job.id },
    { $set: job },
    { upsert: true, new: true }
  );
  return doc.toObject();
}

export async function getWorkerById(id: string): Promise<Worker | null> {
  const doc = await WorkerModel.findOne({ id });
  return doc ? doc.toObject() : null;
}

export async function saveWorker(worker: Worker): Promise<Worker> {
  const doc = await WorkerModel.findOneAndUpdate(
    { id: worker.id },
    { $set: worker },
    { upsert: true, new: true }
  );
  return doc.toObject();
}

export async function getAllJobsSorted(): Promise<Job[]> {
  const docs = await JobModel.find({}).sort({ createdAt: -1 });
  return docs.map(d => d.toObject());
}

export async function getAllWorkersSorted(): Promise<Worker[]> {
  const docs = await WorkerModel.find({}).sort({ registeredAt: -1 });
  return docs.map(d => d.toObject());
}
