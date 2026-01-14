import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from 'src/core/app.config';
import * as controllers from './application/controllers';
import * as features from './application/features';
import * as passport from './application/passport';
import { User } from './domain/entities/user.entity';
import * as repositories from './infrastructure/repositories';
import { UserRepository } from './infrastructure/repositories/user.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      global: true,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        secret: config.JWT_SECRET,
        signOptions: {
          expiresIn: config.JWT_EXPIRES_IN,
        },
      }),
    }),
  ],
  controllers: Object.values(controllers),
  providers: [
    ...Object.values(repositories),
    ...Object.values(features),
    ...Object.values(passport),
  ],
  exports: [UserRepository, JwtModule],
})
export class AuthModule {}
