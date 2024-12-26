import { NotFoundException } from '@nestjs/common';

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
