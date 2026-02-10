import { createClient } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api-helpers';

export async function GET() {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) return errorResponse('No active session', 401);

    return successResponse(session);
}
