import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/entities/user.entity';
import { UserController } from './application/controllers/user.controller';
import { CreateUserCommand } from './application/features/create-user.command';
import { UserRepository } from './infrastructure/repository/user.repository';
import { FindUserQuery } from './application/features/find-user.query';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserRepository, CreateUserCommand, FindUserQuery],
})
export class UserModule {}
