import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty } from 'class-validator';
import * as moment from 'moment';
import * as nodemailer from 'nodemailer';
import { UserRepository } from 'src/auth';
import { AppConfig } from 'src/core';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { WorkspaceMemberInvite } from 'src/workspace/domain/entities';
import { WorkspaceMemberAlreadyExists } from 'src/workspace/domain/exceptions';
import {
  WorkspaceMemberInviteRepository,
  WorkspaceRepository,
} from 'src/workspace/infrastructure/repositories';

export class SendWorkspaceMemberInvite {
  issuer: Issuer;
  workspaceId: number;
  @IsNotEmpty()
  email: string;

  constructor(data: Partial<SendWorkspaceMemberInvite>) {
    patch(this, data);
  }
}

@CommandHandler(SendWorkspaceMemberInvite)
export class SendWorkspaceMemberInviteCommand
  implements ICommandHandler<SendWorkspaceMemberInvite>
{
  constructor(
    private config: AppConfig,
    private inviteRepo: WorkspaceMemberInviteRepository,
    private workspaceRepo: WorkspaceRepository,
    private userRepo: UserRepository,
  ) {}

  async execute({ issuer, email, workspaceId }: SendWorkspaceMemberInvite) {
    const user = await this.userRepo.findOneBy({ email });

    if (user) {
      const member = await this.workspaceRepo.findMember(workspaceId, user.id);
      if (member) throw new WorkspaceMemberAlreadyExists();
    }

    const invite = await this.inviteRepo.save(
      WorkspaceMemberInvite.create({
        workspaceId,
        email,
        userId: user?.id,
        status: 'sent',
        expiresAt: moment().add(15, 'days').toDate(),
      }),
    );

    const transporter = nodemailer.createTransport({
      host: this.config.EMAIL_SMTP_URL,
      port: 465,
      secure: true,
      auth: {
        user: this.config.EMAIL_SMTP_USER,
        pass: this.config.EMAIL_SMTP_PASSWORD,
      },
    });

    try {
      const result = await transporter.sendMail({
        to: email,
        from: this.config.DEFAULT_SENDER_EMAIL_ADDRESS,
        subject: `${issuer.name} invites you to a workspace in Epicstory`,
        html: `<a href="http://localhost:8080/workspace-member-invite/${invite.id}" target="_blank">Accept workspace invite</a>`,
      });

      console.log(result);
    } catch (err) {
      console.log(err);
    }
  }
}
