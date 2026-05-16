import { groupBy, minBy, sortBy } from 'lodash';
import { User } from 'src/auth';

export function mapRepliers(
  repliers: { senderId: number; repliesCount: number }[],
  usersMap: Map<number, User>,
) {
  return sortBy(repliers, ['repliesCount', 'senderId'])
    .reverse()
    .map((r) => ({
      user: usersMap.get(r.senderId),
      repliesCount: r.repliesCount,
    }))
    .filter(
      (row): row is { user: User; repliesCount: number } => row.user != null,
    );
}

export type Reaction = {
  emoji: string;
  reactedAt: Date;
  userId: number;
  user: User;
};

export function mapReactions(
  reactions: Reaction[],
  senderId: number,
  usersMap?: Map<number, User>,
) {
  const grouped = groupBy(reactions, 'emoji');
  const aggregatedReactions = Object.entries(grouped).map(
    ([emoji, reactions]) => {
      const reactedAtDates = reactions.map((r) => r.reactedAt);
      return {
        emoji,
        reactedBy: reactions
          .map((r) => (usersMap ? usersMap.get(r.userId) : r.user))
          .filter((u): u is User => u != null),
        firstReactedAt:
          minBy(reactedAtDates, (d) => d.getTime()) ?? reactedAtDates[0]!,
        reactedByMe: reactions.some((r) => r.userId === senderId),
      };
    },
  );

  return sortBy(aggregatedReactions, ['firstReactedAt']);
}

export * from './message-quote-display';
export * from './reply-quote-display';
