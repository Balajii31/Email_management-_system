import { PrismaClient } from '@prisma/client';
import { classifyEmailCategory } from './lib/category-classifier';

const prisma = new PrismaClient();

async function categorizeAllEmails() {
    try {
        const userId = '69a7d290c3699c2c8ee09794';
        
        console.log('\n=== Categorizing All Emails ===\n');
        
        // Get all emails
        const emails = await prisma.email.findMany({
            where: { userId },
            select: {
                id: true,
                from: true,
                subject: true,
                body: true,
                priority: true,
                isSpam: true
            }
        });
        
        console.log(`Found ${emails.length} emails to categorize\n`);
        
        const categoryCounts: Record<string, number> = {};
        let updated = 0;
        
        for (const email of emails) {
            // Skip spam emails
            if (email.isSpam) {
                continue;
            }
            
            const category = classifyEmailCategory(
                email.from || '',
                email.subject || '',
                email.body || ''
            );
            
            // Update the email's priority field with the category
            await prisma.email.update({
                where: { id: email.id },
                data: { priority: category }
            });
            
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            updated++;
            
            if (updated % 10 === 0) {
                process.stdout.write(`\rProcessed: ${updated}/${emails.length}`);
            }
        }
        
        console.log(`\n\n✅ Categorized ${updated} emails\n`);
        console.log('Category Distribution:');
        console.log('━'.repeat(40));
        
        Object.entries(categoryCounts)
            .sort(([, a], [, b]) => b - a)
            .forEach(([category, count]) => {
                const bar = '█'.repeat(Math.floor(count / 2));
                console.log(`${category.padEnd(15)} ${count.toString().padStart(3)} ${bar}`);
            });
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

categorizeAllEmails();
