import { QueryBus } from '@nestjs/cqrs';
import { TestingModule } from '@nestjs/testing';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { User } from 'src/auth';
import { Channel, Message, MessageReaction } from 'src/channel/domain';
import {
  createTestingModule,
  startPostgresTestContainer,
  truncateTables,
} from 'src/core/testing/database';
import { Workspace } from 'src/workspace/domain/entities';
import { DataSource } from 'typeorm';
import { Search, SearchScope } from '..';
import { useSeed } from './seed';

describe('SearchQuery', () => {
  let postgres: StartedPostgreSqlContainer;
  let module: TestingModule;
  let dataSource: DataSource;
  let queryBus: QueryBus;

  beforeAll(async () => {
    postgres = await startPostgresTestContainer();
    module = await createTestingModule(postgres);

    dataSource = module.get(DataSource);
    queryBus = module.get(QueryBus);
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

  it('should search entire platform for a query', async () => {
    const { seedWorkspace, seedUsers, seedChannels } = useSeed(dataSource);

    const [workspace] = await seedWorkspace();
    const users = await seedUsers();
    await seedChannels(users, workspace.id);

    const result = await queryBus.execute(
      new Search({
        workspaceId: workspace.id,
        issuerId: users[0].id,
        query: 'Channel',
      }),
    );

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].resource).toBe('channels');
    expect(result[0].data.content.length).toBeGreaterThan(0);
  });

  it('should search a specific channel for a query', async () => {
    const { seedWorkspace, seedUsers, seedChannels } = useSeed(dataSource);

    const [workspace] = await seedWorkspace();
    const users = await seedUsers();
    const [channel1] = await seedChannels(users, workspace.id);

    const result = await queryBus.execute(
      new Search({
        workspaceId: workspace.id,
        issuerId: users[0].id,
        query: 'Channel',
        scope: [
          new SearchScope({
            resourceType: 'channel',
            resourceId: channel1.id,
          }),
        ],
      }),
    );

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].resource).toBe('channels');
    expect(result[0].data.content.length).toBe(1);
    expect(result[0].data.content[0].id).toBe(channel1.id);
  });
});
