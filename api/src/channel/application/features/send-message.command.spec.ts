import { CommandBus } from '@nestjs/cqrs';
import { TestingModule } from '@nestjs/testing';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { User } from 'src/auth';
import { Channel, Message, MessageReaction } from 'src/channel/domain';
import { ChannelRepository } from 'src/channel/infrastructure';
import {
  createTestingModule,
  startPostgresTestContainer,
  truncateTables,
} from 'src/core/testing/database';
import { DataSource } from 'typeorm';
import { SendDirectMessage } from './send-direct-message.command';
import { Workspace } from 'src/workspace/domain/entities';

describe('SendMessageCommand', () => {
  let postgres: StartedPostgreSqlContainer;
  let module: TestingModule;
  let dataSource: DataSource;

  let channelRepo: ChannelRepository;
  let commandBus: CommandBus;

  beforeAll(async () => {
    postgres = await startPostgresTestContainer();
    module = await createTestingModule(postgres);

    dataSource = module.get(DataSource);
    channelRepo = module.get(ChannelRepository);
    commandBus = module.get(CommandBus);
  });

  afterAll(async () => {
    await postgres?.stop();
    await module?.close();
  });

  afterEach(async () => {
    await truncateTables(dataSource, [
      MessageReaction,
      Message,
      Channel,
      Workspace,
      User,
    ]);
  });

  function seedWorkspace() {
    return dataSource.manager.save(Workspace, [
      {
        name: 'Test Workspace',
        description: 'Test Workspace Description',
      },
    ]);
  }

  function seedUsers() {
    return dataSource.manager.save(User, [
      {
        name: 'Test User 1',
        email: 'test1@example.com',
        password: 'hashedpassword',
      },
      {
        name: 'Test User 2',
        email: 'test2@example.com',
        password: 'hashedpassword',
      },
      {
        name: 'Test User 3',
        email: 'test3@example.com',
        password: 'hashedpassword',
      },
      {
        name: 'Test User 4',
        email: 'test4@example.com',
        password: 'hashedpassword',
      },
    ]);
  }

  function seedChannels([user1, user2, user3]: User[], workspaceId: number) {
    return dataSource.manager.save(Channel, [
      Channel.create({
        name: 'Channel 1',
        workspaceId,
        type: 'multi-direct',
        peers: [user1, user2],
        dmUserLowerId: Math.min(user1.id, user2.id),
        dmUserGreaterId: Math.max(user1.id, user2.id),
      }),
      Channel.create({
        name: 'Channel 2',
        workspaceId,
        type: 'multi-direct',
        peers: [user1, user3],
        dmUserLowerId: Math.min(user1.id, user3.id),
        dmUserGreaterId: Math.max(user1.id, user3.id),
      }),
      Channel.create({
        name: 'Channel 3',
        workspaceId,
        type: 'multi-direct',
        peers: [user1, user2, user3],
        dmUserLowerId: Math.min(user1.id, user3.id),
        dmUserGreaterId: Math.max(user1.id, user3.id),
      }),
    ]);
  }

  it('should find a multi-direct channel', async () => {
    const users = await seedUsers();
    const channels = await seedChannels(users, 1);

    const [user1, user2, user3, user4] = users;
    const [channel1, channel2, channel3] = channels;

    let result = await channelRepo.findMultiDirectChannel([user1.id, user2.id]);

    expect(result).toBeDefined();
    expect(result.id).toBe(channel1.id);

    result = await channelRepo.findMultiDirectChannel([user1.id, user3.id]);

    expect(result).toBeDefined();
    expect(result.id).toBe(channel2.id);

    result = await channelRepo.findMultiDirectChannel([user1.id, user4.id]);

    expect(result).toBeNull();

    result = await channelRepo.findMultiDirectChannel([
      user1.id,
      user2.id,
      user3.id,
    ]);

    expect(result).toBeDefined();
    expect(result.id).toBe(channel3.id);
  });

  it('should send a message to a multi-direct channel', async () => {
    const [workspace] = await seedWorkspace();
    const users = await seedUsers();
    const channels = await seedChannels(users, workspace.id);

    const [user1, user2, user3, user4] = users;
    const [, , channel3] = channels;

    const result = await commandBus.execute(
      new SendDirectMessage({
        workspaceId: workspace.id,
        senderId: user1.id,
        peers: [user2.id, user3.id],
        content: 'Hello, world!',
      }),
    );

    expect(result).toBeDefined();
    expect(result.channelId).toBe(channel3.id);

    const result2 = await commandBus.execute(
      new SendDirectMessage({
        workspaceId: workspace.id,
        senderId: user1.id,
        peers: [user4.id],
        content: 'Hello, world!',
      }),
    );

    expect(result2.channelId).toBe(4);
  });
});
