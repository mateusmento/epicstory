import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationRepository extends Repository<Notification> {
  constructor(@InjectRepository(Notification) repo: Repository<Notification>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async findForUser(
    userId: number,
    limit: number = 100,
  ): Promise<Notification[]> {
    return this.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async markAsSeen(notificationId: string): Promise<void> {
    await this.update({ id: notificationId as any }, { seen: true });
  }
}
