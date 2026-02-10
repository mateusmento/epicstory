import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { UserRepository } from 'src/auth';
import { Channel } from 'src/channel/domain';
import { ChannelRepository } from 'src/channel/infrastructure';
import { In } from 'typeorm';
import { patch } from 'src/core/objects';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { WorkspaceNotFound } from 'src/workspace/application/features';
import { SendMessage } from './send-message.command';

export class SendDirectMessage {
  senderId: number;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  peers: number[];

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  contentRich?: any;

  @IsNumber()
  workspaceId: number;

  constructor(data: Partial<SendDirectMessage>) {
    patch(this, data);
  }
}

@CommandHandler(SendDirectMessage)
export class SendDirectMessageCommand
  implements ICommandHandler<SendDirectMessage>
{
  constructor(
    private userRepo: UserRepository,
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
    private commandBus: CommandBus,
  ) {}

  async execute({
    senderId,
    peers,
    workspaceId,
    content,
    contentRich,
  }: SendDirectMessage) {
    const workspace = await this.workspaceRepo.findOneBy({ id: workspaceId });
    if (!workspace) {
      throw new WorkspaceNotFound();
    }

    const sender = await this.userRepo.findOne({ where: { id: senderId } });
    if (!sender) {
      throw new Error('Sender not found');
    }

    peers = peers.filter((peer) => peer !== senderId);

    const peerUsers = await this.userRepo.findBy({ id: In(peers) });

    if (peerUsers.length !== peers.length) {
      throw new Error('Peers not found');
    }

    let channel = await this.channelRepo.findMultiDirectChannel([
      ...peers,
      senderId,
    ]);

    if (!channel) {
      channel = await this.channelRepo.save(
        Channel.createMultiDirect({
          workspaceId: workspace.id,
          peers: peerUsers,
        }),
      );
    }

    return this.commandBus.execute(
      new SendMessage({
        channelId: channel.id,
        senderId,
        content,
        contentRich,
      }),
    );
  }
}
