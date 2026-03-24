import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFolders() {
    try {
        const userId = '69a7d290c3699c2c8ee09794';
        
        console.log('\n=== Testing Email Folders ===\n');
        
        // Test each folder
        const folders = ['inbox', 'social', 'transactional', 'jobs', 'events', 'personal', 'updates', 'promotional', 'spam'];
        
        for (const folder of folders) {
            let count;
            
            if (folder === 'spam') {
                count = await prisma.email.count({
                    where: { userId, isSpam: true }
                });
            } else if (folder === 'inbox') {
                count = await prisma.email.count({
                    where: { userId, folder, isSpam: false }
                });
            } else {
                count = await prisma.email.count({
                    where: { userId, priority: folder, isSpam: false }
                });
            }
            
            console.log(`${folder.padEnd(15)} ${count} emails`);
        }
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

testFolders();
