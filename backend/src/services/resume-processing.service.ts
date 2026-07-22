/**
 * Resume processing entrypoint used by the BullMQ / in-process queue.
 * Delegates to the intelligent draft pipeline (confirm before profile apply).
 */
export type { ResumePipelineJobData as ResumeProcessingJobData } from "./resume/pipeline.js";
export {
  runIntelligentResumePipeline as processResumeJob,
} from "./resume/pipeline.js";
