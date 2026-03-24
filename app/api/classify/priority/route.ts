
import { NextResponse } from 'next/server';
import { classifyPriority } from '@/lib/priority-classifier';
import { getBertClassifier } from '@/lib/bert-classifier';

export async function POST(request: Request) {
    try {
        const { from, subject, body, isVip, isFrequentContact } = await request.json();
        
        // Try BERT first
        const bertClient = getBertClassifier();
        const isBertAvailable = await bertClient.checkHealth();
        
        if (isBertAvailable) {
            const prediction = await bertClient.classify(subject, body);
            
            if (prediction) {
                return NextResponse.json({
                    priority: prediction.priority.toUpperCase(),
                    score: prediction.priority_score,
                    scores: prediction.priority_scores,
                    category: prediction.category,
                    usedBert: true,
                });
            }
        }
        
        // Fallback to simple classifier
        const result = classifyPriority(from, subject, body, isVip, isFrequentContact);
        result.usedBert = false;

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to classify' }, { status: 500 });
    }
}
