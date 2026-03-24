import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 Testing MongoDB connection...\n');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Connected to MongoDB successfully!\n');
    
    // Test collections
    const collections = await prisma.$runCommandRaw({
      listCollections: 1
    });
    
    console.log('📊 Database: emailsystem');
    console.log('📦 Collections created:');
    if (collections && collections.cursor && collections.cursor.firstBatch) {
      collections.cursor.firstBatch.forEach((col: any) => {
        console.log(`   ✓ ${col.name}`);
      });
    }
    
    console.log('\n✅ DATABASE READY FOR USE!\n');
    console.log('Next steps:');
    console.log('  1. Restart your Next.js app');
    console.log('  2. Go to http://localhost:3000');
    console.log('  3. Connect Gmail → Sync → BERT AI classifies!\n');
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
