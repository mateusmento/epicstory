import { ForbiddenException, NotFoundException } from '@nestjs/common';

export class MeetingHasntStartedException extends Error {
  constructor() {
    super('Meeting hasnt started');
  }
}

export class MeetingOngoingException extends Error {
  constructor() {
    super('Meeting already ongoing');
  }
}

export class MeetingNotFoundException extends NotFoundException {
  constructor() {
    super('Meeting not found');
  }
}

export class MessageNotFound extends NotFoundException {
  constructor() {
    super('Message not found');
  }
}

export class ChannelNotFound extends NotFoundException {
  constructor() {
    super('Channel not found');
  }
}

export class IssuerIsNotChannelMember extends ForbiddenException {
  constructor() {
    super('Issuer is not a channel member');
  }
}

export class IssuerCanOnlyDeleteOwnMessages extends ForbiddenException {
  constructor() {
    super('Issuer can only delete own messages');
  }
}

export class IssuerCanOnlyDeleteOwnReplies extends ForbiddenException {
  constructor() {
    super('Issuer can only delete own replies');
  }
}

export class MessageReplyNotFound extends NotFoundException {
  constructor() {
    super('Message reply not found');
  }
}
