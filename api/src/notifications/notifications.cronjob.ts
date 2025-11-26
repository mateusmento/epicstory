import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserRepository } from 'src/auth';
import { Notification } from './notification.entity';
import { NotificationGateway } from './notifications.gateway';
import { NotificationRepository } from './notification.repository';
import { ScheduledEventRepository } from './scheduled-event.repository';

@Injectable()
export class NotificationsCronjob {
  private readonly logger = new Logger(NotificationsCronjob.name);

  constructor(
    private scheduledEventRepo: ScheduledEventRepository,
    private notificationRepo: NotificationRepository,
    private notificationGateway: NotificationGateway,
    private userRepo: UserRepository,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleCron() {
    // Look ahead 10 seconds (10000ms) for events that are due
    const events = await this.scheduledEventRepo.findDueEvents(
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
        await this.scheduledEventRepo.markAsProcessed(event.id);

        this.logger.debug(
          `Processed scheduled event ${event.id} for user ${event.userId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process scheduled event ${event.id}: ${error.message}`,
          error.stack,
        );

        // Clear the lock so the event can be retried in the next run
        try {
          await this.scheduledEventRepo.clearLock(event.id);
        } catch (clearLockError) {
          this.logger.error(
            `Failed to clear lock for event ${event.id}: ${clearLockError.message}`,
          );
        }
      }
    }
  }
}
