const { PrismaClient } = require('@prisma/client');
const { fetchEmails, getEmailContent } = require('../lib/gmail-client');
const { extractFeatures, detectSpam } = require('../lib/spam-detector');
const { classifyPriority } = require('../lib/priority-classifier');
require('dotenv').config();

const prisma = new PrismaClient();

async function runTestSync() {
    const user = await prisma.user.findUnique({
        where: { email: 'balag31072002@gmail.com' }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    try {
        console.log('Fetching emails...');
        const { messages } = await fetchEmails(user.id, 2);
        console.log(`Found ${messages.length} emails.`);

        for (const msg of messages) {
            console.log(`Processing message ${msg.id}...`);
            const details = await getEmailContent(user.id, msg.id);
            // ... minimal processing ...
            const subject = (details.payload.headers.find(h => h.name.toLowerCase() === 'subject') || {}).value || '(No Subject)';
            console.log(` - Subject: ${subject}`);
            
            // Try to create in DB
            await prisma.email.upsert({
                where: { googleMessageId: msg.id },
                update: {},
                create: {
                    userId: user.id,
                    googleMessageId: msg.id,
                    googleThreadId: details.threadId,
                    from: (details.payload.headers.find(h => h.name.toLowerCase() === 'from') || {}).value || '',
                    to: [(details.payload.headers.find(h => h.name.toLowerCase() === 'to') || {}).value || ''],
                    subject: subject,
                    body: 'Content fetched via test script',
                    priority: 'low',
                    folder: 'inbox',
                    isRead: true,
                }
            });
            console.log(' - Saved to DB');
        }
    } catch (e) {
        console.error('Sync failed:', e.message);
    }
}

runTestSync().finally(() => prisma.$disconnect());
