import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from 'src/core/app.config';
import { AuthController } from './application/controllers/auth.controller';
import { GoogleAuthController } from './application/controllers/google-auth.controller';
import { AuthenticateCommand } from './application/features/authenticate.command';
import { SigninCommand } from './application/features/signin.command';
import { SignupCommand } from './application/features/signup.command';
import { GoogleStrategy } from './application/passport/google.strategy';
import { LocalStrategy } from './application/passport/local.strategy';
import { User } from './domain/entities/user.entity';
import { UserRepository } from './infrastructure/repositories/user.repository';
import { UserController } from './application/controllers/user.controller';
import { UpdateUserPictureCommand } from './application/features/update-user-picture.command';
import { FindUsersQuery } from './application/features/find-users.query';
import { UpdateUserCommand } from './application/features/update-user.command';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        secret: config.JWT_SECRET,
        signOptions: {
          expiresIn: config.JWT_EXPIRES_IN,
        },
      }),
    }),
  ],
  controllers: [AuthController, GoogleAuthController, UserController],
  providers: [
    GoogleStrategy,
    LocalStrategy,
    UserRepository,
    SignupCommand,
    AuthenticateCommand,
    SigninCommand,
    UpdateUserPictureCommand,
    FindUsersQuery,
    UpdateUserCommand,
  ],
  exports: [UserRepository, JwtModule],
})
export class AuthModule {}
