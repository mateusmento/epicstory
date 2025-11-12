import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { add } from 'date-fns';
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

  @IsNumber()
  userId: number;
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

  async execute({
    issuer,
    userId,
    email,
    workspaceId,
  }: SendWorkspaceMemberInvite) {
    const workspace = await this.workspaceRepo.findOneBy({
      id: workspaceId,
    });

    if (!workspace) throw new NotFoundException('Workspace not found');

    const user = await this.userRepo.findOneBy({ email });

    if (user) {
      const member = await this.workspaceRepo.findMember(workspaceId, user.id);
      if (member) throw new WorkspaceMemberAlreadyExists();
    }

    const invite = await this.inviteRepo.save(
      WorkspaceMemberInvite.create({
        workspaceId,
        email,
        userId: userId ?? user?.id,
        status: 'sent',
        expiresAt: add(new Date(), { days: 15 }),
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
      const inviteUrl = `${this.config.APP_URL}/workspace-member-invite/${invite.id}`;
      const expirationDate = invite.expiresAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const html = this.getInviteEmailHtml({
        inviterName: issuer.name,
        workspaceName: workspace.name,
        inviteUrl,
        expirationDate,
        recipientEmail: email,
      });

      const result = await transporter.sendMail({
        to: email,
        from: this.config.DEFAULT_SENDER_EMAIL_ADDRESS,
        subject: `${issuer.name} invites you to join ${workspace.name} on Epicstory`,
        html,
        text: `${issuer.name} has invited you to join the workspace "${workspace.name}" on Epicstory.\n\nAccept the invitation: ${inviteUrl}\n\nThis invitation expires on ${expirationDate}.`,
      });

      console.log(result);
    } catch (err) {
      console.log(err);
    }
  }

  private getInviteEmailHtml({
    inviterName,
    workspaceName,
    inviteUrl,
    expirationDate,
    recipientEmail,
  }: {
    inviterName: string;
    workspaceName: string;
    inviteUrl: string;
    expirationDate: string;
    recipientEmail: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workspace Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">Epicstory</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600; line-height: 1.3;">You've been invited!</h2>

              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                <strong style="color: #1a1a1a;">${this.escapeHtml(inviterName)}</strong> has invited you to join the workspace
              </p>

              <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 16px 20px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0; color: #1a1a1a; font-size: 18px; font-weight: 600;">
                  ${this.escapeHtml(workspaceName)}
                </p>
              </div>

              <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Join your team and start collaborating on projects together.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 0 0 30px;">
                    <a href="${inviteUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Alternative Link -->
              <p style="margin: 0 0 30px; color: #6b7280; font-size: 14px; line-height: 1.5; text-align: center;">
                Or copy and paste this link into your browser:<br>
                <a href="${inviteUrl}" style="color: #667eea; text-decoration: none; word-break: break-all;">${inviteUrl}</a>
              </p>

              <!-- Expiration Notice -->
              <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 16px; margin: 30px 0;">
                <p style="margin: 0; color: #9a3412; font-size: 14px; line-height: 1.5;">
                  <strong>⏰ This invitation expires on ${this.escapeHtml(expirationDate)}.</strong><br>
                  Make sure to accept it before then.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.5; text-align: center;">
                This invitation was sent to <strong style="color: #1a1a1a;">${this.escapeHtml(recipientEmail)}</strong>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5; text-align: center;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
