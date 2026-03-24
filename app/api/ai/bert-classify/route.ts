/**
 * POST /api/ai/bert-classify
 * Calls the local FastAPI BERT server (http://localhost:8000)
 * to get spam, category, and priority predictions for an email.
 *
 * Falls back to rule-based classification if the ML server is offline.
 */

import { NextResponse } from 'next/server';

const ML_SERVER = process.env.ML_SERVER_URL || 'http://localhost:8000';

interface BertPrediction {
    spam: string;
    is_spam: boolean;
    spam_confidence: number;
    category: string;
    category_scores: Record<string, number>;
    priority: string;
    priority_score: number;
    priority_scores: Record<string, number>;
}

// Rule-based fallback when ML server is offline
function ruleBased(subject: string, body: string) {
    const text = `${subject} ${body}`.toLowerCase();
    const spamWords = ['win', 'prize', 'click here', 'free', 'offer', 'discount', 'buy now', 'unsubscribe', 'limited time'];
    const urgentWords = ['urgent', 'asap', 'immediately', 'critical', 'deadline', 'action required'];

    const isSpam = spamWords.some(w => text.includes(w));
    const isUrgent = urgentWords.some(w => text.includes(w));

    let category = 'work';
    if (isSpam) category = 'promotions';
    else if (text.includes('meeting') || text.includes('report') || text.includes('project')) category = 'work';
    else if (text.includes('family') || text.includes('friend')) category = 'personal';

    return {
        spam: isSpam ? 'spam' : 'ham',
        is_spam: isSpam,
        spam_confidence: isSpam ? 0.85 : 0.90,
        category,
        category_scores: { work: 0.5, personal: 0.2, promotions: 0.2, spam: 0.1 },
        priority: isSpam ? 'Low' : isUrgent ? 'High' : 'Medium',
        priority_score: isSpam ? 1 : isUrgent ? 3 : 2,
        priority_scores: { Low: 0.33, Medium: 0.34, High: 0.33 },
        source: 'rule-based-fallback',
    };
}

export async function POST(request: Request) {
    try {
        const { subject = '', body = '', text = '' } = await request.json();
        const emailText = text || `${subject} ${body}`;

        // Try BERT ML server first
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const res = await fetch(`${ML_SERVER}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: emailText, subject }),
                signal: controller.signal,
            });
            clearTimeout(timeout);

            if (!res.ok) throw new Error(`ML server error: ${res.status}`);

            const prediction: BertPrediction = await res.json();
            return NextResponse.json({ ...prediction, source: 'bert-ml-server' });

        } catch (mlError: unknown) {
            // ML server offline → use rule-based fallback
            const isOffline = mlError instanceof Error &&
                (mlError.name === 'AbortError' || mlError.message.includes('fetch'));

            console.warn(
                isOffline
                    ? '⚠️  BERT ML server offline, using rule-based fallback'
                    : `⚠️  ML server error: ${mlError}, using fallback`
            );

            const fallback = ruleBased(subject, body || text);
            return NextResponse.json(fallback);
        }

    } catch (error) {
        console.error('Classification error:', error);
        return NextResponse.json(
            { error: 'Failed to classify email' },
            { status: 500 }
        );
    }
}

// Check ML server health
export async function GET() {
    try {
        const res = await fetch(`${ML_SERVER}/health`, {
            signal: AbortSignal.timeout(3000),
        });
        const data = await res.json();
        return NextResponse.json({ ml_server: 'online', ...data });
    } catch {
        return NextResponse.json({
            ml_server: 'offline',
            message: 'Start the FastAPI server with: cd ml_pipeline && python serve.py',
        });
    }
}
