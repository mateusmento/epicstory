import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LinearImportJob } from '../entities';
import { randomUUID } from 'crypto';

@Injectable()
export class LinearImportJobRepository extends Repository<LinearImportJob> {
  private readonly MAX_RETRIES = 5;

  constructor(
    @InjectRepository(LinearImportJob) repo: Repository<LinearImportJob>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async claimDueJobs(options?: {
    batchSize?: number;
  }): Promise<[lockId: string, jobs: LinearImportJob[]]> {
    const lockId = randomUUID();
    const batchSize = options?.batchSize ?? 20;

    const sql = `
      WITH locked_rows AS (
        SELECT id, retry_count, last_retry_at
        FROM integration.linear_import_jobs
        WHERE
          status IN ('pending', 'retry')
          AND (
            lock_id IS NULL
            OR locked_at < now() - interval '5 minutes'
          )
          AND retry_count < $3
          AND (
            retry_count = 0 OR last_retry_at IS NULL
            OR last_retry_at + (
              (interval '1 minute') * power(2, GREATEST(0, retry_count - 1))::int
            ) <= now()
          )
        ORDER BY created_at ASC, id ASC
        LIMIT $2
        FOR UPDATE SKIP LOCKED
      )
      UPDATE integration.linear_import_jobs j
      SET
        lock_id = $1,
        locked_at = now(),
        status = 'running',
        started_at = COALESCE(started_at, now())
      FROM locked_rows
      WHERE j.id = locked_rows.id
      RETURNING
        j.id,
        j.linear_connection_id,
        j.workspace_id,
        j.created_by_user_id,
        j.status,
        j.params,
        j.progress,
        j.last_error,
        j.created_at,
        j.started_at,
        j.finished_at,
        j.lock_id,
        j.locked_at,
        j.retry_count,
        j.last_retry_at;
    `;

    const result = await this.manager.query(sql, [
      lockId,
      batchSize,
      this.MAX_RETRIES,
    ]);

    // TypeORM + pg can return either:
    // - rows[]
    // - [rows[], rowCount]
    // Normalize to rows[].
    const rows: any[] =
      Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;

    const jobs = rows.map((row) =>
      Object.assign(new LinearImportJob(), {
        id: row.id,
        linearConnectionId: row.linear_connection_id,
        workspaceId: row.workspace_id,
        createdByUserId: row.created_by_user_id,
        status: row.status,
        params: row.params,
        progress: row.progress,
        lastError: row.last_error,
        createdAt: row.created_at,
        startedAt: row.started_at,
        finishedAt: row.finished_at,
        lockId: row.lock_id,
        lockedAt: row.locked_at,
        retryCount: row.retry_count,
        lastRetryAt: row.last_retry_at,
      }),
    );

    return [lockId, jobs];
  }

  async markAsCompleted(jobId: string, lockId: string) {
    await this.manager.query(
      `UPDATE integration.linear_import_jobs
       SET status = 'completed',
           finished_at = now(),
           lock_id = NULL,
           locked_at = NULL,
           last_error = NULL
       WHERE id = $1 AND lock_id = $2`,
      [jobId, lockId],
    );
  }

  async markFailure(jobId: string, lockId: string, lastError: string) {
    const result = await this.manager.query(
      `UPDATE integration.linear_import_jobs
       SET
         lock_id = NULL,
         locked_at = NULL,
         retry_count = retry_count + 1,
         last_error = $3,
         last_retry_at = now(),
         status = CASE
           WHEN retry_count + 1 >= $4 THEN 'failed'
           ELSE 'retry'
         END,
         finished_at = CASE
           WHEN retry_count + 1 >= $4 THEN now()
           ELSE finished_at
         END
       WHERE id = $1 AND lock_id = $2
       RETURNING retry_count, status`,
      [jobId, lockId, lastError, this.MAX_RETRIES],
    );

    return {
      retryCount: (result?.[0]?.retry_count as number) ?? 0,
      status: (result?.[0]?.status as string) ?? 'retry',
    };
  }

  async markAsPermanentlyFailed(
    jobId: string,
    lockId: string,
    lastError: string,
  ) {
    await this.manager.query(
      `UPDATE integration.linear_import_jobs
       SET status = 'failed',
           finished_at = now(),
           lock_id = NULL,
           locked_at = NULL,
           retry_count = $3,
           last_error = $4,
           last_retry_at = now()
       WHERE id = $1 AND lock_id = $2`,
      [jobId, lockId, this.MAX_RETRIES, lastError],
    );
  }
}
