import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserCreatedEvent } from 'src/auth/contracts/user-created.event';
import { User } from 'src/auth/domain/entities/user.entity';
import { UserRepository } from 'src/auth/infrastructure/repositories/user.repository';
import { patch } from 'src/core/objects';

export class GoogleSignup {
  @IsNotEmpty()
  name: string;
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  picture?: string;

  constructor(data: Partial<GoogleSignup> = {}) {
    patch(this, data);
  }
}

@CommandHandler(GoogleSignup)
export class GoogleSignupCommand implements ICommandHandler<GoogleSignup> {
  constructor(
    private userRepo: UserRepository,
    private eventEmitter: EventEmitter2,
  ) {}

  async execute({ name, email, picture }: GoogleSignup) {
    const user = await this.userRepo.save(
      User.fromOAuth({ name, email, picture }),
    );
    delete user.password;
    await this.eventEmitter.emitAsync(UserCreatedEvent, user);
    return user;
  }
}
