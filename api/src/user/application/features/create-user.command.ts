import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { patch } from 'src/core/objects';
import { UserRepository } from 'src/user/infrastructure/repository/user.repository';

export class CreateUser {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  constructor(data: Partial<CreateUser> = {}) {
    patch(this, data);
  }
}

@CommandHandler(CreateUser)
export class CreateUserCommand implements ICommandHandler<CreateUser> {
  constructor(private userRepo: UserRepository) {}

  async execute(command: CreateUser) {
    return this.userRepo.save(command);
  }
}
