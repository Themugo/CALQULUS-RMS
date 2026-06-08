/**
 * Queue Workers
 * 
 * Implements queue-based job processing with:
 * - Job queue management
 * - Worker pool management
 * - Job scheduling
 * - Retry logic
 * - Dead letter queue
 * - Job prioritization
 * - Worker health monitoring
 */

// Job status
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
}

// Job priority
export enum JobPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Job
export interface Job<T = unknown> {
  id: string;
  queue: string;
  type: string;
  data: T;
  priority: JobPriority;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  delay: number; // milliseconds
  timeout: number; // milliseconds
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  result?: unknown;
}

// Worker
export interface Worker {
  id: string;
  queue: string;
  status: 'idle' | 'busy' | 'stopped';
  currentJobId?: string;
  processedJobs: number;
  failedJobs: number;
  lastActivity: Date;
}

// Queue statistics
export interface QueueStatistics {
  queue: string;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalJobs: number;
  averageProcessingTime: number;
}

/**
 * Job Queue
 */
export class JobQueue {
  private queues: Map<string, Job[]>;
  private workers: Map<string, Worker>;
  private processing: Map<string, Job>;
  private completed: Map<string, Job>;
  private failed: Map<string, Job>;
  private jobHandlers: Map<string, (data: unknown) => Promise<unknown>>;
  private workerCount: number;

  constructor(workerCount: number = 4) {
    this.queues = new Map();
    this.workers = new Map();
    this.processing = new Map();
    this.completed = new Map();
    this.failed = new Map();
    this.jobHandlers = new Map();
    this.workerCount = workerCount;
  }

  /**
   * Register job handler
   */
  registerHandler(type: string, handler: (data: unknown) => Promise<unknown>): void {
    this.jobHandlers.set(type, handler);
  }

  /**
   * Add job to queue
   */
  async addJob<T>(
    queue: string,
    type: string,
    data: T,
    options: {
      priority?: JobPriority;
      maxAttempts?: number;
      delay?: number;
      timeout?: number;
    } = {}
  ): Promise<string> {
    const {
      priority = JobPriority.NORMAL,
      maxAttempts = 3,
      delay = 0,
      timeout = 30000,
    } = options;

    const job: Job<T> = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      queue,
      type,
      data,
      priority,
      status: JobStatus.PENDING,
      attempts: 0,
      maxAttempts,
      delay,
      timeout,
      createdAt: new Date(),
    };

    // Get or create queue
    if (!this.queues.has(queue)) {
      this.queues.set(queue, []);
    }

    const queueArray = this.queues.get(queue)!;
    
    // Add job based on priority
    if (priority === JobPriority.CRITICAL) {
      queueArray.unshift(job);
    } else if (priority === JobPriority.HIGH) {
      const highIndex = queueArray.findIndex(j => j.priority === JobPriority.CRITICAL);
      queueArray.splice(highIndex === -1 ? 0 : highIndex, 0, job);
    } else {
      queueArray.push(job);
    }

