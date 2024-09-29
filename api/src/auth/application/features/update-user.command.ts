import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { UserRepository } from 'src/auth/infrastructure';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';

export class UpdateUser {
  issuer: Issuer;

  @IsNotEmpty()
  @IsOptional()
  name?: string;

  constructor(data: Partial<UpdateUser> = {}) {
    patch(this, data);
  }
}

@CommandHandler(UpdateUser)
export class UpdateUserCommand implements ICommandHandler<UpdateUser> {
  constructor(private userRepo: UserRepository) {}

  async execute({ issuer, ...data }: UpdateUser) {
    const user = await this.userRepo.findOne({ where: { id: issuer.id } });
    if (!user) throw new NotFoundException('Issuer user not found');
    patch(user, data);
    return this.userRepo.save(user);
  }
}
