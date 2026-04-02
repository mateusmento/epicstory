import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { UUID } from 'crypto';

@Injectable()
export class NotificationRepository extends Repository<Notification> {
  constructor(@InjectRepository(Notification) repo: Repository<Notification>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async markAsSeen(notificationId: UUID): Promise<void> {
    await this.update({ id: notificationId }, { seen: true });
  }
}
