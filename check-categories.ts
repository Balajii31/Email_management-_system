// Check email categories in database
import { prisma } from './lib/prisma';

async function checkCategories() {
    try {
        const totalEmails = await prisma.email.count();
        console.log(`📊 Total emails in database: ${totalEmails}`);

        if (totalEmails > 0) {
            // Get sample emails with their categories
            const sampleEmails = await prisma.email.findMany({
                take: 10,
                select: {
                    id: true,
                    subject: true,
                    category: true,
                    priority: true,
                    isSpam: true,
                    from: true,
                }
            });

            console.log('\n📧 Sample emails:');
            sampleEmails.forEach((email, idx) => {
                console.log(`${idx + 1}. ${email.subject.substring(0, 50)}`);
                console.log(`   Category: ${email.category}, Priority: ${email.priority}, Spam: ${email.isSpam}`);
                console.log(`   From: ${email.from.substring(0, 40)}`);
                console.log('');
            });

            // Group by category
            const categories = await prisma.email.groupBy({
                by: ['category'],
                _count: {
                    category: true
                }
            });

            console.log('\n📂 Emails by category:');
            categories.forEach(cat => {
                console.log(`   ${cat.category}: ${cat._count.category} emails`);
            });
        } else {
            console.log('\n⚠️  No emails found in database. Please sync emails first.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkCategories();
