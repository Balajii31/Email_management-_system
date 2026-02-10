import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase';
import { handleApiError, successResponse, errorResponse } from '@/lib/api-helpers';

export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) return errorResponse('Job ID is required', 400);

    try {
        const job = await prisma.syncJob.findFirst({
            where: { id: jobId, userId: supabaseUser.id }
        });

        if (!job) return errorResponse('Sync job not found', 404);

        return successResponse(job);
    } catch (error) {
        return handleApiError(error);
    }
}
