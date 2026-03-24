import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDeletedEmails() {
    try {
        const userId = '69a7d290c3699c2c8ee09794';
        
        console.log('\n=== Fixing Deleted Emails ===');
        
        // Count how many are marked as deleted
        const deletedCount = await prisma.email.count({
            where: {
                userId,
                deletedAt: { not: null }
            }
        });
        console.log(`Found ${deletedCount} emails marked as deleted`);
        
        // Update all emails to set deletedAt = null
        const result = await prisma.email.updateMany({
            where: {
                userId,
                deletedAt: { not: null }
            },
            data: {
                deletedAt: null
            }
        });
        
        console.log(`✅ Updated ${result.count} emails - deletedAt set to null`);
        
        // Verify the fix
        const remainingDeleted = await prisma.email.count({
            where: {
                userId,
                deletedAt: { not: null }
            }
        });
        console.log(`Remaining deleted emails: ${remainingDeleted}`);
        
        const activeEmails = await prisma.email.count({
            where: {
                userId,
                deletedAt: null
            }
        });
        console.log(`Active emails now: ${activeEmails}`);
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

fixDeletedEmails();
