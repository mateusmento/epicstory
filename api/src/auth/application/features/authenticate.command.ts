import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { UserRepository } from 'src/auth/infrastructure/repositories/user.repository';
import { patch } from 'src/core/objects';

export class Authenticate {
  @IsEmail()
  email: string;
  @IsNotEmpty()
  password: string;

  constructor(data: Partial<Authenticate> = {}) {
    patch(this, data);
  }
}

@CommandHandler(Authenticate)
export class AuthenticateCommand implements ICommandHandler<Authenticate> {
  constructor(private userRepo: UserRepository) {}

  async execute({ email, password }: Authenticate) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    if (!(await user.comparePassword(password)))
      throw new ForbiddenException('Wrong credentials');
    delete user.password;
    return user;
  }
}
