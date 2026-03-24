/**
 * Quick Test Script for Email Spam Detection System
 * Tests BERT server connectivity and classification accuracy
 */

async function testBertServer() {
    console.log('\n🧪 Testing BERT ML Server...\n');

    const serverUrl = process.env.ML_SERVER_URL || 'http://localhost:8000';
    
    // Test 1: Health Check
    console.log('1️⃣ Testing health endpoint...');
    try {
        const healthResponse = await fetch(`${serverUrl}/health`);
        const healthData = await healthResponse.json();
        
        if (healthData.status === 'ok' && healthData.model_loaded) {
            console.log('   ✅ BERT server is healthy and model is loaded');
            console.log(`   📱 Device: ${healthData.device}`);
        } else {
            console.log('   ⚠️  Server is up but model not loaded');
            console.log('   Please train the model first using the Jupyter notebook');
            return false;
        }
    } catch (error: any) {
        console.log('   ❌ BERT server is not running');
        console.log(`   Error: ${error.message}`);
        console.log('\n   🔧 Start the server with: cd ml_pipeline && python serve.py');
        return false;
    }

    // Test 2: Spam Detection
    console.log('\n2️⃣ Testing spam detection...');
    const spamTests = [
        {
            text: "Congratulations! You've won $1,000,000! Click here to claim your prize now!",
            subject: "YOU WON!!!",
            expected: true
        },
        {
            text: "Hey, can we schedule a meeting for tomorrow at 2pm to discuss the project?",
            subject: "Meeting tomorrow",
            expected: false
        },
        {
            text: "URGENT: Your account will be suspended unless you verify now by clicking this link!",
            subject: "Account Verification Required",
            expected: true
        }
    ];

    for (const test of spamTests) {
        try {
            const response = await fetch(`${serverUrl}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: test.text, subject: test.subject })
            });
            
            const result = await response.json();
            const isCorrect = result.is_spam === test.expected;
            
            console.log(`   ${isCorrect ? '✅' : '⚠️'}  Subject: "${test.subject}"`);
            console.log(`      Predicted: ${result.is_spam ? 'SPAM' : 'HAM'} (${(result.spam_confidence * 100).toFixed(1)}% confidence)`);
            console.log(`      Priority: ${result.priority}, Category: ${result.category}`);
        } catch (error: any) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }

    // Test 3: Batch Processing
    console.log('\n3️⃣ Testing batch processing...');
    try {
        const texts = [
            "Meeting at 3pm",
            "WIN FREE PRIZES NOW!!!",
            "Your invoice for January"
        ];
        
        const response = await fetch(`${serverUrl}/predict/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texts })
        });
        
        const result = await response.json();
        console.log(`   ✅ Batch processed ${result.predictions.length} emails`);
        
        result.predictions.forEach((pred: any, i: number) => {
            console.log(`      ${i + 1}. ${pred.is_spam ? '🗑️ SPAM' : '✉️ HAM'} - Priority: ${pred.priority}`);
        });
    } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 4: Performance Test
    console.log('\n4️⃣ Testing performance...');
    try {
        const startTime = Date.now();
        await fetch(`${serverUrl}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                text: "This is a test email for performance measurement.",
                subject: "Test"
            })
        });
        const endTime = Date.now();
        
        console.log(`   ✅ Classification time: ${endTime - startTime}ms`);
        
        if (endTime - startTime < 1000) {
            console.log(`   🚀 Excellent performance!`);
        } else if (endTime - startTime < 3000) {
            console.log(`   👍 Good performance`);
        } else {
            console.log(`   ⚠️  Slow performance, consider GPU acceleration`);
        }
    } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
    }

    return true;
}

async function testNextJsAPI() {
    console.log('\n\n🌐 Testing Next.js API Endpoints...\n');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    // Test spam classification endpoint
    console.log('1️⃣ Testing /api/classify/spam...');
    try {
        const response = await fetch(`${apiUrl}/api/classify/spam`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: 'scammer@fake.com',
                subject: 'YOU WON A PRIZE',
                body: 'Click here to claim your free prize now!'
            })
        });
        
        const result = await response.json();
        console.log(`   ✅ Response received`);
        console.log(`      Is Spam: ${result.isSpam}`);
        console.log(`      Confidence: ${result.confidence}`);
        console.log(`      Used BERT: ${result.usedBert}`);
    } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
        console.log('   Make sure Next.js dev server is running: npm run dev');
    }

    // Test priority classification endpoint
    console.log('\n2️⃣ Testing /api/classify/priority...');
    try {
        const response = await fetch(`${apiUrl}/api/classify/priority`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: 'boss@company.com',
                subject: 'URGENT: Review needed ASAP',
                body: 'Please review this important document by end of day.'
            })
        });
        
        const result = await response.json();
        console.log(`   ✅ Response received`);
        console.log(`      Priority: ${result.priority}`);
        console.log(`      Score: ${result.score}`);
        console.log(`      Used BERT: ${result.usedBert}`);
    } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
    }
}

async function displaySystemStatus() {
    console.log('\n📊 System Status Summary\n');
    console.log('═══════════════════════════════════════════════════════');
    
    // Check BERT server
    try {
        const response = await fetch('http://localhost:8000/health');
        const data = await response.json();
        console.log('🤖 BERT ML Server:    ✅ Running');
        console.log(`   Model Loaded:      ${data.model_loaded ? '✅' : '❌'}`);
        console.log(`   Device:            ${data.device}`);
    } catch {
        console.log('🤖 BERT ML Server:    ❌ Not Running');
        console.log('   Start with:        cd ml_pipeline && python serve.py');
    }
    
    // Check Next.js
    try {
        await fetch('http://localhost:3000');
        console.log('🌐 Next.js App:       ✅ Running');
    } catch {
        console.log('🌐 Next.js App:       ❌ Not Running');
        console.log('   Start with:        npm run dev');
    }
    
    console.log('═══════════════════════════════════════════════════════\n');
}

// Main execution
async function main() {
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║   Email Spam Detection System - Test Suite        ║');
    console.log('╚════════════════════════════════════════════════════╝');

    await displaySystemStatus();

    const bertOk = await testBertServer();
    
    if (bertOk) {
        await testNextJsAPI();
    }

    console.log('\n✨ Testing complete!\n');
}

main().catch(console.error);
