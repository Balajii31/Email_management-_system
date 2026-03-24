import { prisma } from '@/lib/prisma';
import { handleApiError, successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-helpers';
import { updateEmailSchema } from '@/lib/validation-schemas';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await getAuthenticatedUser();

    if (!auth || !auth.mongoUser) return errorResponse('Unauthorized', 401);

    const { id } = await params;

    try {
        const email = await prisma.email.findFirst({
            where: { id, userId: auth.mongoUser.id, deletedAt: null },
            include: {
                attachments: true,
                summaries: true,
                translations: true
            }
        });

        if (!email) return errorResponse('Email not found', 404);

        // Mark as read automatically when fetching details
        if (!email.isRead) {
            await prisma.email.update({
                where: { id },
                data: { isRead: true }
            });
            email.isRead = true;
        }

        return successResponse(email);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await getAuthenticatedUser();

    if (!auth || !auth.mongoUser) return errorResponse('Unauthorized', 401);

    const { id } = await params;

    try {
        const body = await request.json();
        const data = updateEmailSchema.parse(body);

        const email = await prisma.email.findFirst({
            where: { id, userId: auth.mongoUser.id, deletedAt: null }
        });

        if (!email) return errorResponse('Email not found', 404);

        const updatedEmail = await prisma.email.update({
            where: { id },
            data,
        });

        return successResponse(updatedEmail, 'Email updated successfully');
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await getAuthenticatedUser();

    if (!auth || !auth.mongoUser) return errorResponse('Unauthorized', 401);

    const { id } = await params;

    try {
        const email = await prisma.email.findFirst({
            where: { id, userId: auth.mongoUser.id }
        });

        if (!email) return errorResponse('Email not found', 404);

        await prisma.email.update({
            where: { id },
            data: { deletedAt: new Date() }
        });

        return successResponse(null, 'Email deleted successfully');
    } catch (error) {
        return handleApiError(error);
    }
}
