import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LinearImportJobRepository } from '../repositories';
import { LinearImportProcessorService } from '../services/linear-import-processor.service';

@Injectable()
export class LinearImportCronjob {
  private readonly logger = new Logger(LinearImportCronjob.name);

  constructor(
    private jobRepo: LinearImportJobRepository,
    private processor: LinearImportProcessorService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleCron() {
    const [lockId, jobs] = await this.jobRepo.claimDueJobs({ batchSize: 5 });
    if (!jobs.length) return;

    this.logger.debug(`Claimed ${jobs.length} Linear import jobs`);

    for (const job of jobs) {
      try {
        await this.processor.process(job);
        await this.jobRepo.markAsCompleted(job.id, lockId);
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        this.logger.error(
          `Linear import job ${job.id} failed: ${msg}`,
          e?.stack,
        );
        if (msg.includes('Linear connection not found')) {
          await this.jobRepo.markAsPermanentlyFailed(job.id, lockId, msg);
        } else {
          await this.jobRepo.markFailure(job.id, lockId, msg);
        }
      }
    }
  }
}
