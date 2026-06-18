import { Router, Request, Response } from 'express';
import { jobs, executionHistory } from '../db/store';
import { createJob, cancelJob, retryJob } from '../services/scheduler';
import { JobPriority, Stats } from '../types';

const router = Router();

// GET /api/jobs - list all jobs
router.get('/', (req: Request, res: Response) => {
  const list = Array.from(jobs.values()).sort((a, b) => b.createdAt - a.createdAt);
  res.json(list);
});

// GET /api/jobs/stats
router.get('/stats', (req: Request, res: Response) => {
  const { workers } = require('../db/store');
  const allJobs = Array.from(jobs.values());
  const allWorkers = Array.from((workers as Map<string, any>).values());
  const stats: Stats = {
    totalJobs: allJobs.length,
    pending: allJobs.filter(j => j.status === 'pending').length,
    queued: allJobs.filter(j => j.status === 'queued' || j.status === 'retrying').length,
    running: allJobs.filter(j => j.status === 'running').length,
    completed: allJobs.filter(j => j.status === 'completed').length,
    failed: allJobs.filter(j => j.status === 'failed').length,
    totalWorkers: allWorkers.length,
    onlineWorkers: allWorkers.filter(w => w.status !== 'offline').length,
    busyWorkers: allWorkers.filter(w => w.status === 'busy').length,
  };
  res.json(stats);
});

// GET /api/jobs/history
router.get('/history', (req: Request, res: Response) => {
  res.json(executionHistory.slice(0, 50));
});

// GET /api/jobs/:id
router.get('/:id', (req: Request, res: Response) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// POST /api/jobs - submit job
router.post('/', (req: Request, res: Response) => {
  const { name, type, payload, priority, maxRetries } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
  const job = createJob(name, type, payload || {}, (priority as JobPriority) || 'normal', maxRetries ?? 3);
  res.status(201).json(job);
});

// POST /api/jobs/:id/cancel
router.post('/:id/cancel', (req: Request, res: Response) => {
  const ok = cancelJob(req.params.id);
  if (!ok) return res.status(400).json({ error: 'Cannot cancel this job' });
  res.json({ success: true });
});

// POST /api/jobs/:id/retry
router.post('/:id/retry', (req: Request, res: Response) => {
  const ok = retryJob(req.params.id);
  if (!ok) return res.status(400).json({ error: 'Job cannot be retried' });
  res.json({ success: true });
});

export default router;
