import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDeletedAtValues() {
    try {
        const userId = '69a7d290c3699c2c8ee09794';
        
        console.log('\n=== Checking deletedAt Values ===\n');
        
        // Get first few emails with their deletedAt values
        const emails = await prisma.email.findMany({
            where: { userId },
            select: {
                id: true,
                subject: true,
                deletedAt: true,
                folder: true
            },
            take: 5
        });
        
        emails.forEach((email, i) => {
            console.log(`Email ${i + 1}:`);
            console.log('  Subject:', email.subject?.substring(0, 50));
            console.log('  Folder:', email.folder);
            console.log('  deletedAt:', email.deletedAt);
            console.log('  deletedAt type:', typeof email.deletedAt);
            console.log('  deletedAt === null:', email.deletedAt === null);
            console.log('  deletedAt == null:', email.deletedAt == null);
            console.log('');
        });
        
        // Count with different null checks
        const countNull = await prisma.email.count({
            where: { userId, deletedAt: null }
        });
        const countNotNull = await prisma.email.count({
            where: { userId, deletedAt: { not: null } }
        });
        const totalCount = await prisma.email.count({
            where: { userId }
        });
        
        console.log('Count deletedAt = null:', countNull);
        console.log('Count deletedAt != null:', countNotNull);
        console.log('Total:', totalCount);
        console.log('Sum:', countNull + countNotNull, '(should equal total)');
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

checkDeletedAtValues();
