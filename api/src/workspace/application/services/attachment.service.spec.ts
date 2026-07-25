import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { AppConfig } from 'src/core/app.config';
import { AttachmentService } from './attachment.service';

jest.mock('src/core/aws', () => ({
  createS3Client: () => ({
    send: jest.fn().mockResolvedValue({}),
  }),
}));

describe('AttachmentService.deleteBlobsIfStillUnreferenced', () => {
  const query = jest.fn();
  const s3Send = jest.fn().mockResolvedValue({});

  let service: AttachmentService;

  beforeEach(() => {
    query.mockReset();
    s3Send.mockReset().mockResolvedValue({});

    const attachments = {
      manager: { query },
    };

    const config = {
      AWS_BUCKET: 'test-bucket',
      ATTACHMENT_S3_ORPHAN_GRACE_HOURS: 24,
    } as AppConfig;

    service = new AttachmentService(attachments as never, config);
    // Replace S3 client created in constructor with our spy.
    (service as unknown as { s3: { send: typeof s3Send } }).s3 = {
      send: s3Send,
    };
  });

  it('returns empty when no ids', async () => {
    await expect(service.deleteBlobsIfStillUnreferenced([])).resolves.toEqual(
      [],
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('DELETE SQL re-checks issue_id and all join tables', async () => {
    query.mockResolvedValueOnce([]);
    await service.deleteBlobsIfStillUnreferenced([1, 2]);

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0] as [string, number[][]];
    expect(sql).toMatch(/issue_id IS NULL/);
    expect(sql).toMatch(/message_attachments/);
    expect(sql).toMatch(/message_reply_attachments/);
    expect(sql).toMatch(/message_draft_attachments/);
    expect(sql).toMatch(/scheduled_job_attachments/);
    expect(sql).toMatch(/RETURNING a\.id, a\.storage_key/);
    expect(params).toEqual([[1, 2]]);
  });

  it('does not touch S3 when DELETE returns no rows (still referenced)', async () => {
    query.mockResolvedValueOnce([]);
    const deleted = await service.deleteBlobsIfStillUnreferenced([42]);
    expect(deleted).toEqual([]);
    expect(s3Send).not.toHaveBeenCalled();
  });

  it('deletes S3 only for rows the atomic DELETE returned', async () => {
    query.mockResolvedValueOnce([
      { id: 7, storage_key: 'attachments/w-1/a.bin' },
    ]);
    const deleted = await service.deleteBlobsIfStillUnreferenced([7, 8]);
    expect(deleted).toEqual([7]);
    expect(s3Send).toHaveBeenCalledTimes(1);
    const cmd = s3Send.mock.calls[0][0] as DeleteObjectCommand;
    expect(cmd.input).toMatchObject({
      Bucket: 'test-bucket',
      Key: 'attachments/w-1/a.bin',
    });
  });
});
