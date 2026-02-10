const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: { emails: true }
      }
    }
  });
  console.log('Users and their data:');
  users.forEach(u => {
    console.log(`- ${u.email} (${u.id}):`);
    console.log(`  Email count: ${u._count.emails}`);
    console.log(`  Has Access Token: ${!!u.googleAccessToken}`);
    console.log(`  Has Refresh Token: ${!!u.googleRefreshToken}`);
  });

  const jobs = await prisma.syncJob.findMany({
    orderBy: { startedAt: 'desc' },
    take: 5
  });
  console.log('\nRecent Sync Jobs:');
  jobs.forEach(j => {
    console.log(`- Job ${j.id}: ${j.status} (User: ${j.userId})`);
  });
}

check().catch(console.error).finally(() => prisma.$disconnect());
