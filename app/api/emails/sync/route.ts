import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { getGmailClient, fetchEmails, getEmailContent, moveToSpam, addLabel } from '@/lib/gmail-client';
import { extractFeatures, detectSpam } from '@/lib/spam-detector';
import { classifyPriority } from '@/lib/priority-classifier';
import { classifyEmailCategory } from '@/lib/category-classifier';
import { getBertClassifier } from '@/lib/bert-classifier';
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

        // Fail fast if Gmail credentials are invalid to avoid silent background failures.
        try {
            await getGmailClient(user.id);
            await fetchEmails(user.id, 1);
        } catch (error: any) {
            const rawMessage = error?.message || 'Google authentication failed';
            const isScopeError = rawMessage.toLowerCase().includes('insufficient authentication scopes');
            const message = isScopeError
                ? 'Google token is missing required Gmail permissions. Please reconnect Gmail and grant all requested scopes.'
                : rawMessage;
            return errorResponse(message, 400);
        }

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
        let spamMovedCount = 0;

        // Check if BERT ML server is available
        const bertClient = getBertClassifier();
        const isBertAvailable = await bertClient.checkHealth();
        
        console.log(`🤖 BERT ML Server: ${isBertAvailable ? '✅ Available' : '⚠️ Unavailable (using fallback)'}`);

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

                // 🤖 AI/ML Pipeline with BERT
                let isSpam = false;
                let priority = 'medium';
                let category = 'general';
                let confidence = 0;
                let usedBert = false;

                if (isBertAvailable) {
                    // Use BERT for classification
                    const bertPrediction = await bertClient.classify(subject, body);
                    
                    if (bertPrediction) {
                        isSpam = bertPrediction.is_spam;
                        priority = bertPrediction.priority.toLowerCase();
                        category = bertPrediction.category;
                        confidence = bertPrediction.spam_confidence;
                        usedBert = true;
                        
                        console.log(`📧 Email "${subject.substring(0, 50)}..." classified by BERT:`, {
                            spam: isSpam,
                            priority,
                            category,
                            confidence
                        });
                    }
                }

                // Fallback to simple classifiers if BERT failed or unavailable
                if (!usedBert) {
                    const features = extractFeatures(from, subject, body);
                    const spamResult = detectSpam(features);
                    const priorityResult = classifyPriority(from, subject, body);
                    
                    isSpam = spamResult.isSpam;
                    priority = priorityResult.priority.toLowerCase();
                    category = classifyEmailCategory(from, subject, body);
                    confidence = spamResult.confidence;
                }

                // Also check Gmail's existing spam label
                const alreadySpam = details.labelIds?.includes('SPAM');
                isSpam = isSpam || alreadySpam;

                // Determine folder
                const folder = isSpam ? 'spam' :
                    details.labelIds?.includes('SENT') ? 'sent' :
                        details.labelIds?.includes('DRAFT') ? 'drafts' : 'inbox';

                // 🎯 Take action on spam emails
                if (isSpam && !alreadySpam && msg.id) {
                    // Move to spam in Gmail
                    const moveResult = await moveToSpam(userId, msg.id);
                    if (moveResult.success) {
                        spamMovedCount++;
                        console.log(`🗑️ Moved email to spam: ${subject.substring(0, 50)}...`);
                    }
                }

                // 🏷️ Add priority label in Gmail for non-spam emails
                if (!isSpam && priority === 'high' && msg.id) {
                    await addLabel(userId, msg.id, 'Priority/High');
                }

                // Save to database
                await prisma.email.create({
                    data: {
                        userId,
                        googleMessageId: msg.id,
                        googleThreadId: details.threadId,
                        from,
                        to,
                        subject,
                        body,
                        priority,
                        category,
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
                endedAt: new Date(),
                totalProcessed: total,
                totalSynced: syncedCount,
            }
        });

        await prisma.user.update({
            where: { id: userId },
            data: { googleLastSyncAt: new Date() }
        });

        console.log(`✅ Sync completed: ${syncedCount} new emails, ${spamMovedCount} moved to spam`);

    } catch (error: any) {
        console.error('❌ Sync failed:', error);
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
