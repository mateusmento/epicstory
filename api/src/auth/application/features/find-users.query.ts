import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  IsInt,
  IsOptional,
  isString,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { UserRepository } from 'src/auth/infrastructure';
import { patch } from 'src/core/objects';
import { Page } from 'src/core/page';
import { Like } from 'typeorm';

export class FindUsers {
  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  name?: string;

  /**
   * 0-based page number.
   */
  @IsInt()
  @Min(0)
  @IsOptional()
  page?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  count?: number;

  constructor(data: Partial<FindUsers> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindUsers)
export class FindUsersQuery implements IQueryHandler<FindUsers> {
  constructor(private userRepo: UserRepository) {}

  async execute({ username, name, page = 0, count = 20 }: FindUsers) {
    const users = await this.userRepo.find({
      where: {
        email: isString(username) ? Like(`%${username}%`) : undefined,
        name: isString(name) ? Like(`%${name}%`) : undefined,
      },
      order: {
        name: 'ASC',
        id: 'ASC',
      },
      take: count,
      skip: page * count,
    });

    const total = await this.userRepo.count({
      where: {
        email: isString(username) ? Like(`%${username}%`) : undefined,
        name: isString(name) ? Like(`%${name}%`) : undefined,
      },
    });

    const result = Page.fromResult(users, total, { page, count });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (!result.hasNext) {
      const users = Array.from(
        { length: count - result.content.length },
        (_, i) => ({
          id: i + 1 + page * count,
          name: `User ${i + 1 + page * count}`,
          email: `user${i + 1 + page * count}@example.com`,
          picture: `https://i.pravatar.cc/150?img=${i + 1 + page * count}`,
        }),
      ).filter((u) => u.name.toLowerCase().includes(name?.toLowerCase() ?? ''));

      return Page.fromResult([result.content, users].flat(), total + 200, {
        page,
        count,
      });
    }

    return result;
  }
}
