import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { UserRepository } from 'src/auth/infrastructure';
import { patch } from 'src/core/objects';

export class UpdateUserPicture {
  userId: number;

  @IsNotEmpty()
  @IsOptional()
  picture?: string;

  constructor(data: Partial<UpdateUserPicture> = {}) {
    patch(this, data);
  }
}

@CommandHandler(UpdateUserPicture)
export class UpdateUserPictureCommand
  implements ICommandHandler<UpdateUserPicture>
{
  constructor(private userRepo: UserRepository) {}

  async execute({ userId, picture }: UpdateUserPicture) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    user.picture = picture;
    return this.userRepo.save(user);
  }
}
