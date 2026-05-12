import { prisma } from '@/lib/prisma';
import { chatWithEmailContext } from '@/lib/ai-services';
import { retrieveRelevantEmails } from '@/lib/chat-retrieval';
import {
  errorResponse,
  getAuthenticatedUser,
  handleApiError,
  successResponse,
} from '@/lib/api-helpers';
import { chatRequestSchema } from '@/lib/validation-schemas';

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser();

  if (!auth || !auth.mongoUser) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const db = prisma as any;
    const body = await request.json();
    const parsed = chatRequestSchema.parse(body);

    let session;

    if (parsed.sessionId) {
      session = await db.chatSession.findFirst({
        where: {
          id: parsed.sessionId,
          userId: auth.mongoUser.id,
        },
      });
    }

    if (!session) {
      session = await db.chatSession.create({
        data: {
          userId: auth.mongoUser.id,
          title: parsed.message.slice(0, 80),
          lastMessageAt: new Date(),
        },
      });
    }

    const history: Array<{ role: string; content: string }> = await db.chatMessage.findMany({
      where: {
        sessionId: session.id,
      },
      orderBy: { createdAt: 'asc' },
      take: 8,
      select: {
        role: true,
        content: true,
      },
    });

    const contextEmails = await retrieveRelevantEmails({
      userId: auth.mongoUser.id,
      query: parsed.message,
      selectedEmailId: parsed.selectedEmailId,
      limit: 6,
    });

    const assistantMessage = await chatWithEmailContext({
      message: parsed.message,
      history: history.filter((m: { role: string; content: string }) => m.role === 'user' || m.role === 'assistant') as Array<{
        role: 'user' | 'assistant';
        content: string;
      }>,
      contextEmails,
    });

    const citations = contextEmails.slice(0, 4).map((email) => ({
      id: email.id,
      subject: email.subject,
      from: email.from,
      createdAt: email.createdAt,
    }));

    await db.$transaction([
      db.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'user',
          content: parsed.message,
        },
      }),
      db.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'assistant',
          content: assistantMessage,
          citations,
        },
      }),
      db.chatSession.update({
        where: { id: session.id },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    return successResponse({
      sessionId: session.id,
      answer: assistantMessage,
      citations,
      suggestedActions: [
        'Summarize top pending emails',
        'Find billing and invoice emails',
        'Draft a reply for selected email',
      ],
    });
  } catch (error) {
    return handleApiError(error);
  }
}
