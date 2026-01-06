import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserRepository } from 'src/auth';
import { Notification } from '../entities';
import { NotificationGateway } from '../gateways';
import {
  NotificationRepository,
  ScheduledEventRepository,
} from '../repositories';

@Injectable()
export class NotificationsCronjob {
  private readonly logger = new Logger(NotificationsCronjob.name);
  private readonly MAX_RETRIES = 5; // Maximum number of retry attempts
  private readonly BASE_RETRY_DELAY_MS = 60000; // 1 minute base delay

  constructor(
    private scheduledEventRepo: ScheduledEventRepository,
    private notificationRepo: NotificationRepository,
    private notificationGateway: NotificationGateway,
    private userRepo: UserRepository,
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
    const [lockId, events] = await this.scheduledEventRepo.findDueEvents(
      2 * 24 * 3600 * 1000,
    ); // 2 days

    if (events.length === 0) {
      this.logger.debug('No scheduled events found');
      return;
    }

    this.logger.debug(`Processing ${events.length} scheduled events`);

    for (const event of events) {
      try {
        // Determine notification type based on payload
        const notificationType = event.payload.type || 'issue_due_date';

        // Fetch user info if needed (for mentions/replies, we need sender info)
        let userInfo = null;
        if (event.payload.senderId) {
          const sender = await this.userRepo.findOne({
            where: { id: event.payload.senderId },
          });
          if (sender) {
            userInfo = {
              id: sender.id,
              name: sender.name,
              picture: sender.picture || null,
            };
          }
        }

        // Enhance payload with user info if available
        const enhancedPayload = {
          ...event.payload,
          ...(userInfo && { sender: userInfo }),
        };

        // Create and persist notification
        const notification = new Notification({
          type: notificationType,
          userId: event.userId,
          payload: enhancedPayload,
          seen: false,
        });
        const savedNotification =
          await this.notificationRepo.save(notification);

        // Send notification via WebSocket
        await this.notificationGateway.sendNotification(
          event.userId,
          savedNotification,
        );

        // Only mark as processed if notification was successful
        await this.scheduledEventRepo.markAsProcessed(event.id, lockId);

        this.logger.debug(
          `Processed scheduled event ${event.id} for user ${event.userId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process scheduled event ${event.id}: ${error.message}`,
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
              `Event ${event.id} exceeded max retries (${retryCount}). Marked as permanently failed.`,
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
}
