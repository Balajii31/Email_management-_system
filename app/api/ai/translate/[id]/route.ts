import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase';
import { handleApiError, successResponse, errorResponse } from '@/lib/api-helpers';
import { translateToTamil } from '@/lib/ai-services';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser) return errorResponse('Unauthorized', 401);

    const { id } = await params; // This is summaryId as per requested structure

    try {
        const body = await request.json();
        const targetLanguage = body.targetLanguage || 'ta';

        const summary = await prisma.emailSummary.findUnique({
            where: { id },
            include: { email: true }
        });

        if (!summary || summary.email.userId !== supabaseUser.id) {
            return errorResponse('Summary not found', 404);
        }

        const emailId = summary.emailId;

        // Check cache
        const existingTranslation = await prisma.emailTranslation.findFirst({
            where: { emailId, targetLanguage }
        });

        if (existingTranslation) return successResponse(existingTranslation.content);

        const translatedContent = await translateToTamil(summary.content);

        const translation = await prisma.emailTranslation.create({
            data: {
                emailId,
                targetLanguage,
                content: translatedContent
            }
        });

        return successResponse(translation.content, 'Translation generated successfully');
    } catch (error) {
        return handleApiError(error);
    }
}
