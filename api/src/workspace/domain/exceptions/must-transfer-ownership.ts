export class MustTransferOwnership extends Error {
  constructor(
    message = 'Transfer workspace ownership before leaving or deleting your account',
  ) {
    super(message);
  }
}
