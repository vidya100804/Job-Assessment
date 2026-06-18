import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jobsRouter from './routes/jobs';
import workersRouter from './routes/workers';
import { connectDB } from './db/connection';
import { startScheduler, registerWorker } from './services/scheduler';
import { JobModel } from './db/store';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/jobs', jobsRouter);
app.use('/api/workers', workersRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Seed demo workers on startup
async function seedDemoWorkers() {
  try {
    await registerWorker('Alpha-Worker', ['general', 'compute']);
    await registerWorker('Beta-Worker', ['general', 'ml']);
    await registerWorker('Gamma-Worker', ['io', 'storage']);
    console.log('[Seed] Demo workers registered/updated successfully');
  } catch (err) {
    console.error('[Seed] Failed to seed demo workers:', err);
  }
}

// Seed demo jobs for recruiters on startup
async function seedDemoJobs() {
  try {
    const hasSeeded = await JobModel.exists({ id: 'mock-job-1' });
    if (hasSeeded) {
      console.log('[Seed] Recruiter mock jobs already exist in database, skipping seeding.');
      return;
    }

    const now = Date.now();
    const mockJobs = [
      {
        id: 'mock-job-1',
        name: 'Database Backup & Verify',
        type: 'backup',
        payload: { target: 'production-db', format: 'tar.gz' },
        status: 'completed',
        priority: 'high',
        priorityScore: 3,
        progress: 100,
        retryCount: 0,
        maxRetries: 3,
        createdAt: now - 3600000 * 2, // 2 hours ago
        startedAt: now - 3600000 * 2 + 1000,
        completedAt: now - 3600000 * 2 + 15000,
        logs: [
          { timestamp: now - 3600000 * 2, level: 'info', message: 'Job submitted to queue' },
          { timestamp: now - 3600000 * 2 + 1000, level: 'info', message: 'Job picked up by worker Alpha-Worker' },
          { timestamp: now - 3600000 * 2 + 5000, level: 'info', message: 'Connecting to database instance...' },
          { timestamp: now - 3600000 * 2 + 10000, level: 'info', message: 'Streaming tables dump to archive (14.2 GB compressed)' },
          { timestamp: now - 3600000 * 2 + 14000, level: 'info', message: 'Verifying checksum integrity...' },
          { timestamp: now - 3600000 * 2 + 15000, level: 'info', message: 'Job completed successfully in 14.0s' }
        ]
      },
      {
        id: 'mock-job-2',
        name: 'Train Fraud Detection CNN',
        type: 'ml-training',
        payload: { epochs: 50, batchSize: 64, learningRate: 0.001 },
        status: 'failed',
        priority: 'critical',
        priorityScore: 4,
        progress: 60,
        retryCount: 1,
        maxRetries: 1,
        errorMessage: 'Simulated execution error: CUDA out of memory error during epoch 32',
        createdAt: now - 3600000 * 1, // 1 hour ago
        startedAt: now - 3600000 * 1 + 2000,
        completedAt: now - 3600000 * 1 + 25000,
        logs: [
          { timestamp: now - 3600000 * 1, level: 'info', message: 'Job submitted to queue' },
          { timestamp: now - 3600000 * 1 + 2000, level: 'info', message: 'Job picked up by worker Beta-Worker' },
          { timestamp: now - 3600000 * 1 + 5000, level: 'info', message: 'Epoch 1/50 - Loss: 0.452 - Val Loss: 0.410' },
          { timestamp: now - 3600000 * 1 + 10000, level: 'info', message: 'Epoch 10/50 - Loss: 0.221 - Val Loss: 0.235' },
          { timestamp: now - 3600000 * 1 + 15000, level: 'info', message: 'Epoch 20/50 - Loss: 0.114 - Val Loss: 0.150' },
          { timestamp: now - 3600000 * 1 + 20000, level: 'info', message: 'Epoch 30/50 - Loss: 0.089 - Val Loss: 0.112' },
          { timestamp: now - 3600000 * 1 + 24000, level: 'warn', message: 'GPU Memory usage exceeded 98% threshold' },
          { timestamp: now - 3600000 * 1 + 25000, level: 'error', message: 'Job failed (attempt 2/2)' }
        ]
      },
      {
        id: 'mock-job-3',
        name: 'Resize Avatar Uploads',
        type: 'image-processing',
        payload: { path: '/uploads/avatars', quality: 85 },
        status: 'completed',
        priority: 'low',
        priorityScore: 1,
        progress: 100,
        retryCount: 0,
        maxRetries: 3,
        createdAt: now - 1800000, // 30 mins ago
        startedAt: now - 1800000 + 3000,
        completedAt: now - 1800000 + 8000,
        logs: [
          { timestamp: now - 1800000, level: 'info', message: 'Job submitted to queue' },
          { timestamp: now - 1800000 + 3000, level: 'info', message: 'Job picked up by worker Alpha-Worker' },
          { timestamp: now - 1800000 + 5000, level: 'info', message: 'Processing avatar_12894.png -> avatar_12894_thumb.png' },
          { timestamp: now - 1800000 + 6500, level: 'info', message: 'Processing avatar_12895.png -> avatar_12895_thumb.png' },
          { timestamp: now - 1800000 + 8000, level: 'info', message: 'Job completed successfully in 5.0s' }
        ]
      },
      {
        id: 'mock-job-4',
        name: 'Index ElasticSearch Store',
        type: 'indexing',
        payload: { indexName: 'products-v2', refresh: true },
        status: 'queued',
        priority: 'normal',
        priorityScore: 2,
        progress: 0,
        retryCount: 0,
        maxRetries: 3,
        createdAt: now - 30000, // 30 seconds ago
        logs: [
          { timestamp: now - 30000, level: 'info', message: 'Job submitted to queue' }
        ]
      },
      {
        id: 'mock-job-5',
        name: 'Weekly Sales Newsletter Email',
        type: 'email-notifications',
        payload: { campaignId: 'newsletter_june_2026', recipientsCount: 1540 },
        status: 'queued',
        priority: 'high',
        priorityScore: 3,
        progress: 0,
        retryCount: 0,
        maxRetries: 3,
        createdAt: now - 10000, // 10 seconds ago
        logs: [
          { timestamp: now - 10000, level: 'info', message: 'Job submitted to queue' }
        ]
      }
    ];

    await JobModel.insertMany(mockJobs);
    console.log('[Seed] 5 recruiter mock jobs successfully seeded to MongoDB');
  } catch (err) {
    console.error('[Seed] Failed to seed mock jobs:', err);
  }
}

async function startServer() {
  try {
    // Connect to database
    await connectDB();

    // Start server listening
    app.listen(PORT, async () => {
      console.log(`[Server] JobFlow API running on http://localhost:${PORT}`);
      
      // Seed demo workers
      await seedDemoWorkers();

      // Seed demo jobs
      await seedDemoJobs();
      
      // Start scheduler loop
      startScheduler();
    });
  } catch (err) {
    console.error('[Server] Startup failed:', err);
    process.exit(1);
  }
}

startServer();
