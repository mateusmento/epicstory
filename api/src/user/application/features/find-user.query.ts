import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsEmail, IsNumber } from 'class-validator';
import { patch } from 'src/core/objects';
import { UserRepository } from 'src/user/infrastructure/repository/user.repository';

export class FindUser {
  @IsNumber()
  id: number;

  @IsEmail()
  email: string;

  constructor(data: Partial<FindUser>) {
    patch(this, data);
  }
}

@QueryHandler(FindUser)
export class FindUserQuery implements IQueryHandler<FindUser> {
  constructor(private userRepo: UserRepository) {}

  async execute({ id, email }: FindUser) {
    return this.userRepo.findOne({ where: { id, email } });
  }
}
