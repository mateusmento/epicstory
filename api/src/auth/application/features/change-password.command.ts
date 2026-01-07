import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { genSalt, hash } from 'bcryptjs';
import { IsNotEmpty, IsString } from 'class-validator';
import { UserRepository } from 'src/auth/infrastructure';
import { AppConfig } from 'src/core/app.config';
import { Issuer } from 'src/core/auth';

export class ChangePassword {
  issuer: Issuer;

  @IsString()
  currentPassword: string;

  @IsNotEmpty()
  newPassword: string;

  constructor(data: Partial<ChangePassword> = {}) {
    Object.assign(this, data);
  }
}

@CommandHandler(ChangePassword)
export class ChangePasswordCommand implements ICommandHandler<ChangePassword> {
  constructor(
    private userRepo: UserRepository,
    private config: AppConfig,
  ) {}

  async execute({ issuer, currentPassword, newPassword }: ChangePassword) {
    const user = await this.userRepo.findOne({ where: { id: issuer.id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.password && !(await user.comparePassword(currentPassword))) {
      throw new ForbiddenException('Current password is incorrect');
    }

    const hashedPassword = await hash(
      newPassword,
      await genSalt(this.config.PASSWORD_ROUNDS),
    );
    user.password = hashedPassword;

    const updatedUser = await this.userRepo.save(user);
    delete updatedUser.password;
    return updatedUser;
  }
}
