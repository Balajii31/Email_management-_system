// Script to classify existing emails with categories
import { prisma } from './lib/prisma';
import { classifyEmailCategory } from './lib/category-classifier';

async function classifyExistingEmails() {
    console.log('🔄 Starting classification of existing emails...');

    try {
        // Get all emails that don't have a proper category (inbox or empty)
        const emails = await prisma.email.findMany({
            where: {
                category: 'inbox',
                isSpam: false,
            },
            select: {
                id: true,
                from: true,
                subject: true,
                body: true,
                isSpam: true,
            }
        });

        console.log(`📊 Found ${emails.length} emails to classify`);

        let updatedCount = 0;
        const batchSize = 50;

        for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);
            
            await Promise.all(
                batch.map(async (email) => {
                    // Don't reclassify spam emails
                    if (email.isSpam) {
                        return;
                    }

                    // Classify the email
                    const category = classifyEmailCategory(
                        email.from,
                        email.subject,
                        email.body
                    );

                    // Update the email with the category
                    await prisma.email.update({
                        where: { id: email.id },
                        data: { category }
                    });

                    updatedCount++;
                    
                    if (updatedCount % 10 === 0) {
                        console.log(`✅ Classified ${updatedCount}/${emails.length} emails...`);
                    }
                })
            );
        }

        console.log(`🎉 Successfully classified ${updatedCount} emails!`);
        console.log('✨ Classification complete!');

    } catch (error) {
        console.error('❌ Error classifying emails:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the function
classifyExistingEmails()
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
