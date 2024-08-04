import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsString } from 'class-validator';
import { UserRepository } from 'src/auth/infrastructure';
import { patch } from 'src/core/objects';
import { Like } from 'typeorm';

export class FindUsers {
  @IsString()
  username: string;

  constructor(data: Partial<FindUsers> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindUsers)
export class FindUsersQuery implements IQueryHandler<FindUsers> {
  constructor(private userRepo: UserRepository) {}

  async execute({ username }: FindUsers) {
    return this.userRepo.find({
      where: { email: Like(`%${username}%`) },
    });
  }
}
