import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import {
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
import { Request } from 'express';
import { StorageEngine } from 'multer';
import * as sharp from 'sharp';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { ChangePassword } from '../features/change-password.command';
import { UpdateUserPicture } from '../features/update-user-picture.command';
import { UpdateUser } from '../features/update-user.command';

class S3StorageEngine implements StorageEngine {
  private s3: S3Client;

  constructor() {
    this.s3 =
      process.env.NODE_ENV === 'production'
        ? new S3Client({
            region: process.env.AWS_REGION,
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
          })
        : new S3Client();
  }

  async _handleFile(
    req: Request,
    file: Express.Multer.File,
    callback: (error?: any, info?: Partial<Express.Multer.File>) => void,
  ) {
    const imageProcessing = sharp().resize(120, 120);
    const finalImage = file.stream.pipe(imageProcessing);

    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: process.env.AWS_BUCKET,
        Key: file.originalname,
        ContentType: file.mimetype,
        Body: finalImage,
      },
    });

    try {
      const { Location } = await upload.done();
      callback(null, { ...file, path: Location });
    } catch (err) {
      callback(err, null);
    }
  }

  async _removeFile(
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null) => void,
  ) {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET,
          Key: file.originalname,
        }),
      );
      callback(null);
    } catch (err) {
      callback(err);
    }
  }
}

@Controller('/users')
export class UserController {
  constructor(private commandBus: CommandBus) {}

  @Patch()
  @UseGuards(JwtAuthGuard)
  updateUser(@Body() command: UpdateUser, @Auth() issuer: Issuer) {
    return this.commandBus.execute(new UpdateUser({ ...command, issuer }));
  }

  @Put('/picture')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('picture', { storage: new S3StorageEngine() }),
  )
  updatePicture(
    @UploadedFile()
    file: Express.Multer.File,
    @Body() command: UpdateUserPicture,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new UpdateUserPicture({ userId: issuer.id, picture: file.path }),
    );
  }

  @Patch('/password')
  @UseGuards(JwtAuthGuard)
  changePassword(@Body() command: ChangePassword, @Auth() issuer: Issuer) {
    return this.commandBus.execute(new ChangePassword({ ...command, issuer }));
  }
}
