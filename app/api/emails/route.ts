import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase';
import { handleApiError, successResponse } from '@/lib/api-helpers';
import { emailQuerySchema } from '@/lib/validation-schemas';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !supabaseUser) {
    return successResponse({ error: 'Unauthorized' }, undefined); // We use handleApiError for actual errors, but 401 is specific
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = emailQuerySchema.parse(Object.fromEntries(searchParams));

    const { page, limit, priority, isSpam, search, folder, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      userId: supabaseUser.id,
      deletedAt: null,
    };

    if (priority) where.priority = priority;
    if (isSpam !== undefined) where.isSpam = isSpam;
    if (folder) where.folder = folder;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { from: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          attachments: {
            select: { id: true, filename: true, size: true, mimeType: true }
          }
        }
      }),
      prisma.email.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return successResponse(emails, 'Emails fetched successfully', {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
