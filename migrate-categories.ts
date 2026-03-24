// Migrate old emails: move categories from priority to category field
import { prisma } from './lib/prisma';
import { classifyEmailCategory } from './lib/category-classifier';

async function migrateCategories() {
    console.log('🔄 Starting category migration...');

    try {
        const allEmails = await prisma.email.findMany({
            select: {
                id: true,
                from: true,
                subject: true,
                body: true,
                priority: true,
                category: true,
                isSpam: true,
            }
        });

        console.log(`📊 Found ${allEmails.length} emails to process`);

        let updatedCount = 0;
        const validCategories = ['social', 'jobs', 'events', 'personal', 'updates', 'promotional'];

        for (const email of allEmails) {
            let newCategory = email.category || 'inbox';
            let newPriority = email.priority;

            // If priority contains a category value, move it to category
            if (validCategories.includes(email.priority)) {
                newCategory = email.priority;
                // Reclassify priority properly
                newPriority = 'medium'; // Default, will be reclassified on next sync
            }
            // If category is null or 'inbox', classify it
            else if (!email.category || email.category === 'inbox') {
                if (!email.isSpam) {
                    newCategory = classifyEmailCategory(email.from, email.subject, email.body);
                }
            }

            // Update if anything changed
            if (newCategory !== email.category || newPriority !== email.priority) {
                await prisma.email.update({
                    where: { id: email.id },
                    data: {
                        category: newCategory,
                        priority: newPriority,
                    }
                });
                updatedCount++;

                if (updatedCount % 10 === 0) {
                    console.log(`✅ Updated ${updatedCount}/${allEmails.length} emails...`);
                }
            }
        }

        console.log(`🎉 Successfully migrated ${updatedCount} emails!`);
        
        // Show stats
        const stats = await prisma.email.groupBy({
            by: ['category'],
            _count: { category: true },
        });

        console.log('\n📊 Emails by category:');
        stats.forEach(stat => {
            console.log(`   ${stat.category}: ${stat._count.category} emails`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

migrateCategories()
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
