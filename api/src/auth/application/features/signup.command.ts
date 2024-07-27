import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { genSalt, hash } from 'bcryptjs';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { UserCreatedEvent } from 'src/auth/contracts/user-created.event';
import { User } from 'src/auth/domain/entities/user.entity';
import { UserRepository } from 'src/auth/infrastructure/repositories/user.repository';

export class Signup {
  @IsNotEmpty()
  name: string;
  @IsEmail()
  email: string;
  @IsNotEmpty()
  password: string;
}

@CommandHandler(Signup)
export class SignupCommand implements ICommandHandler<Signup> {
  constructor(
    private userRepo: UserRepository,
    private eventEmitter: EventEmitter2,
  ) {}

  async execute({ name, email, password }: Signup) {
    password = await hash(password, await genSalt(10));
    const user = await this.userRepo.save(
      User.create({ name, email, password }),
    );
    delete user.password;
    await this.eventEmitter.emitAsync(UserCreatedEvent, user);
    return user;
  }
}
