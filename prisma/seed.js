const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo data...");

  // Get ALL users in the database
  const users = await prisma.user.findMany();
  
  if (users.length === 0) {
    console.log("No users found to seed emails for.");
    return;
  }

  for (const user of users) {
    console.log(`Seeding for user: ${user.email} (${user.id})`);
    
    const count = await prisma.email.count({ where: { userId: user.id } });
    if (count > 0) {
      console.log(`User already has ${count} emails. Skipping.`);
      continue;
    }

    const emails = [
      {
        googleMessageId: "msg-1-" + user.id,
        userId: user.id,
        from: "ai-assistant@example.com",
        to: [user.email],
        subject: "Welcome to your AI Email Manager!",
        body: "Hello! This is a demo email to help you see how the system works.",
        priority: "high",
        folder: "inbox",
      },
      {
        googleMessageId: "msg-2-" + user.id,
        userId: user.id,
        from: "manager@company.com",
        to: [user.email],
        subject: "Project Update",
        body: "Everything is going well.",
        priority: "medium",
        folder: "inbox",
      }
    ];

    for (const emailData of emails) {
      await prisma.email.create({ data: emailData });
    }
  }

  console.log("Seed completed successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());