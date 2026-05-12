import { prisma } from '@/lib/prisma';
import { handleApiError, successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-helpers';
import { z } from 'zod';

const updateEventSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  remindAt: z.string().optional(),
  isCompleted: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthenticatedUser();
  if (!auth || !auth.mongoUser) return errorResponse('Unauthorized', 401);

  try {
    const { id } = params;
    const body = await request.json();
    const data = updateEventSchema.parse(body);

    // Verify ownership
    const existing = await prisma.calendarEvent.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing || existing.userId !== auth.mongoUser.id) {
      return errorResponse('Event not found', 404);
    }

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...data,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        remindAt: data.remindAt ? new Date(data.remindAt) : undefined,
      },
    });

    return successResponse(event, 'Event updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthenticatedUser();
  if (!auth || !auth.mongoUser) return errorResponse('Unauthorized', 401);

  try {
    const { id } = params;

    // Verify ownership
    const existing = await prisma.calendarEvent.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing || existing.userId !== auth.mongoUser.id) {
      return errorResponse('Event not found', 404);
    }

    await prisma.calendarEvent.delete({
      where: { id },
    });

    return successResponse(null, 'Event deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
