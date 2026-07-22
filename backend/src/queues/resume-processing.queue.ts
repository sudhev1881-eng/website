/**
 * Resume processing queue.
 *
 * - When `REDIS_URL` or `REDIS_HOST` is set and `RESUME_PROCESSING_ENABLED` is true:
 *   uses BullMQ (Redis) with retries.
 * - Otherwise: in-process fire-and-forget via `setImmediate` with the same processor.
 *   Upload still succeeds; extraction runs asynchronously without Redis.
 */

import { Redis } from "ioredis";
import { getEnv } from "../config/env.js";
import { logger } from "../config/logger.js";
import {
  processResumeJob,
  type ResumeProcessingJobData,
} from "../services/resume-processing.service.js";

const QUEUE_NAME = "resume-processing";

type BullQueue = import("bullmq").Queue;
type BullWorker = import("bullmq").Worker;

let queue: BullQueue | null = null;
let worker: BullWorker | null = null;
let sharedConnection: Redis | null = null;
let mode: "bullmq" | "in-process" | "disabled" = "disabled";

function redisConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.REDIS_URL?.trim() || env.REDIS_HOST?.trim());
}

function resumeProcessingEnabled(): boolean {
  return getEnv().RESUME_PROCESSING_ENABLED !== false;
}

function createRedisConnection(): Redis {
  const env = getEnv();
  if (env.REDIS_URL?.trim()) {
    return new Redis(env.REDIS_URL.trim(), { maxRetriesPerRequest: null });
  }
  return new Redis({
    host: env.REDIS_HOST!.trim(),
    port: env.REDIS_PORT ?? 6379,
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  });
}

export function getResumeProcessingMode(): typeof mode {
  return mode;
}

export async function enqueueResumeProcessing(data: ResumeProcessingJobData): Promise<void> {
  if (!resumeProcessingEnabled()) {
    logger.debug("Resume processing disabled; skipping enqueue", { resumeId: data.resumeId });
    return;
  }

  if (mode === "bullmq" && queue) {
    await queue.add("process-resume", data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    });
    logger.info("Resume job enqueued (BullMQ)", { resumeId: data.resumeId });
    return;
  }

  // In-process fallback — same processor; failures mark status failed inside processResumeJob.
  setImmediate(() => {
    processResumeJob(data).catch((err) => {
      logger.error("In-process resume job failed", {
        resumeId: data.resumeId,
        message: err instanceof Error ? err.message : String(err),
      });
    });
  });
  logger.info("Resume job scheduled (in-process)", { resumeId: data.resumeId });
}

export async function startResumeProcessingWorker(): Promise<void> {
  if (!resumeProcessingEnabled()) {
    mode = "disabled";
    logger.info("Resume processing disabled (RESUME_PROCESSING_ENABLED=false)");
    return;
  }

  if (!redisConfigured()) {
    mode = "in-process";
    logger.info(
      "Resume processing: in-process mode (set REDIS_URL or REDIS_HOST to enable BullMQ)",
    );
    return;
  }

  try {
    const { Queue, Worker } = await import("bullmq");
    sharedConnection = createRedisConnection();

    queue = new Queue(QUEUE_NAME, { connection: sharedConnection });
    worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        const data = job.data as ResumeProcessingJobData;
        await processResumeJob(data);
      },
      {
        connection: sharedConnection.duplicate(),
        concurrency: 2,
      },
    );

    worker.on("failed", (job, err) => {
      logger.error("BullMQ resume job failed", {
        jobId: job?.id,
        resumeId: (job?.data as ResumeProcessingJobData | undefined)?.resumeId,
        message: err.message,
      });
    });

    mode = "bullmq";
    logger.info("Resume processing: BullMQ worker started", { queue: QUEUE_NAME });
  } catch (err) {
    mode = "in-process";
    queue = null;
    worker = null;
    if (sharedConnection) {
      sharedConnection.disconnect();
      sharedConnection = null;
    }
    logger.warn("BullMQ init failed; falling back to in-process resume processing", {
      message: (err as Error).message,
    });
  }
}

export async function stopResumeProcessingWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (queue) {
    await queue.close();
    queue = null;
  }
  if (sharedConnection) {
    sharedConnection.disconnect();
    sharedConnection = null;
  }
}
