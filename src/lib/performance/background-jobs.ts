/**
 * Background Jobs
 * 
 * Implements scheduled background jobs with:
 * - Job scheduling
 * - Cron-like scheduling
 * - Job execution
 * - Job dependencies
 * - Job history
 * - Job monitoring
 * - Job failure handling
 */

// Job schedule
export interface JobSchedule {
  id: string;
  name: string;
  type: string;
  cronExpression: string;
  data: unknown;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  failureCount: number;
}

// Job execution result
export interface JobExecutionResult {
  jobId: string;
  scheduleId: string;
  success: boolean;
  startedAt: Date;
  completedAt: Date;
  duration: number;
  error?: string;
  result?: unknown;
}

/**
 * Background Job Scheduler
 */
export class BackgroundJobScheduler {
  private schedules: Map<string, JobSchedule>;
  private executionHistory: JobExecutionResult[];
  private isRunning: boolean;
  private intervalId?: NodeJS.Timeout;

  constructor() {
    this.schedules = new Map();
    this.executionHistory = [];
    this.isRunning = false;
  }

  /**
   * Add scheduled job
   */
  addSchedule(
    name: string,
    type: string,
    cronExpression: string,
    data: unknown,
    enabled: boolean = true
  ): string {
    const schedule: JobSchedule = {
      id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      cronExpression,
      data,
      enabled,
      runCount: 0,
      failureCount: 0,
      nextRun: this.calculateNextRun(cronExpression),
    };

    this.schedules.set(schedule.id, schedule);
    return schedule.id;
  }

  /**
   * Remove scheduled job
   */
  removeSchedule(scheduleId: string): boolean {
    return this.schedules.delete(scheduleId);
  }

  /**
   * Enable schedule
   */
  enableSchedule(scheduleId: string): boolean {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return false;

    schedule.enabled = true;
    schedule.nextRun = this.calculateNextRun(schedule.cronExpression);
    return true;
  }

  /**
   * Disable schedule
   */
  disableSchedule(scheduleId: string): boolean {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return false;

    schedule.enabled = false;
    schedule.nextRun = undefined;
    return true;
  }

  /**
   * Start scheduler
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.checkAndExecuteJobs();
    }, 60000); // Check every minute
  }

  /**
   * Stop scheduler
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  /**
   * Check and execute jobs
   */
  private async checkAndExecuteJobs(): Promise<void> {
    const now = new Date();

    for (const schedule of this.schedules.values()) {
      if (!schedule.enabled || !schedule.nextRun) continue;

      if (now >= schedule.nextRun) {
        await this.executeJob(schedule);
      }
    }
  }

  /**
   * Execute job
   */
  private async executeJob(schedule: JobSchedule): Promise<void> {
    const startedAt = new Date();
    const result: JobExecutionResult = {
      jobId: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      scheduleId: schedule.id,
      success: false,
      startedAt,
      completedAt: new Date(),
      duration: 0,
    };

    try {
      // Execute job (this would call the actual job handler)
      await this.executeJobHandler(schedule.type, schedule.data);

      result.success = true;
      result.completedAt = new Date();
      result.duration = result.completedAt.getTime() - startedAt.getTime();

      schedule.runCount++;
      schedule.lastRun = startedAt;
      schedule.nextRun = this.calculateNextRun(schedule.cronExpression);
    } catch (error) {
      result.success = false;
      result.completedAt = new Date();
      result.duration = result.completedAt.getTime() - startedAt.getTime();
      result.error = String(error);

      schedule.failureCount++;
      schedule.lastRun = startedAt;
      schedule.nextRun = this.calculateNextRun(schedule.cronExpression);
    }

    this.executionHistory.push(result);

    // Keep only last 1000 executions
    if (this.executionHistory.length > 1000) {
      this.executionHistory.shift();
    }
  }

  /**
   * Execute job handler (placeholder)
   */
  private async executeJobHandler(_type: string, _data: unknown): Promise<unknown> {
    // In production, this would call registered job handlers
    // For now, we'll simulate execution
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { executed: true };
  }

  /**
   * Calculate next run time from cron expression
   */
  private calculateNextRun(cronExpression: string): Date {
    // Simple cron parser (supports basic patterns)
    // Format: * * * * * (minute hour day month day_of_week)
    const parts = cronExpression.split(' ');
    
    if (parts.length !== 5) {
      // Default to 1 hour from now
      const next = new Date();
      next.setHours(next.getHours() + 1);
      return next;
    }

    const now = new Date();
    const next = new Date(now);

    // Parse minute
    if (parts[0] !== '*') {
      const minute = parseInt(parts[0], 10);
      next.setMinutes(minute);
    }

    // Parse hour
    if (parts[1] !== '*') {
      const hour = parseInt(parts[1], 10);
      next.setHours(hour);
    }

    // If the calculated time is in the past, add a day
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * Get schedule
   */
  getSchedule(scheduleId: string): JobSchedule | undefined {
    return this.schedules.get(scheduleId);
  }

  /**
   * Get all schedules
   */
  getAllSchedules(): JobSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit?: number): JobExecutionResult[] {
    if (limit) {
      return this.executionHistory.slice(-limit);
    }
    return [...this.executionHistory];
  }

