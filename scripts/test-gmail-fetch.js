const { PrismaClient } = require('@prisma/client');
const { fetchEmails } = require('../lib/gmail-client');
// Note: This might fail if it needs the decryption key from env
require('dotenv').config();

const prisma = new PrismaClient();

async function testFetch() {
    const user = await prisma.user.findUnique({
        where: { email: 'balag31072002@gmail.com' }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log('Found user with ID:', user.id);
    console.log('Test fetching real emails...');
    
    // We need to polyfill or mock things that the lib/gmail-client might depend on if it's strictly for Next.js
    // But usually it's just Node.js code.
    
    try {
        const { messages } = await fetchEmails(user.id, 5);
        console.log(`Successfully fetched ${messages.length} real email IDs from Gmail!`);
        messages.forEach(m => console.log(' - ID:', m.id));
    } catch (error) {
        console.error('Error fetching real emails:', error.message);
    }
}

testFetch().finally(() => prisma.$disconnect());
