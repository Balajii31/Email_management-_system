import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase';
import { handleApiError, successResponse, errorResponse } from '@/lib/api-helpers';
import { summarizeEmail } from '@/lib/ai-services';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser) return errorResponse('Unauthorized', 401);

    const { id } = await params;

    try {
        const email = await prisma.email.findFirst({
            where: { id, userId: supabaseUser.id }
        });

        if (!email) return errorResponse('Email not found', 404);

        // Check cache
        const existingSummary = await prisma.emailSummary.findUnique({
            where: { emailId: id }
        });

        if (existingSummary) return successResponse(existingSummary.content);

        const summaryContent = await summarizeEmail(email.body);

        const summary = await prisma.emailSummary.create({
            data: {
                emailId: id,
                content: summaryContent
            }
        });

        return successResponse(summary.content, 'Summary generated successfully');
    } catch (error) {
        return handleApiError(error);
    }
}
