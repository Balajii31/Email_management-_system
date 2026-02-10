import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-helpers';

export async function POST() {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) return errorResponse(error.message, 500);

    return successResponse(null, 'Logged out successfully');
}
