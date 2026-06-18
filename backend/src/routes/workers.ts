import { Router, Request, Response } from 'express';
import { getWorkerById, getAllWorkersSorted, WorkerModel } from '../db/store';
import { registerWorker, heartbeat } from '../services/scheduler';

const router = Router();

// GET /api/workers
router.get('/', async (req: Request, res: Response) => {
  try {
    const list = await getAllWorkersSorted();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve workers' });
  }
});

// GET /api/workers/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const worker = await getWorkerById(req.params.id);
    if (!worker) return res.status(404).json({ error: 'Worker not found' });
    res.json(worker);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve worker details' });
  }
});

// POST /api/workers/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, tags } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const worker = await registerWorker(name, tags || []);
    res.status(201).json(worker);
  } catch (error) {
    res.status(500).json({ error: 'Failed to register worker' });
  }
});

// POST /api/workers/:id/heartbeat
router.post('/:id/heartbeat', async (req: Request, res: Response) => {
  try {
    const ok = await heartbeat(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Worker not found' });
    res.json({ success: true, timestamp: Date.now() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record worker heartbeat' });
  }
});

// DELETE /api/workers/:id - deregister
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const worker = await WorkerModel.findOne({ id: req.params.id });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });
    
    worker.status = 'offline';
    await worker.save();
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deregister worker' });
  }
});

export default router;
