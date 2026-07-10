import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Patch,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ExceptionFilter } from 'src/core';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { userPictureUploadMulterOptions } from 'src/core/multer/user-picture-upload-options';
import { MustTransferOwnership } from 'src/workspace/domain/exceptions';
import { ChangePassword } from '../features/change-password.command';
import { DeleteUserAccount } from '../features/delete-user-account.command';
import { UpdateUserPicture } from '../features/update-user-picture.command';
import { UpdateUser } from '../features/update-user.command';
import { UserPictureUploadService } from '../services/user-picture-upload.service';

@Controller('/users')
export class UserController {
  constructor(
    private commandBus: CommandBus,
    private userPictureUpload: UserPictureUploadService,
  ) {}

  @Patch()
  @UseGuards(JwtAuthGuard)
  updateUser(@Body() command: UpdateUser, @Auth() issuer: Issuer) {
    return this.commandBus.execute(new UpdateUser({ ...command, issuer }));
  }

  @Delete('/me')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([MustTransferOwnership, ForbiddenException])
  async deleteAccount(
    @Auth() issuer: Issuer,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.commandBus.execute(
      new DeleteUserAccount({ issuer }),
    );
    res.clearCookie('token');
    return result;
  }

  @Put('/picture')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('picture', userPictureUploadMulterOptions))
  async updatePicture(
    @UploadedFile() file: Express.Multer.File,
    @Body() command: UpdateUserPicture,
    @Auth() issuer: Issuer,
  ) {
    if (!file || file.size === 0) {
      throw new BadRequestException('Missing file');
    }
    const pictureUrl = await this.userPictureUpload.uploadFromMulterFile(
      issuer.id,
      file,
    );
    return this.commandBus.execute(
      new UpdateUserPicture({ userId: issuer.id, picture: pictureUrl }),
    );
  }

  @Patch('/password')
  @UseGuards(JwtAuthGuard)
  changePassword(@Body() command: ChangePassword, @Auth() issuer: Issuer) {
    return this.commandBus.execute(new ChangePassword({ ...command, issuer }));
  }
}