    return job.id;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): Job | undefined {
    // Check all job stores
    for (const queue of this.queues.values()) {
      const job = queue.find(j => j.id === jobId);
      if (job) return job;
    }

    if (this.processing.has(jobId)) {
      return this.processing.get(jobId);
    }

    if (this.completed.has(jobId)) {
      return this.completed.get(jobId);
    }

    if (this.failed.has(jobId)) {
      return this.failed.get(jobId);
    }

    return undefined;
  }

  /**
   * Start workers
   */
  async start(): Promise<void> {
    for (let i = 0; i < this.workerCount; i++) {
      this.createWorker(i);
    }

    // Start processing loop
    this.processLoop();
  }

  /**
   * Stop workers
   */
  async stop(): Promise<void> {
    for (const worker of this.workers.values()) {
      worker.status = 'stopped';
    }
  }

  /**
   * Create worker
   */
  private createWorker(index: number): void {
    const worker: Worker = {
      id: `worker_${index}`,
      queue: 'default',
      status: 'idle',
      processedJobs: 0,
      failedJobs: 0,
      lastActivity: new Date(),
    };

    this.workers.set(worker.id, worker);
  }

  /**
   * Process loop
   */
  private async processLoop(): Promise<void> {
    while (true) {
      await this.processNextJob();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Process next job
   */
  private async processNextJob(): Promise<void> {
    // Find idle worker
    const idleWorker = Array.from(this.workers.values()).find(w => w.status === 'idle');
    if (!idleWorker) {
      return;
    }

    // Find next job
    for (const [_queueName, queue] of this.queues.entries()) {
      if (queue.length === 0) continue;

      const job = queue.shift();
      if (!job) continue;

      // Check if job is delayed
      if (job.delay > 0) {
        const elapsed = Date.now() - job.createdAt.getTime();
        if (elapsed < job.delay) {
          queue.push(job); // Put back in queue
          continue;
        }
      }

      // Process job
      await this.processJob(idleWorker, job);
      return;
    }
  }

  /**
   * Process job
   */
  private async processJob(worker: Worker, job: Job): Promise<void> {
    worker.status = 'busy';
    worker.currentJobId = job.id;
    worker.lastActivity = new Date();

    job.status = JobStatus.PROCESSING;
    job.startedAt = new Date();
    job.attempts++;

    this.processing.set(job.id, job);

    try {
      const handler = this.jobHandlers.get(job.type);
      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.type}`);
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(handler(job.data), job.timeout);

      job.status = JobStatus.COMPLETED;
      job.completedAt = new Date();
      job.result = result;

      this.processing.delete(job.id);
      this.completed.set(job.id, job);

      worker.processedJobs++;
    } catch (error) {
      job.status = JobStatus.FAILED;
      job.failedAt = new Date();
      job.error = String(error);

      this.processing.delete(job.id);

      // Retry if attempts remaining
      if (job.attempts < job.maxAttempts) {
        job.status = JobStatus.RETRYING;
        job.delay = Math.min(60000, 1000 * Math.pow(2, job.attempts)); // Exponential backoff
        
        // Re-queue job
        if (!this.queues.has(job.queue)) {
          this.queues.set(job.queue, []);
        }
        this.queues.get(job.queue)!.push(job);
      } else {
        this.failed.set(job.id, job);
      }

      worker.failedJobs++;
    } finally {
      worker.status = 'idle';
      worker.currentJobId = undefined;
      worker.lastActivity = new Date();
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Job timeout')), timeout)
      ),
    ]);
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.getJob(jobId);
    if (!job) {
      return false;
    }

    if (job.status === JobStatus.PENDING) {
      // Remove from queue
      const queue = this.queues.get(job.queue);
      if (queue) {
        const index = queue.findIndex(j => j.id === jobId);
        if (index !== -1) {
          queue.splice(index, 1);
          job.status = JobStatus.CANCELLED;
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get queue statistics
   */
  getQueueStatistics(queueName: string): QueueStatistics {
    const queue = this.queues.get(queueName) || [];
    const processing = Array.from(this.processing.values()).filter(j => j.queue === queueName);
    const completed = Array.from(this.completed.values()).filter(j => j.queue === queueName);
    const failed = Array.from(this.failed.values()).filter(j => j.queue === queueName);

    const totalJobs = queue.length + processing.length + completed.length + failed.length;
    
    // Calculate average processing time
    const completedJobs = completed.filter(j => j.startedAt && j.completedAt);
    const averageProcessingTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, j) => sum + (j.completedAt!.getTime() - j.startedAt!.getTime()), 0) / completedJobs.length
      : 0;

    return {
      queue: queueName,
      pending: queue.length,
      processing: processing.length,
      completed: completed.length,
      failed: failed.length,
      totalJobs,
      averageProcessingTime,
    };
  }

  /**
   * Get all queue statistics
   */
  getAllStatistics(): Map<string, QueueStatistics> {
    const statistics = new Map<string, QueueStatistics>();

    for (const queueName of this.queues.keys()) {
      statistics.set(queueName, this.getQueueStatistics(queueName));
    }

    return statistics;
  }

  /**
   * Get worker statistics
   */
  getWorkerStatistics(): Worker[] {
    return Array.from(this.workers.values());
  }

  /**
   * Clear completed jobs
   */
  clearCompleted(olderThan?: Date): number {
    const cutoff = olderThan || new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    let count = 0;

    for (const [jobId, job] of this.completed.entries()) {
      if (job.completedAt && job.completedAt < cutoff) {
        this.completed.delete(jobId);
        count++;
      }
    }

    return count;
  }

  /**
   * Clear failed jobs
   */
  clearFailed(olderThan?: Date): number {
    const cutoff = olderThan || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    let count = 0;

    for (const [jobId, job] of this.failed.entries()) {
      if (job.failedAt && job.failedAt < cutoff) {
        this.failed.delete(jobId);
        count++;
      }
    }

    return count;
  }
}

// Global queue instance
let globalQueue: JobQueue | null = null;

/**
 * Get global queue instance
 */
export function getQueue(workerCount?: number): JobQueue {
  if (!globalQueue) {
    globalQueue = new JobQueue(workerCount);
  }
  return globalQueue;
}

/**
 * Reset global queue
 */
export function resetQueue(): void {
  globalQueue = null;
}

/**
 * Common job types
 */
export const JobTypes = {
  // Email jobs
  SEND_EMAIL: 'send_email',
  SEND_BULK_EMAIL: 'send_bulk_email',
  
  // Notification jobs
  SEND_NOTIFICATION: 'send_notification',
  SEND_SMS: 'send_sms',
  
  // Report jobs
  GENERATE_REPORT: 'generate_report',
  EXPORT_DATA: 'export_data',
  
  // Maintenance jobs
  CLEAN_CACHE: 'clean_cache',
  CLEAN_EXPIRED_DATA: 'clean_expired_data',
  
  // Backup jobs
  CREATE_BACKUP: 'create_backup',
  VERIFY_BACKUP: 'verify_backup',
  
  // Sync jobs
  SYNC_EXTERNAL_DATA: 'sync_external_data',
  SYNC_PAYMENTS: 'sync_payments',
  
  // Payment jobs
  PROCESS_PAYMENT: 'process_payment',
  GENERATE_INVOICE: 'generate_invoice',
  
  // Tenant jobs
  SEND_REMINDER: 'send_reminder',
  PROCESS_RENEWAL: 'process_renewal',
};

/**
 * Queue helper functions
 */
export class QueueHelper {
  private queue: JobQueue;

  constructor(queue?: JobQueue) {
    this.queue = queue ?? getQueue();
  }

  /**
   * Queue email job
   */
  async queueEmail(to: string, subject: string, body: string): Promise<string> {
    return await this.queue.addJob(
      'emails',
      JobTypes.SEND_EMAIL,
      { to, subject, body },
      { priority: JobPriority.NORMAL }
    );
  }

  /**
   * Queue notification job
   */
  async queueNotification(userId: string, message: string, type: string): Promise<string> {
    return await this.queue.addJob(
      'notifications',
      JobTypes.SEND_NOTIFICATION,
      { userId, message, type },
      { priority: JobPriority.NORMAL }
    );
  }

  /**
   * Queue report generation job
   */
  async queueReport(reportId: string, parameters: unknown): Promise<string> {
    return await this.queue.addJob(
      'reports',
      JobTypes.GENERATE_REPORT,
      { reportId, parameters },
      { priority: JobPriority.LOW }
    );
  }

  /**
   * Queue data export job
   */
  async queueExport(exportId: string, parameters: unknown): Promise<string> {
    return await this.queue.addJob(
      'exports',
      JobTypes.EXPORT_DATA,
      { exportId, parameters },
      { priority: JobPriority.LOW }
    );
  }

  /**
   * Queue backup job
   */
  async queueBackup(backupId: string): Promise<string> {
    return await this.queue.addJob(
      'backups',
      JobTypes.CREATE_BACKUP,
      { backupId },
      { priority: JobPriority.HIGH }
    );
  }

  /**
   * Queue payment processing job
   */
  async queuePayment(paymentId: string): Promise<string> {
    return await this.queue.addJob(
      'payments',
      JobTypes.PROCESS_PAYMENT,
      { paymentId },
      { priority: JobPriority.HIGH }
    );
  }

  /**
   * Queue reminder job
   */
  async queueReminder(tenantId: string, type: string): Promise<string> {
    return await this.queue.addJob(
      'reminders',
      JobTypes.SEND_REMINDER,
      { tenantId, type },
      { priority: JobPriority.NORMAL }
    );
  }
}
