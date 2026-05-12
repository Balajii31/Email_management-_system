import { prisma } from '@/lib/prisma';
import { handleApiError, successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-helpers';

export async function GET() {
    try {
        const auth = await getAuthenticatedUser();

        if (!auth || !auth.supabaseUser) {
            return errorResponse('Unauthorized', 401);
        }

        // We fetch the MongoDB/Prisma user by email from the authenticated session
        const user = await prisma.user.findUnique({
            where: { email: auth.supabaseUser.email! },
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                googleLastSyncAt: true,
                notificationsEnabled: true,
                theme: true
            }
        });

        if (!user) {
            return errorResponse('User profile not found', 404);
        }

        return successResponse(user);
    } catch (error) {
        return handleApiError(error);
    }
}
