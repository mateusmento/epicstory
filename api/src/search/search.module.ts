import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import entities from 'src/core/typeorm/entities';
import * as controllers from './controllers';
import * as features from './features';

@Module({
  imports: [TypeOrmModule.forFeature(entities)],
  controllers: [...Object.values(controllers)],
  providers: [...Object.values(features)],
})
export class SearchModule {}
