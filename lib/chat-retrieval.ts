import { prisma } from '@/lib/prisma';

type RetrievalEmail = {
  id: string;
  from: string;
  subject: string;
  body: string;
  createdAt: Date;
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 3)
    .slice(0, 20);
}

function scoreEmail(email: RetrievalEmail, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;

  const subject = email.subject.toLowerCase();
  const from = email.from.toLowerCase();
  const body = email.body.toLowerCase();

  let score = 0;
  for (const token of queryTokens) {
    if (subject.includes(token)) score += 4;
    if (from.includes(token)) score += 2;
    if (body.includes(token)) score += 1;
  }

  return score;
}

export async function retrieveRelevantEmails(input: {
  userId: string;
  query: string;
  selectedEmailId?: string;
  limit?: number;
}): Promise<RetrievalEmail[]> {
  const limit = input.limit ?? 6;
  const queryTokens = tokenize(input.query);

  let recentEmails = await prisma.email.findMany({
    where: {
      userId: input.userId,
      isDraft: false,
    },
    orderBy: { createdAt: 'desc' },
    take: 60,
    select: {
      id: true,
      from: true,
      subject: true,
      body: true,
      createdAt: true,
    },
  });

  // Mongo deployments in this project can be inconsistent with nullable filters.
  // If nothing is found, retry with only user scope so chatbot still has context.
  if (recentEmails.length === 0) {
    recentEmails = await prisma.email.findMany({
      where: {
        userId: input.userId,
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: {
        id: true,
        from: true,
        subject: true,
        body: true,
        createdAt: true,
      },
    });
  }

  const ranked = recentEmails
    .map((email) => {
      const selectedBoost = input.selectedEmailId && email.id === input.selectedEmailId ? 1000 : 0;
      return {
        email,
        score: scoreEmail(email, queryTokens) + selectedBoost,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.email);

  if (ranked.length > 0) {
    return ranked;
  }

  return recentEmails.slice(0, limit);
}
