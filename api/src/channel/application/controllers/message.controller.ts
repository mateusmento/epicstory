import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { DeleteMessage, SendMessage, UpdateMessage } from '../features';
import { MessageGateway } from '../gateways/message.gateway';
import { MessageService } from '../services/message.service';
import { ToggleMessageReaction } from '../features/toggle-message-reaction.command';

@UseGuards(JwtAuthGuard)
@Controller('channels/:channelId/messages')
export class ChannelMessageController {
  constructor(
    private messageService: MessageService,
    private commandBus: CommandBus,
    private messageGateway: MessageGateway,
  ) {}

  @Get()
  findMessages(@Param('channelId') channelId: number, @Auth() issuer: Issuer) {
    return this.messageService.findMessages(channelId, issuer.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async sendMessage(
    @Param('channelId') channelId: number,
    @Body() command: SendMessage,
    @Auth() issuer: Issuer,
  ) {
    const message = await this.commandBus.execute(
      new SendMessage({
        channelId,
        senderId: issuer.id,
        content: command.content,
        contentRich: command.contentRich,
        quotedMessageId: command.quotedMessageId,
      }),
    );

    this.messageGateway.emitIncomingMessage(message);

    return message;
  }
}

@UseGuards(JwtAuthGuard)
@Controller('messages/:messageId')
export class MessageController {
  constructor(
    private messageService: MessageService,
    private commandBus: CommandBus,
    private messageGateway: MessageGateway,
  ) {}

  @Get('reactions')
  findMessageReactions(
    @Param('messageId') messageId: number,
    @Auth() issuer: Issuer,
  ) {
    return this.messageService.findMessageReactions(messageId, issuer.id);
  }

  @Post('reactions')
  async toggleMessageReaction(
    @Param('messageId') messageId: number,
    @Body() { emoji }: ToggleMessageReaction,
    @Auth() issuer: Issuer,
  ) {
    const { channelId, action, reactions } = await this.commandBus.execute(
      new ToggleMessageReaction({
        messageId,
        emoji,
        issuerId: issuer.id,
      }),
    );

    this.messageGateway.emitIncomingMessageReaction(
      channelId,
      messageId,
      emoji,
      issuer.id,
      action,
      reactions,
    );

    return { success: true, channelId, messageId, emoji, action, reactions };
  }

  @Patch()
  async updateMessage(
    @Param('messageId') messageId: number,
    @Body() body: Pick<UpdateMessage, 'content' | 'contentRich'>,
    @Auth() issuer: Issuer,
  ) {
    const message = await this.commandBus.execute(
      new UpdateMessage({
        messageId,
        issuerId: issuer.id,
        content: body.content,
        contentRich: body.contentRich,
      }),
    );

    this.messageGateway.emitMessageUpdated(
      message.channelId,
      message,
      issuer.id,
    );

    return message;
  }

  @Delete()
  async deleteMessage(
    @Param('messageId') messageId: number,
    @Auth() issuer: Issuer,
  ) {
    const { channelId } = await this.commandBus.execute(
      new DeleteMessage({ messageId, issuerId: issuer.id }),
    );

    this.messageGateway.emitMessageDeleted(channelId, messageId, issuer.id);

    return { success: true, messageId, channelId };
  }
}
