import { prisma } from '@/lib/prisma';
import { handleApiError, successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-helpers';

export async function GET() {
    const auth = await getAuthenticatedUser();

    if (!auth || !auth.mongoUser) {
        return errorResponse('Unauthorized', 401);
    }

    try {
        const [total, unread, highPriority, spam] = await Promise.all([
            prisma.email.count({ where: { userId: auth.mongoUser.id, deletedAt: null } }),
            prisma.email.count({ where: { userId: auth.mongoUser.id, isRead: false, deletedAt: null } }),
            prisma.email.count({ where: { userId: auth.mongoUser.id, priority: 'high', deletedAt: null } }),
            prisma.email.count({ where: { userId: auth.mongoUser.id, isSpam: true, deletedAt: null } }),
        ]);

        const stats = {
            total,
            unread,
            highPriority,
            spam,
        };

        return successResponse(stats);
    } catch (error) {
        return handleApiError(error);
    }
}
