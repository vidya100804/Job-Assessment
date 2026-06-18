import { Router, Request, Response } from 'express';
import { getJobById, getAllJobsSorted, getExecutionHistory, JobModel, WorkerModel } from '../db/store';
import { createJob, cancelJob, retryJob } from '../services/scheduler';
import { JobPriority, Stats } from '../types';

const router = Router();

// GET /api/jobs - list all jobs
router.get('/', async (req: Request, res: Response) => {
  try {
    const list = await getAllJobsSorted();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve jobs' });
  }
});

// GET /api/jobs/stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const allJobs = await JobModel.find({});
    const allWorkers = await WorkerModel.find({});
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

// GET /api/jobs/history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const history = await getExecutionHistory();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve execution history' });
  }
});

// GET /api/jobs/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const job = await getJobById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve job details' });
  }
});

// POST /api/jobs - submit job
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, type, payload, priority, maxRetries } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
    const job = await createJob(name, type, payload || {}, (priority as JobPriority) || 'normal', maxRetries ?? 3);
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit job' });
  }
});

// POST /api/jobs/:id/cancel
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const ok = await cancelJob(req.params.id);
    if (!ok) return res.status(400).json({ error: 'Cannot cancel this job' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

// POST /api/jobs/:id/retry
router.post('/:id/retry', async (req: Request, res: Response) => {
  try {
    const ok = await retryJob(req.params.id);
    if (!ok) return res.status(400).json({ error: 'Job cannot be retried' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retry job' });
  }
});

export default router;
