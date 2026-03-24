/**
 * Background Email Processor
 * Continuously monitors for new emails and processes them automatically
 * Run this with: node --experimental-specifier-resolution=node scripts/email-processor.js
 */

import { prisma } from '../lib/prisma';
import { fetchEmails, getEmailContent, moveToSpam, addLabel } from '../lib/gmail-client';
import { getBertClassifier } from '../lib/bert-classifier';
import { extractFeatures, detectSpam } from '../lib/spam-detector';
import { classifyPriority } from '../lib/priority-classifier';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 20;

let isProcessing = false;
let processCount = 0;

async function processNewEmailsForUser(userId: string): Promise<{
    processed: number;
    spam: number;
    errors: number;
}> {
    const stats = { processed: 0, spam: 0, errors: 0 };

    try {
        console.log(`📧 Processing emails for user: ${userId}`);

        // Fetch recent emails
        const { messages } = await fetchEmails(userId, BATCH_SIZE);
        
        if (!messages || messages.length === 0) {
            console.log(`  No new messages found`);
            return stats;
        }

        console.log(`  Found ${messages.length} messages to check`);

        // Check if BERT is available
        const bertClient = getBertClassifier();
        const isBertAvailable = await bertClient.checkHealth();
        console.log(`  BERT status: ${isBertAvailable ? '✅' : '⚠️ Fallback mode'}`);

        for (const msg of messages) {
            if (!msg.id) continue;

            try {
                // Skip if already in database
                const existing = await prisma.email.findUnique({
                    where: { googleMessageId: msg.id },
                });

                if (existing) {
                    continue; // Already processed
                }

                // Fetch email details
                const details = await getEmailContent(userId, msg.id);
                const headers = details.payload?.headers || [];
                
                const from = headers.find((h: any) => h.name?.toLowerCase() === 'from')?.value || '';
                const to = (headers.find((h: any) => h.name?.toLowerCase() === 'to')?.value || '')
                    .split(',').map((s: string) => s.trim());
                const subject = headers.find((h: any) => h.name?.toLowerCase() === 'subject')?.value || '(No Subject)';
                const timestamp = new Date(parseInt(details.internalDate || Date.now().toString()));

                // Extract body
                let body = '';
                if (details.payload?.parts) {
                    const textPart = details.payload.parts.find((p: any) => p.mimeType === 'text/plain');
                    body = textPart?.body?.data || details.payload.parts[0].body?.data || '';
                } else {
                    body = details.payload?.body?.data || '';
                }
                body = Buffer.from(body, 'base64').toString('utf-8').substring(0, 5000); // Limit size

                // 🤖 Classify with BERT or fallback
                let isSpam = false;
                let priority = 'medium';
                let category = 'general';

                if (isBertAvailable) {
                    const prediction = await bertClient.classify(subject, body);
                    if (prediction) {
                        isSpam = prediction.is_spam;
                        priority = prediction.priority.toLowerCase();
                        category = prediction.category;
                    }
                } else {
                    // Fallback to simple classifiers
                    const features = extractFeatures(from, subject, body);
                    const spamResult = detectSpam(features);
                    const priorityResult = classifyPriority(from, subject, body);
                    
                    isSpam = spamResult.isSpam;
                    priority = priorityResult.priority.toLowerCase();
                }

                // Check existing Gmail labels
                const alreadySpam = details.labelIds?.includes('SPAM') ?? false;
                isSpam = isSpam || alreadySpam;

                const folder = isSpam ? 'spam' :
                    details.labelIds?.includes('SENT') ? 'sent' :
                        details.labelIds?.includes('DRAFT') ? 'drafts' : 'inbox';

                // 🎯 Take action: Move spam emails
                if (isSpam && !alreadySpam && msg.id) {
                    const moveResult = await moveToSpam(userId, msg.id);
                    if (moveResult.success) {
                        stats.spam++;
                        console.log(`  🗑️  Spam: "${subject.substring(0, 40)}..."`);
                    }
                }

                // 🏷️ Add priority label for high-priority non-spam emails
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
                        isRead: !details.labelIds?.includes('UNREAD'),
                        isSpam,
                        folder,
                        createdAt: timestamp,
                    },
                });

                stats.processed++;

            } catch (emailError: any) {
                console.error(`  ❌ Error processing email ${msg.id}:`, emailError.message);
                stats.errors++;
            }
        }

        return stats;

    } catch (error: any) {
        console.error(`❌ Error processing emails for user ${userId}:`, error.message);
        stats.errors++;
        return stats;
    }
}

async function processAllUsers() {
    if (isProcessing) {
        console.log('⏭️  Already processing, skipping this cycle');
        return;
    }

    isProcessing = true;
    processCount++;

    try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📬 Email Processor Cycle #${processCount}`);
        console.log(`🕐 ${new Date().toLocaleString()}`);
        console.log('='.repeat(60));

        // Get all users with Google sync enabled
        const users = await prisma.user.findMany({
            where: {
                googleAccessToken: { not: null },
                googleRefreshToken: { not: null },
            },
            select: {
                id: true,
                email: true,
                name: true,
            },
        });

        console.log(`👥 Found ${users.length} user(s) to process\n`);

        let totalProcessed = 0;
        let totalSpam = 0;
        let totalErrors = 0;

        for (const user of users) {
            console.log(`👤 User: ${user.name || user.email}`);
            
            const stats = await processNewEmailsForUser(user.id);
            totalProcessed += stats.processed;
            totalSpam += stats.spam;
            totalErrors += stats.errors;

            console.log(`  ✅ Processed: ${stats.processed}, Spam: ${stats.spam}, Errors: ${stats.errors}\n`);
        }

        console.log('='.repeat(60));
        console.log(`📊 Summary: ${totalProcessed} emails processed, ${totalSpam} spam blocked, ${totalErrors} errors`);
        console.log(`⏰ Next check in ${POLL_INTERVAL_MS / 60000} minutes`);
        console.log('='.repeat(60));

    } catch (error: any) {
        console.error('❌ Critical error in email processor:', error);
    } finally {
        isProcessing = false;
    }
}

// Main execution
async function main() {
    console.log('\n🚀 Email Background Processor Started');
    console.log(`⚙️  Poll interval: ${POLL_INTERVAL_MS / 60000} minutes`);
    console.log(`📦 Batch size: ${BATCH_SIZE} emails per user`);
    console.log(`🤖 BERT ML Server: ${process.env.ML_SERVER_URL || 'http://localhost:8000'}`);
    console.log('Press Ctrl+C to stop\n');

    // Check BERT availability on startup
    const bertClient = getBertClassifier();
    const isBertAvailable = await bertClient.checkHealth();
    console.log(`🤖 BERT Status: ${isBertAvailable ? '✅ Available' : '⚠️ Unavailable (will use fallback)'}\n`);

    // Run immediately on start
    await processAllUsers();

    // Then run on interval
    setInterval(async () => {
        await processAllUsers();
    }, POLL_INTERVAL_MS);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down email processor...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n🛑 Shutting down email processor...');
    process.exit(0);
});

// Run
main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});
