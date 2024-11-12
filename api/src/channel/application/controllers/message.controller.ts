import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { MessageService } from '../services/message.service';
import { JwtAuthGuard } from 'src/core/auth';

@UseGuards(JwtAuthGuard)
@Controller('channels/:channelId')
export class MessageController {
  constructor(private messageService: MessageService) {}

  @Get('messages')
  findMessages(@Param('channelId') channelId: number) {
    return this.messageService.findMessages(channelId);
  }
}
