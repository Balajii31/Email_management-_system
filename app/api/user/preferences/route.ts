import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase';
import { handleApiError, successResponse, errorResponse } from '@/lib/api-helpers';
import { userPreferencesSchema } from '@/lib/validation-schemas';

export async function GET() {
    const supabase = await createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser) return errorResponse('Unauthorized', 401);

    try {
        const user = await prisma.user.findUnique({
            where: { id: supabaseUser.id },
            select: {
                syncFrequency: true,
                notificationsEnabled: true,
                theme: true
            }
        });

        return successResponse(user);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PATCH(request: Request) {
    const supabase = await createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser) return errorResponse('Unauthorized', 401);

    try {
        const body = await request.json();
        const data = userPreferencesSchema.parse(body);

        const updatedUser = await prisma.user.update({
            where: { id: supabaseUser.id },
            data,
        });

        return successResponse(updatedUser, 'Preferences updated successfully');
    } catch (error) {
        return handleApiError(error);
    }
}
