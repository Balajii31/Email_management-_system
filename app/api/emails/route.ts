import { prisma } from '@/lib/prisma';
import { handleApiError, successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-helpers';
import { emailQuerySchema } from '@/lib/validation-schemas';

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser();

  if (!auth || !auth.mongoUser) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = emailQuerySchema.parse(Object.fromEntries(searchParams));

    const { page, limit, priority, isSpam, search, folder, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      userId: auth.mongoUser.id,
      // MongoDB Prisma has issues with null filters - commenting out for now
      // deletedAt: null,
    };

    if (priority) where.priority = priority;
    if (isSpam !== undefined) where.isSpam = isSpam;
    
    // Handle folder filters
    if (folder) {
      // Category folders (using category field for categorization)
      const categoryFolders = ['social', 'jobs', 'events', 'personal', 'updates', 'promotional'];
      
      if (categoryFolders.includes(folder)) {
        // Virtual category folders - filter by category field
        where.category = folder;
        where.isSpam = false; // Don't show spam in categories
      } else if (folder === 'spam') {
        // Spam folder - show emails marked as spam
        where.isSpam = true;
      } else {
        // Regular folders (inbox, sent, drafts, trash)
        where.folder = folder;
        // For inbox, also exclude spam
        if (folder === 'inbox') {
          where.isSpam = false;
        }
      }
    }

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
