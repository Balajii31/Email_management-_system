import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
    try {
        const users = await prisma.user.findMany({
            where: { email: 'balag31072002@gmail.com' }
        });

        console.log('\n=== USERS IN DATABASE ===');
        for (let i = 0; i < users.length; i++) {
            const u = users[i];
            console.log(`\nUser ${i + 1}:`);
            console.log('  ID:', u.id);
            console.log('  Email:', u.email);
            console.log('  Name:', u.name);
            console.log('  Gmail Connected:', !!u.gmailAccessToken);
            
            const emailCount = await prisma.email.count({ where: { userId: u.id } });
            console.log('  Email Count:', emailCount);
        }

        if (users.length > 1) {
            console.log('\n⚠️  PROBLEM FOUND: Multiple user records exist!');
            console.log('Solution: Merge user records...\n');
        }

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

checkUsers();
