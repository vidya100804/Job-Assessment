import { Schema, model } from 'mongoose';
import { Job, Worker, LogEntry } from '../types';

const LogEntrySchema = new Schema<LogEntry>({
  timestamp: { type: Number, required: true },
  level: { type: String, enum: ['info', 'warn', 'error'], required: true },
  message: { type: String, required: true }
}, { _id: false });

const JobSchema = new Schema<Job>({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['pending', 'queued', 'running', 'completed', 'failed', 'retrying'], required: true },
  priority: { type: String, enum: ['low', 'normal', 'high', 'critical'], required: true },
  priorityScore: { type: Number, required: true },
  workerId: { type: String },
  createdAt: { type: Number, required: true },
  startedAt: { type: Number },
  completedAt: { type: Number },
  progress: { type: Number, default: 0 },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  errorMessage: { type: String },
  logs: { type: [LogEntrySchema], default: [] }
});

// Avoid collisions between mongoose virtual id and physical id field
JobSchema.set('toJSON', { virtuals: false });
JobSchema.set('toObject', { virtuals: false });

const WorkerSchema = new Schema<Worker>({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  status: { type: String, enum: ['idle', 'busy', 'offline'], required: true },
  registeredAt: { type: Number, required: true },
  lastHeartbeat: { type: Number, required: true },
  currentJobId: { type: String },
  completedJobs: { type: Number, default: 0 },
  failedJobs: { type: Number, default: 0 },
  tags: { type: [String], default: [] }
});

WorkerSchema.set('toJSON', { virtuals: false });
WorkerSchema.set('toObject', { virtuals: false });

export const JobModel = model<Job>('Job', JobSchema);
export const WorkerModel = model<Worker>('Worker', WorkerSchema);
