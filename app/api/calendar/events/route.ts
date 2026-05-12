import { prisma } from '@/lib/prisma';
import { handleApiError, successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-helpers';
import { z } from 'zod';

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  remindAt: z.string().optional(),
});

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth || !auth.mongoUser) return errorResponse('Unauthorized', 401);

  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  try {
    const events = await prisma.calendarEvent.findMany({
      where: {
        userId: auth.mongoUser.id,
        ...(start && end && {
          startTime: {
            gte: new Date(start),
            lte: new Date(end),
          },
        }),
      },
      orderBy: { startTime: 'asc' },
    });

    return successResponse(events);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth || !auth.mongoUser) return errorResponse('Unauthorized', 401);

  try {
    const body = await request.json();
    const data = eventSchema.parse(body);

    const event = await prisma.calendarEvent.create({
      data: {
        ...data,
        startTime: new Date(data.startTime),
        endTime: data.endTime ? new Date(data.endTime) : null,
        remindAt: data.remindAt ? new Date(data.remindAt) : null,
        userId: auth.mongoUser.id,
      },
    });

    return successResponse(event, 'Event created successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
