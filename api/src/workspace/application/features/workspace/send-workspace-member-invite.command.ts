import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import * as nodemailer from 'nodemailer';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';

export class SendWorkspaceMemberInvite {
  issuer: Issuer;
  workspaceId: number;
  email: string;

  constructor(data: Partial<SendWorkspaceMemberInvite>) {
    patch(this, data);
  }
}

@CommandHandler(SendWorkspaceMemberInvite)
export class SendWorkspaceMemberInviteCommand
  implements ICommandHandler<SendWorkspaceMemberInvite>
{
  async execute({ issuer, email }: SendWorkspaceMemberInvite) {
    const transporter = nodemailer.createTransport({
      sendmail: true,
      newline: 'unix',
      path: '/usr/sbin/sendmail',
    });

    try {
      const result = await transporter.sendMail({
        to: email,
        from: 'indiementook@gmail.com',
        subject: `${issuer.name} invites you to a workspace in Epicstory`,
        html: '<p>Accept workspace invite</p>',
      });

      console.log(result);
    } catch (err) {
      console.log(err);
    }
  }
}
