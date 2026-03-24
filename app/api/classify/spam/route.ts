
import { NextResponse } from 'next/server';
import { extractFeatures, detectSpam } from '@/lib/spam-detector';
import { getBertClassifier } from '@/lib/bert-classifier';

export async function POST(request: Request) {
    try {
        const { from, subject, body, html } = await request.json();
        
        // Try BERT first
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
                    usedBert: true,
                });
            }
        }
        
        // Fallback to simple classifier
        const features = extractFeatures(from, subject, body, html);
        const result = detectSpam(features);
        result.usedBert = false;

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to classify' }, { status: 500 });
    }
}
