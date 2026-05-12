
import { NextResponse } from 'next/server';
import { extractFeatures, detectSpam } from '@/lib/spam-detector';
import { getBertClassifier } from '@/lib/bert-classifier';

export async function POST(request: Request) {
    try {
        const { from, subject, body, html } = await request.json();

        // ── Try BERT first (when ML server is running) ─────────────────────
        const bertClient = getBertClassifier();
        const isBertAvailable = await bertClient.checkHealth();

        if (isBertAvailable) {
            const prediction = await bertClient.classify(subject, body);

            if (prediction) {
                return NextResponse.json({
                    isSpam: prediction.is_spam,
                    label: prediction.spam,
                    confidence: prediction.spam_confidence,
                    category: prediction.category,
                    signals: [],          // BERT doesn't produce per-signal breakdown
                    usedBert: true,
                });
            }
        }

        // ── Fallback: advanced multi-layer in-process classifier ───────────
        const features = extractFeatures(from, subject, body, html);
        const result = detectSpam(features);

        return NextResponse.json({
            isSpam: result.isSpam,
            label: result.isSpam ? 'spam' : 'ham',
            confidence: result.confidence,
            signals: result.signals,      // ← new: per-signal breakdown
            usedBert: false,
        });
    } catch (error) {
        console.error('Spam classification error:', error);
        return NextResponse.json({ error: 'Failed to classify' }, { status: 500 });
    }
}
