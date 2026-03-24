import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSpamEmails() {
    try {
        const userId = '69a7d290c3699c2c8ee09794';
        
        console.log('\n=== Checking Spam Emails ===\n');
        
        // Count by folder
        const inboxCount = await prisma.email.count({
            where: { userId, folder: 'inbox' }
        });
        const spamCount = await prisma.email.count({
            where: { userId, folder: 'spam' }
        });
        
        console.log('Inbox emails:', inboxCount);
        console.log('Spam emails:', spamCount);
        
        // Get first few spam emails
        const spamEmails = await prisma.email.findMany({
            where: { userId, folder: 'spam' },
            select: { subject: true, isSpam: true, priority: true },
            take: 5
        });
        
        console.log('\nFirst 5 spam emails:');
        spamEmails.forEach((email, i) => {
            console.log(`${i + 1}. ${email.subject?.substring(0, 60)}`);
            console.log(`   isSpam: ${email.isSpam}, priority: ${email.priority}`);
        });
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

checkSpamEmails();
