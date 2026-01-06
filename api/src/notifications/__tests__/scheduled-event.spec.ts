import { Test, TestingModule } from '@nestjs/testing';
import { ScheduledEventRepository } from '../repositories/scheduled-event.repository';

describe('ScheduledEvent', () => {
  let repository: ScheduledEventRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScheduledEventRepository],
    }).compile();

    repository = module.get<ScheduledEventRepository>(ScheduledEventRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });
});
