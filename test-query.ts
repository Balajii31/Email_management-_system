import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testQuery() {
    try {
        const userId = '69a7d290c3699c2c8ee09794';
        
        console.log('\n=== Testing Email Query ===');
        console.log('User ID:', userId);
        
        // Test 1: Count all emails for this user
        const totalCount = await prisma.email.count({
            where: { userId }
        });
        console.log('\nTotal emails for this user:', totalCount);
        
        // Test 2: Count emails with folder="inbox"
        const inboxCount = await prisma.email.count({
            where: { 
                userId,
                folder: 'inbox'
            }
        });
        console.log('Inbox emails:', inboxCount);
        
        // Test 3: Count emails with deletedAt=null
        const notDeletedCount = await prisma.email.count({
            where: { 
                userId,
                deletedAt: null
            }
        });
        console.log('Not deleted emails:', notDeletedCount);
        
        // Test 4: Full query like the API uses
        const emails = await prisma.email.findMany({
            where: {
                userId,
                deletedAt: null,
                folder: 'inbox'
            },
            take: 5,
            orderBy: { createdAt: 'desc' },
        });
        console.log('\nActual query result:', emails.length, 'emails');
        
        if (emails.length > 0) {
            console.log('\nFirst email:');
            console.log('  Subject:', emails[0].subject);
            console.log('  From:', emails[0].from);
            console.log('  Folder:', emails[0].folder);
            console.log('  DeletedAt:', emails[0].deletedAt);
        }
        
        // Test 5: Check what folders exist
        const allEmails = await prisma.email.findMany({
            where: { userId },
            select: { folder: true }
        });
        const folders = [...new Set(allEmails.map(e => e.folder))];
        console.log('\nFolders in database:', folders);
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

testQuery();
