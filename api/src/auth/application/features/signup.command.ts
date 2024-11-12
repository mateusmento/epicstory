import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { genSalt, hash } from 'bcryptjs';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { Identity } from 'src/auth/domain/entities/identity.entity';
import { IdentityRepository } from 'src/auth/infrastructure/repositories/identity.repository';
import { CreateUser } from 'src/user/application/features/create-user.command';

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
    private identityRepo: IdentityRepository,
    private commandBus: CommandBus,
  ) {}

  async execute({ name, email, password }: Signup) {
    const user = await this.commandBus.execute(new CreateUser({ name, email }));
    password = await hash(password, await genSalt(10));
    const identity = Identity.create({ email, password, userId: user.id });
    return this.identityRepo.save(identity);
  }
}