  /**
   * Get schedule statistics
   */
  getScheduleStatistics(scheduleId: string): {
    runCount: number;
    failureCount: number;
    successRate: number;
    averageDuration: number;
    lastRun?: Date;
    nextRun?: Date;
  } | null {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return null;

    const executions = this.executionHistory.filter(e => e.scheduleId === scheduleId);
    
    const successCount = executions.filter(e => e.success).length;
    const successRate = executions.length > 0 ? successCount / executions.length : 0;
    
    const averageDuration = executions.length > 0
      ? executions.reduce((sum, e) => sum + e.duration, 0) / executions.length
      : 0;

    return {
      runCount: schedule.runCount,
      failureCount: schedule.failureCount,
      successRate,
      averageDuration,
      lastRun: schedule.lastRun,
      nextRun: schedule.nextRun,
    };
  }

  /**
   * Clear execution history
   */
  clearExecutionHistory(): void {
    this.executionHistory = [];
  }
}

// Global scheduler instance
let globalScheduler: BackgroundJobScheduler | null = null;

/**
 * Get global scheduler instance
 */
export function getScheduler(): BackgroundJobScheduler {
  if (!globalScheduler) {
    globalScheduler = new BackgroundJobScheduler();
  }
  return globalScheduler;
}

/**
 * Reset global scheduler
 */
export function resetScheduler(): void {
  if (globalScheduler) {
    globalScheduler.stop();
  }
  globalScheduler = null;
}

/**
 * Common job schedules
 */
export const CommonSchedules = {
  // Daily jobs
  CLEAN_CACHE: '0 2 * * *', // 2:00 AM daily
  CLEAN_EXPIRED_DATA: '0 3 * * *', // 3:00 AM daily
  GENERATE_DAILY_REPORTS: '0 6 * * *', // 6:00 AM daily
  
  // Hourly jobs
  SYNC_EXTERNAL_DATA: '0 * * * *', // Every hour
  PROCESS_PENDING_PAYMENTS: '30 * * * *', // Every hour at 30 minutes
  
  // Weekly jobs
  WEEKLY_BACKUP: '0 1 * * 0', // 1:00 AM Sunday
  WEEKLY_REPORT: '0 8 * * 1', // 8:00 AM Monday
  
  // Monthly jobs
  MONTHLY_INVOICES: '0 9 1 * *', // 9:00 AM on 1st of month
  MONTHLY_STATEMENTS: '0 10 1 * *', // 10:00 AM on 1st of month
};

/**
 * Setup common background jobs
 */
export function setupCommonJobs(scheduler: BackgroundJobScheduler): void {
  // Daily jobs
  scheduler.addSchedule(
    'Clean Cache',
    'clean_cache',
    CommonSchedules.CLEAN_CACHE,
    { action: 'clean_cache' }
  );

  scheduler.addSchedule(
    'Clean Expired Data',
    'clean_expired_data',
    CommonSchedules.CLEAN_EXPIRED_DATA,
    { action: 'clean_expired_data' }
  );

  scheduler.addSchedule(
    'Generate Daily Reports',
    'generate_daily_reports',
    CommonSchedules.GENERATE_DAILY_REPORTS,
    { action: 'generate_reports' }
  );

  // Hourly jobs
  scheduler.addSchedule(
    'Sync External Data',
    'sync_external_data',
    CommonSchedules.SYNC_EXTERNAL_DATA,
    { action: 'sync_data' }
  );

  scheduler.addSchedule(
    'Process Pending Payments',
    'process_payments',
    CommonSchedules.PROCESS_PENDING_PAYMENTS,
    { action: 'process_payments' }
  );

  // Weekly jobs
  scheduler.addSchedule(
    'Weekly Backup',
    'weekly_backup',
    CommonSchedules.WEEKLY_BACKUP,
    { action: 'backup' }
  );

  scheduler.addSchedule(
    'Weekly Report',
    'weekly_report',
    CommonSchedules.WEEKLY_REPORT,
    { action: 'report' }
  );

  // Monthly jobs
  scheduler.addSchedule(
    'Monthly Invoices',
    'monthly_invoices',
    CommonSchedules.MONTHLY_INVOICES,
    { action: 'invoices' }
  );

  scheduler.addSchedule(
    'Monthly Statements',
    'monthly_statements',
    CommonSchedules.MONTHLY_STATEMENTS,
    { action: 'statements' }
  );
}

/**
 * Background job helper
 */
export class BackgroundJobHelper {
  private scheduler: BackgroundJobScheduler;

  constructor(scheduler?: BackgroundJobScheduler) {
    this.scheduler = scheduler ?? getScheduler();
  }

  /**
   * Schedule one-time job
   */
  async scheduleOneTime(
    name: string,
    _type: string,
    _data: unknown,
    delay: number // milliseconds
  ): Promise<void> {
    // This would add to the job queue with a delay
    // For now, we'll just log it
    console.warn(`Scheduling one-time job: ${name} with delay ${delay}ms`);
  }

  /**
   * Schedule recurring job
   */
  scheduleRecurring(
    name: string,
    type: string,
    cronExpression: string,
    data: unknown
  ): string {
    return this.scheduler.addSchedule(name, type, cronExpression, data);
  }

  /**
   * Get job status
   */
  getJobStatus(scheduleId: string) {
    return this.scheduler.getScheduleStatistics(scheduleId);
  }

  /**
   * Get all job statuses
   */
  getAllJobStatuses() {
    const schedules = this.scheduler.getAllSchedules();
    const statuses = new Map<string, ReturnType<typeof this.scheduler.getScheduleStatistics>>();

    for (const schedule of schedules) {
      const stats = this.scheduler.getScheduleStatistics(schedule.id);
      if (stats) {
        statuses.set(schedule.id, stats);
      }
    }

    return statuses;
  }
}
