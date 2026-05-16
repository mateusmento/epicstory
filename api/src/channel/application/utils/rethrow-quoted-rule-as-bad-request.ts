import { BadRequestException } from '@nestjs/common';
import { QuotedContentRuleError } from 'src/channel/domain/rules/quoted-content.rules';

/** Maps domain quoting invariants to HTTP 400 for Nest handlers/services. */
export function rethrowQuotedRuleAsBadRequest(error: unknown): never {
  if (error instanceof QuotedContentRuleError) {
    throw new BadRequestException(error.message);
  }
  throw error;
}
