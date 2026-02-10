import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase';
import { handleApiError, successResponse, errorResponse } from '@/lib/api-helpers';

export async function GET() {
    const supabase = await createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser) return errorResponse('Unauthorized', 401);

    try {
        const [total, unread, highPriority, spam] = await Promise.all([
            prisma.email.count({ where: { userId: supabaseUser.id, deletedAt: null } }),
            prisma.email.count({ where: { userId: supabaseUser.id, isRead: false, deletedAt: null } }),
            prisma.email.count({ where: { userId: supabaseUser.id, priority: 'high', deletedAt: null } }),
            prisma.email.count({ where: { userId: supabaseUser.id, isSpam: true, deletedAt: null } }),
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
