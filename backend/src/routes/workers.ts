import { Router, Request, Response } from 'express';
import { workers } from '../db/store';
import { registerWorker, heartbeat } from '../services/scheduler';

const router = Router();

// GET /api/workers
router.get('/', (req: Request, res: Response) => {
  const list = Array.from(workers.values()).sort((a, b) => b.registeredAt - a.registeredAt);
  res.json(list);
});

// GET /api/workers/:id
router.get('/:id', (req: Request, res: Response) => {
  const worker = workers.get(req.params.id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  res.json(worker);
});

// POST /api/workers/register
router.post('/register', (req: Request, res: Response) => {
  const { name, tags } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const worker = registerWorker(name, tags || []);
  res.status(201).json(worker);
});

// POST /api/workers/:id/heartbeat
router.post('/:id/heartbeat', (req: Request, res: Response) => {
  const ok = heartbeat(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Worker not found' });
  res.json({ success: true, timestamp: Date.now() });
});

// DELETE /api/workers/:id - deregister
router.delete('/:id', (req: Request, res: Response) => {
  const worker = workers.get(req.params.id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  worker.status = 'offline';
  res.json({ success: true });
});

export default router;
