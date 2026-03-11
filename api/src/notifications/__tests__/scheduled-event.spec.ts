import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ScheduledEvent } from '../entities/scheduled-event.entity';
import { ScheduledEventRepository } from '../repositories/scheduled-event.repository';

describe('ScheduledEvent', () => {
  let repository: ScheduledEventRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduledEventRepository,
        {
          // ScheduledEventRepository extends TypeORM Repository and expects an injected Repository<ScheduledEvent>
          provide: getRepositoryToken(ScheduledEvent),
          useValue: {
            target: ScheduledEvent,
            manager: { query: jest.fn() },
            queryRunner: undefined,
          },
        },
      ],
    }).compile();

    repository = module.get<ScheduledEventRepository>(ScheduledEventRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });
});
