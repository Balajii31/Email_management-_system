import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('🔍 Checking MongoDB data...\n');
    
    // Check users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        googleAccessToken: true,
        _count: {
          select: { emails: true }
        }
      }
    });
    
    console.log(`📊 Total Users: ${users.length}`);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user._count.emails} emails)${user.googleAccessToken ? ' ✅ Gmail connected' : ' ❌ No Gmail'}`);
    });
    
    // Check total emails
    const totalEmails = await prisma.email.count();
    console.log(`\n📧 Total Emails in DB: ${totalEmails}`);
    
    if (totalEmails > 0) {
      const samples = await prisma.email.findMany({
        take: 5,
        select: {
          subject: true,
          from: true,
          userId: true,
          isSpam: true,
          priority: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
      
      console.log('\n📨 Sample Emails:');
      samples.forEach((email, i) => {
        console.log(`  ${i+1}. ${email.subject}`);
        console.log(`     From: ${email.from}`);
        console.log(`     User ID: ${email.userId}`);
        console.log(`     Spam: ${email.isSpam} | Priority: ${email.priority}\n`);
      });
    }
    
    console.log('✅ Check complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
