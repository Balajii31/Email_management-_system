import { z } from 'zod';

export const emailQuerySchema = z.object({
    page: z.string().optional().transform(v => parseInt(v || '1')),
    limit: z.string().optional().transform(v => parseInt(v || '20')),
    priority: z.enum(['high', 'medium', 'low']).optional(),
    isSpam: z.string().optional().transform(v => v === 'true'),
    search: z.string().optional(),
    folder: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});

export const updateEmailSchema = z.object({
    isRead: z.boolean().optional(),
    labels: z.array(z.string()).optional(),
    isArchived: z.boolean().optional(),
    isSpam: z.boolean().optional(),
    folder: z.string().optional(),
});

export const userPreferencesSchema = z.object({
    syncFrequency: z.enum(['hourly', 'daily', 'manual']).optional(),
    notificationsEnabled: z.boolean().optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
});
