import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateIssue } from '../features/project/create-issue.command';
import { Auth, Issuer } from 'src/core/auth';

@Controller('projects')
export class ProjectController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Post(':id/issues')
  createIssue(@Body() data, @Auth() issuer: Issuer) {
    return this.commandBus.execute(new CreateIssue({ ...data, issuer }));
  }
}
