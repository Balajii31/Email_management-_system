import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase';
import { handleApiError, successResponse, errorResponse } from '@/lib/api-helpers';
import { extractFeatures, detectSpam } from '@/lib/spam-detector';
import { classifyPriority } from '@/lib/priority-classifier';

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser) return errorResponse('Unauthorized', 401);

    try {
        const { emailIds } = await request.json();
        if (!Array.isArray(emailIds)) return errorResponse('emailIds must be an array', 400);

        const emails = await prisma.email.findMany({
            where: {
                id: { in: emailIds },
                userId: supabaseUser.id
            }
        });

        const results = [];
        for (const email of emails) {
            const features = extractFeatures(email.from, email.subject, email.body);
            const spamResult = detectSpam(features);
            const priorityResult = classifyPriority(email.from, email.subject, email.body);

            const updated = await prisma.email.update({
                where: { id: email.id },
                data: {
                    isSpam: spamResult.isSpam,
                    priority: priorityResult.priority.toLowerCase(),
                    folder: spamResult.isSpam ? 'spam' : email.folder
                }
            });
            results.push(updated);
        }

        return successResponse(results, `Processed ${results.length} emails`);
    } catch (error) {
        return handleApiError(error);
    }
}
