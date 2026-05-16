import {
  assertQuotedParentMessageInChannel,
  assertQuotedReplyInThread,
  QuotedContentRuleError,
} from './quoted-content.rules';

describe('quoted-content.rules', () => {
  describe('assertQuotedParentMessageInChannel', () => {
    it('throws when target is missing', () => {
      expect(() => assertQuotedParentMessageInChannel(null, 10)).toThrow(
        QuotedContentRuleError,
      );
      expect(() => assertQuotedParentMessageInChannel(null, 10)).toThrow(
        'Quoted message not found',
      );
    });

    it('throws when channel mismatches', () => {
      expect(() =>
        assertQuotedParentMessageInChannel({ channelId: 2 }, 10),
      ).toThrow('Quoted message must belong to this channel');
    });

    it('passes when channel matches', () => {
      expect(() =>
        assertQuotedParentMessageInChannel({ channelId: 10 }, 10),
      ).not.toThrow();
    });
  });

  describe('assertQuotedReplyInThread', () => {
    it('throws when target is missing', () => {
      expect(() => assertQuotedReplyInThread(null, 1, 99)).toThrow(
        'Quoted reply not found',
      );
    });

    it('throws when channel mismatches', () => {
      expect(() =>
        assertQuotedReplyInThread({ channelId: 2, messageId: 99 }, 10, 99),
      ).toThrow('Quoted reply must belong to this channel');
    });

    it('throws when thread mismatches', () => {
      expect(() =>
        assertQuotedReplyInThread({ channelId: 10, messageId: 1 }, 10, 99),
      ).toThrow('Quoted reply must belong to this thread');
    });

    it('passes when channel and thread match', () => {
      expect(() =>
        assertQuotedReplyInThread({ channelId: 10, messageId: 99 }, 10, 99),
      ).not.toThrow();
    });
  });
});
