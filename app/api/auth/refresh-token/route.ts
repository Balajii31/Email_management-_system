import { createClient } from '@/lib/supabase';
import { handleApiError, successResponse, errorResponse } from '@/lib/api-helpers';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.refreshSession();

    if (error) {
      return errorResponse(error.message, 401);
    }

    return successResponse(session, 'Token refreshed successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
