import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { IdentityRepository } from 'src/auth/infrastructure/repositories/identity.repository';
import { patch } from 'src/core/objects';
import { FindUser } from 'src/user/application/features/find-user.query';

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
  constructor(
    private identityRepo: IdentityRepository,
    private queryBus: QueryBus,
  ) {}

  async execute({ email, password }: Authenticate) {
    const identity = await this.identityRepo.findOne({ where: { email } });
    if (!identity) throw new NotFoundException('Identity not found');
    if (!(await identity.comparePassword(password)))
      throw new ForbiddenException('Wrong credentials');
    return this.queryBus.execute(new FindUser({ id: identity.userId }));
  }
}
