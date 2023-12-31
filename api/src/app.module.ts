import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfig } from './app.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeormConfig } from './typeorm.config';
import { DataSource } from 'typeorm';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { MessagingModule } from './messaging/messaging.module';
import { MeetingModule } from './meeting/meeting.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BacklogModule } from './backlog/backlog.module';
import { IssuesModule } from './issues/issues.module';
import { ProductsModule } from './products/products.module';
import { SprintsModule } from './sprints/sprints.module';
import { TimelineModule } from './timeline/timeline.module';
import { ProfileModule } from './profile/profile.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...typeormConfig,
      }),
      dataSourceFactory: async (config) =>
        addTransactionalDataSource(new DataSource(config)),
    }),
    EventEmitterModule.forRoot(),
    AuthModule,
    BacklogModule,
    ChatModule,
    IssuesModule,
    MeetingModule,
    MessagingModule,
    ProductsModule,
    ProfileModule,
    SprintsModule,
    TimelineModule,
  ],
  providers: [AppConfig],
  exports: [AppConfig],
})
export class AppModule {}
