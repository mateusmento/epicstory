import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ExceptionFilter } from 'src/core';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import {
  AddSprintItem,
  CompleteSprint,
  FindSprintItems,
  FindSprints,
  RemoveSprintItem,
  ReorderSprintItem,
  StartSprint,
  UpdateSprintItemDestination,
} from '../features';

@Controller()
export class SprintController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Get('teams/:teamId/sprints')
  @UseGuards(JwtAuthGuard)
  findSprints(
    @Param('teamId') teamId: number,
    @Query('status') status?: string,
  ) {
    return this.queryBus.execute(
      new FindSprints({ teamId, status: status as any }),
    );
  }

  @Put('sprints/:id/start')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter(
    [ForbiddenException, ForbiddenException],
    [NotFoundException, NotFoundException],
    [BadRequestException, BadRequestException],
  )
  startSprint(@Param('id') sprintId: number, @Auth() issuer: Issuer) {
    return this.commandBus.execute(new StartSprint({ sprintId, issuer }));
  }

  @Put('sprints/:id/complete')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter(
    [ForbiddenException, ForbiddenException],
    [NotFoundException, NotFoundException],
    [BadRequestException, BadRequestException],
  )
  completeSprint(@Param('id') sprintId: number, @Auth() issuer: Issuer) {
    return this.commandBus.execute(new CompleteSprint({ sprintId, issuer }));
  }

  @Get('sprints/:id/items')
  @UseGuards(JwtAuthGuard)
  findSprintItems(@Param('id') sprintId: number) {
    return this.queryBus.execute(new FindSprintItems({ sprintId }));
  }

  @Post('sprints/:id/items')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter(
    [ForbiddenException, ForbiddenException],
    [NotFoundException, NotFoundException],
  )
  addSprintItem(
    @Param('id') sprintId: number,
    @Body() body: { issueId: number },
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new AddSprintItem({ sprintId, issueId: body.issueId, issuer }),
    );
  }

  @Put('sprint-items/:id/order')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter(
    [ForbiddenException, ForbiddenException],
    [NotFoundException, NotFoundException],
  )
  reorderSprintItem(
    @Param('id') sprintItemId: number,
    @Body() body: { afterOf: number | null },
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new ReorderSprintItem({
        sprintItemId,
        afterOf: body.afterOf ?? null,
        issuer,
      }),
    );
  }

  @Put('sprint-items/:id/destination')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter(
    [ForbiddenException, ForbiddenException],
    [NotFoundException, NotFoundException],
    [BadRequestException, BadRequestException],
  )
  updateSprintItemDestination(
    @Param('id') sprintItemId: number,
    @Body() body: { destinationSprintId: number | null },
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new UpdateSprintItemDestination({
        sprintItemId,
        destinationSprintId: body.destinationSprintId ?? null,
        issuer,
      }),
    );
  }

  @Delete('sprint-items/:id')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter(
    [ForbiddenException, ForbiddenException],
    [NotFoundException, NotFoundException],
  )
  removeSprintItem(@Param('id') sprintItemId: number, @Auth() issuer: Issuer) {
    return this.commandBus.execute(
      new RemoveSprintItem({ sprintItemId, issuer }),
    );
  }
}
