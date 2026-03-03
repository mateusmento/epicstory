import { User } from 'src/auth';
import { Channel } from 'src/channel/domain';
import { Workspace } from 'src/workspace/domain/entities';
import { DataSource } from 'typeorm';

export function useSeed(dataSource: DataSource) {
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

  return {
    seedUsers,
    seedWorkspace,
    seedChannels,
  };
}
