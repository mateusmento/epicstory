import {
  BadRequestException,
  Body,
  Controller,
  Patch,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import { userPictureUploadMulterOptions } from 'src/core/multer/user-picture-upload-options';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { UserPictureUploadService } from '../services/user-picture-upload.service';
import { ChangePassword } from '../features/change-password.command';
import { UpdateUserPicture } from '../features/update-user-picture.command';
import { UpdateUser } from '../features/update-user.command';

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
