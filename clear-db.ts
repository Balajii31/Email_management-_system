import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  try {
    console.log('🧹 Clearing old PostgreSQL data from MongoDB...\n');
    
    // Delete all data from all collections
    const deletedSyncJobs = await prisma.syncJob.deleteMany({});
    console.log(`✓ Deleted ${deletedSyncJobs.count} sync jobs`);
    
    const deletedAttachments = await prisma.attachment.deleteMany({});
    console.log(`✓ Deleted ${deletedAttachments.count} attachments`);
    
    const deletedTranslations = await prisma.emailTranslation.deleteMany({});
    console.log(`✓ Deleted ${deletedTranslations.count} email translations`);
    
    const deletedSummaries = await prisma.emailSummary.deleteMany({});
    console.log(`✓ Deleted ${deletedSummaries.count} email summaries`);
    
    const deletedEmails = await prisma.email.deleteMany({});
    console.log(`✓ Deleted ${deletedEmails.count} emails`);
    
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`✓ Deleted ${deletedUsers.count} users`);
    
    console.log('\n✅ Database cleared successfully!');
    console.log('📝 MongoDB is now clean and ready for fresh data\n');
    console.log('Next steps:');
    console.log('  1. Visit http://localhost:3000');
    console.log('  2. Create a new account or login');
    console.log('  3. Connect Gmail');
    console.log('  4. Start syncing emails!\n');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase();
