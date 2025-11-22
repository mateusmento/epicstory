import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsOptional, isString, IsString } from 'class-validator';
import { UserRepository } from 'src/auth/infrastructure';
import { patch } from 'src/core/objects';
import { Like } from 'typeorm';

export class FindUsers {
  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  name?: string;

  constructor(data: Partial<FindUsers> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindUsers)
export class FindUsersQuery implements IQueryHandler<FindUsers> {
  constructor(private userRepo: UserRepository) {}

  async execute({ username, name }: FindUsers) {
    return this.userRepo.find({
      where: {
        email: isString(username) ? Like(`%${username}%`) : undefined,
        name: isString(name) ? Like(`%${name}%`) : undefined,
      },
    });
  }
}
