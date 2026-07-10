import { NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRepository } from 'src/auth/infrastructure';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { GithubUserConnection } from 'src/integrations/github/entities';
import { LinearConnection } from 'src/integrations/linear/entities';
import { MustTransferOwnership } from 'src/workspace/domain/exceptions/must-transfer-ownership';
import { WorkspaceRole } from 'src/workspace/domain/values/workspace-role.value';
import { TeamMember } from 'src/workspace/domain/entities/team-member.entity';
import { WorkspaceMember } from 'src/workspace/domain/entities/workspace-member.entity';
import { DataSource, Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { UserPictureUploadService } from '../services/user-picture-upload.service';

export class DeleteUserAccount {
  issuer: Issuer;

  constructor(data: Partial<DeleteUserAccount> = {}) {
    patch(this, data);
  }
}

type MeetingKick = {
  forceLeaveAndDisconnectUser(userId: number): Promise<void>;
};

@CommandHandler(DeleteUserAccount)
export class DeleteUserAccountCommand
  implements ICommandHandler<DeleteUserAccount>
{
  constructor(
    private userRepo: UserRepository,
    private pictureUpload: UserPictureUploadService,
    private dataSource: DataSource,
    private moduleRef: ModuleRef,
    @InjectRepository(GithubUserConnection)
    private githubUserConnRepo: Repository<GithubUserConnection>,
    @InjectRepository(LinearConnection)
    private linearConnectionRepo: Repository<LinearConnection>,
  ) {}

  async execute({ issuer }: DeleteUserAccount) {
    const user = await this.userRepo.findOne({ where: { id: issuer.id } });
    if (!user) throw new NotFoundException('User not found');

    const memberRepo = this.dataSource.getRepository(WorkspaceMember);
    const ownedMemberships = await memberRepo.find({
      where: { userId: issuer.id, role: WorkspaceRole.OWNER },
      relations: { workspace: true },
    });
    if (ownedMemberships.length > 0) {
      const names = ownedMemberships
        .map((m) => m.workspace?.name ?? `workspace #${m.workspaceId}`)
        .join(', ');
      throw new MustTransferOwnership(
        `Transfer ownership of ${names} before deleting your account`,
      );
    }

    try {
      const meetingKick = this.moduleRef.get<MeetingKick>(
        'MeetingKickService',
        {
          strict: false,
        },
      );
      await meetingKick.forceLeaveAndDisconnectUser(issuer.id);
    } catch (ex) {
      console.log(
        'WARNING: force leave/disconnect on account delete failed',
        ex,
      );
    }

    const pictureUrl = user.picture;
    await this.tombstoneUser(issuer.id, user.id);
    await this.pictureUpload.deletePictureUrl(pictureUrl);

    return { deleted: true };
  }

  @Transactional()
  private async tombstoneUser(userId: number, id: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.dataSource.getRepository(TeamMember).delete({ userId });
    await this.dataSource.getRepository(WorkspaceMember).delete({ userId });
    await this.githubUserConnRepo.delete({ userId });
    await this.linearConnectionRepo.delete({ userId });

    user.name = 'Deleted user';
    user.email = `deleted+${id}@invalid.local`;
    user.password = null as any;
    user.picture = null;
    await this.userRepo.save(user);
  }
}
