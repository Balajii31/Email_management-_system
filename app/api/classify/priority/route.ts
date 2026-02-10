
import { NextResponse } from 'next/server';
import { classifyPriority } from '@/lib/priority-classifier';

export async function POST(request: Request) {
    try {
        const { from, subject, body, isVip, isFrequentContact } = await request.json();
        const result = classifyPriority(from, subject, body, isVip, isFrequentContact);

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to classify' }, { status: 500 });
    }
}
