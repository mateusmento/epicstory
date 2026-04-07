import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScheduledJobRepository } from '../repositories';

@Injectable()
export class SchedulingCronjob {
  private readonly logger = new Logger(SchedulingCronjob.name);
  private readonly MAX_RETRIES = 5; // Maximum number of retry attempts
  private readonly BASE_RETRY_DELAY_MS = 60000; // 1 minute base delay

  constructor(
    private scheduledEventRepo: ScheduledJobRepository,
    private emitter: EventEmitter2,
  ) {}

  /**
   * Calculates the exponential backoff delay for a given retry count
   * Formula: baseDelay * (2 ^ retryCount) with a max of 1 hour
   */
  private calculateRetryDelay(retryCount: number): number {
    const delay = this.BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
    const maxDelay = 60 * 60 * 1000; // 1 hour max
    return Math.min(delay, maxDelay);
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleCron() {
    // Look ahead 10 seconds (10000ms) for events that are due
    const [lockId, events] = await this.scheduledEventRepo.findDueJobs(
      0,
      // 2 * 24 * 3600 * 1000,
    ); // 2 days

    if (events.length === 0) {
      this.logger.debug('No scheduled events found');
      return;
    }

    this.logger.debug(`Processing ${events.length} scheduled events`);

    for (const event of events) {
      try {
        await this.emitter.emitAsync(`scheduled-job.${event.type}`, event);

        // Only mark as processed if job processing was successful
        await this.scheduledEventRepo.markAsProcessed({
          eventId: event.id,
          lockId,
          recurrenceFrequency: event.recurrence?.frequency ?? null,
          occurrenceAt: event.occurrenceAt ?? null,
        });

        this.logger.debug(
          `Processed scheduled job ${event.id} for workspace ${event.workspaceId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process scheduled job ${event.id}: ${error.message}`,
          error.stack,
        );

        // Mark failure and check if we should retry
        try {
          const { retryCount, exceededMaxRetries } =
            await this.scheduledEventRepo.markFailure(
              event.id,
              lockId,
              error.message,
            );

          if (exceededMaxRetries) {
            // Mark as permanently failed to prevent further retries
            await this.scheduledEventRepo.markAsPermanentlyFailed(
              event.id,
              lockId,
            );
            this.logger.error(
              `Job ${event.id} exceeded max retries (${retryCount}). Marked as permanently failed.`,
            );
          } else {
            const delay = this.calculateRetryDelay(retryCount);
            this.logger.warn(
              `Event ${event.id} failed (attempt ${retryCount}/${this.MAX_RETRIES}). Will retry after ${Math.round(delay / 1000)}s. Error: ${error.message}`,
            );
          }
        } catch (clearLockError) {
          this.logger.error(
            `Failed to handle failure for event ${event.id}: ${clearLockError.message}`,
          );
        }
      }
    }
  }

  async sendNotification(data?: any) {
    return data;
  }
}
