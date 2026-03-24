import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { getGmailClient } from '@/lib/gmail-client';
import { handleApiError, successResponse, errorResponse } from '@/lib/api-helpers';

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !supabaseUser) {
        return errorResponse('Unauthorized', 401);
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: supabaseUser.email },
        });

        if (!user) return errorResponse('User not found', 404);

        const body = await request.json();
        const { to, subject, body: emailBody, cc = [], bcc = [] } = body;

        if (!to || !Array.isArray(to) || to.length === 0) {
            return errorResponse('Recipient email(s) required', 400);
        }

        // Get Gmail client
        const gmail = await getGmailClient(user.id);

        // Create email message in RFC 2822 format
        const toHeader = to.join(', ');
        const ccHeader = cc.length > 0 ? `Cc: ${cc.join(', ')}\r\n` : '';
        const bccHeader = bcc.length > 0 ? `Bcc: ${bcc.join(', ')}\r\n` : '';
        
        const message = [
            `To: ${toHeader}`,
            ccHeader,
            bccHeader,
            `Subject: ${subject || '(No Subject)'}`,
            'Content-Type: text/plain; charset=utf-8',
            '',
            emailBody || ''
        ].join('\r\n');

        // Encode message in base64url
        const encodedMessage = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // Send via Gmail API
        const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage,
            },
        });

        // Save to database as sent email
        await prisma.email.create({
            data: {
                userId: user.id,
                googleMessageId: response.data.id,
                googleThreadId: response.data.threadId,
                from: supabaseUser.email!,
                to,
                cc,
                bcc,
                subject: subject || '(No Subject)',
                body: emailBody || '',
                folder: 'sent',
                isRead: true,
                priority: 'medium',
                category: 'inbox',
            },
        });

        return successResponse({ messageId: response.data.id }, 'Email sent successfully');
    } catch (error: any) {
        console.error('Error sending email:', error);
        return handleApiError(error);
    }
}
