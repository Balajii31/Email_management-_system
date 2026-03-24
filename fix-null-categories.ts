// Fix null categories
import { prisma } from './lib/prisma';

async function fixNullCategories() {
    console.log('🔄 Fixing null categories...');

    try {
        // Update all emails with null category to 'inbox'
        const result = await prisma.email.updateMany({
            where: {
                category: null,
            },
            data: {
                category: 'inbox',
            }
        });

        console.log(`✅ Fixed ${result.count} emails with null categories`);

        // Check for any remaining issues
        const totalEmails = await prisma.email.count();
        console.log(`📊 Total emails: ${totalEmails}`);

        const byCategory = await prisma.email.findMany({
            select: {
                category: true,
            }
        });

        const categoryCounts: Record<string, number> = {};
        byCategory.forEach(email => {
            const cat = email.category || 'null';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        console.log('\n📂 Emails by category:');
        Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
            console.log(`   ${cat}: ${count} emails`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

fixNullCategories();
