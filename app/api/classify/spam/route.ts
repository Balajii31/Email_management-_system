
import { NextResponse } from 'next/server';
import { extractFeatures, detectSpam } from '@/lib/spam-detector';

export async function POST(request: Request) {
    try {
        const { from, subject, body, html } = await request.json();
        const features = extractFeatures(from, subject, body, html);
        const result = detectSpam(features);

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to classify' }, { status: 500 });
    }
}
