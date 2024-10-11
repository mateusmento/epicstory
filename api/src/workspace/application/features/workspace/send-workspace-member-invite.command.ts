import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty } from 'class-validator';
import * as nodemailer from 'nodemailer';
import { AppConfig } from 'src/core';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';

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
  constructor(private config: AppConfig) {}

  async execute({ issuer, email }: SendWorkspaceMemberInvite) {
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
        html: '<a href="http://localhost:8080" target="_blank">Accept workspace invite</a>',
      });

      console.log(result);
    } catch (err) {
      console.log(err);
    }
  }
}
