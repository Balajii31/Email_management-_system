import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { getGmailClient, fetchEmails, getEmailContent } from '@/lib/gmail-client';
import { extractFeatures, detectSpam } from '@/lib/spam-detector';
import { classifyPriority } from '@/lib/priority-classifier';
import { handleApiError, successResponse, errorResponse } from '@/lib/api-helpers';

export async function POST() {
    const supabase = await createClient();
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !supabaseUser) {
        return errorResponse('Unauthorized', 401);
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: supabaseUser.email },
        });

        if (!user) return errorResponse('User not found', 404);

        // Create a SyncJob record
        const job = await prisma.syncJob.create({
            data: {
                userId: user.id,
                status: 'PROCESSING',
                startedAt: new Date(),
            }
        });

        // Start sync process (in a real app, this would be a background worker)
        // We'll run it and catch errors to update the job status
        runSync(user.id, job.id).catch(err => {
            console.error('Background sync error:', err);
        });

        return successResponse({ jobId: job.id }, 'Sync initiated');
    } catch (error) {
        return handleApiError(error);
    }
}

async function runSync(userId: string, jobId: string) {
    try {
        const { messages } = await fetchEmails(userId);
        const total = messages.length;
        let syncedCount = 0;

        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            if (!msg.id) continue;

            const existing = await prisma.email.findUnique({
                where: { googleMessageId: msg.id },
            });

            if (!existing) {
                const details = await getEmailContent(userId, msg.id);
                const headers = details.payload?.headers || [];
                const from = headers.find((h: any) => h.name?.toLowerCase() === 'from')?.value || '';
                const to = (headers.find((h: any) => h.name?.toLowerCase() === 'to')?.value || '').split(',').map((s: string) => s.trim());
                const subject = headers.find((h: any) => h.name?.toLowerCase() === 'subject')?.value || '(No Subject)';
                const timestamp = new Date(parseInt(details.internalDate || Date.now().toString()));

                let body = '';
                if (details.payload?.parts) {
                    const textPart = details.payload.parts.find((p: any) => p.mimeType === 'text/plain');
                    body = textPart?.body?.data || details.payload.parts[0].body?.data || '';
                } else {
                    body = details.payload?.body?.data || '';
                }
                body = Buffer.from(body, 'base64').toString('utf-8');

                // AI/ML Pipeline
                const features = extractFeatures(from, subject, body);
                const spamResult = detectSpam(features);
                const priorityResult = classifyPriority(from, subject, body);

                const isSpam = spamResult.isSpam || details.labelIds?.includes('SPAM');
                const folder = isSpam ? 'spam' :
                    details.labelIds?.includes('SENT') ? 'sent' :
                        details.labelIds?.includes('DRAFT') ? 'drafts' : 'inbox';

                await prisma.email.create({
                    data: {
                        userId,
                        googleMessageId: msg.id,
                        googleThreadId: details.threadId,
                        from,
                        to,
                        subject,
                        body,
                        priority: priorityResult.priority.toLowerCase(),
                        isRead: !details.labelIds?.includes('UNREAD'),
                        isSpam,
                        folder,
                        createdAt: timestamp,
                    },
                });
                syncedCount++;
            }

            // Update progress every 5 emails or at the end
            if (i % 5 === 0 || i === total - 1) {
                const progress = Math.round(((i + 1) / total) * 100);
                await prisma.syncJob.update({
                    where: { id: jobId },
                    data: { progress }
                });
            }
        }

        await prisma.syncJob.update({
            where: { id: jobId },
            data: {
                status: 'COMPLETED',
                progress: 100,
                endedAt: new Date()
            }
        });

        await prisma.user.update({
            where: { id: userId },
            data: { googleLastSyncAt: new Date() }
        });

    } catch (error: any) {
        await prisma.syncJob.update({
            where: { id: jobId },
            data: {
                status: 'FAILED',
                error: error.message || 'Unknown error during sync',
                endedAt: new Date()
            }
        });
    }
}
