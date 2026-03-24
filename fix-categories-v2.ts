// Fix null categories using native MongoDB
import { prisma } from './lib/prisma';

async function fixNullCategories() {
    console.log('🔄 Fixing emails without proper categories...');

    try {
        // Get all emails
        const allEmails = await prisma.email.findMany({
            select: {
                id: true,
                category: true,
            }
        });

        let fixedCount = 0;
        for (const email of allEmails) {
            if (!email.category || email.category === '' || email.category === null) {
                await prisma.email.update({
                    where: { id: email.id },
                    data: { category: 'inbox' }
                });
                fixedCount++;
            }
        }

        console.log(`✅ Fixed ${fixedCount} emails`);

        // Show final stats
        const byCategory = await prisma.email.findMany({
            select: {
                category: true,
            }
        });

        const categoryCounts: Record<string, number> = {};
        byCategory.forEach(email => {
            const cat = email.category || 'undefined';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        console.log('\n📂 Final category distribution:');
        Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
            console.log(`   ${cat}: ${count} emails`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixNullCategories();
