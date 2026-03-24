
import { google } from 'googleapis';
import { prisma } from './prisma';
import { decryptToken, encryptToken, isTokenExpired } from './auth-helpers';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

export async function getGmailClient(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            googleAccessToken: true,
            googleRefreshToken: true,
            googleTokenExpiresAt: true,
        },
    });

    if (!user || !user.googleAccessToken || !user.googleRefreshToken) {
        throw new Error('User not connected to Google');
    }

    let accessToken = decryptToken(user.googleAccessToken);
    const refreshToken = decryptToken(user.googleRefreshToken);

    oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
        expiry_date: user.googleTokenExpiresAt?.getTime(),
    });

    if (isTokenExpired(user.googleTokenExpiresAt)) {
        console.log('Refreshing Google token for user:', userId);
        const { credentials } = await oauth2Client.refreshAccessToken();

        if (credentials.access_token) {
            accessToken = credentials.access_token;
            await prisma.user.update({
                where: { id: userId },
                data: {
                    googleAccessToken: encryptToken(credentials.access_token),
                    googleTokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
                },
            });
        }
    }

    return google.gmail({ version: 'v1', auth: oauth2Client });
}

export async function fetchEmails(userId: string, maxResults = 50, pageToken?: string) {
    const gmail = await getGmailClient(userId);

    const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        pageToken,
        q: 'newer_than:30d', // Only last 30 days for initial sync
    });

    return {
        messages: response.data.messages || [],
        nextPageToken: response.data.nextPageToken,
    };
}

export async function getEmailContent(userId: string, messageId: string) {
    const gmail = await getGmailClient(userId);
    const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
    });

    return response.data;
}

/**
 * Move email to spam folder in Gmail
 */
export async function moveToSpam(userId: string, messageId: string) {
    const gmail = await getGmailClient(userId);
    
    try {
        await gmail.users.messages.modify({
            userId: 'me',
            id: messageId,
            requestBody: {
                addLabelIds: ['SPAM'],
                removeLabelIds: ['INBOX'],
            },
        });
        
        return { success: true, messageId, action: 'moved_to_spam' };
    } catch (error: any) {
        console.error(`Failed to move email ${messageId} to spam:`, error.message);
        return { success: false, messageId, error: error.message };
    }
}

/**
 * Remove email from spam (mark as not spam)
 */
export async function moveFromSpam(userId: string, messageId: string) {
    const gmail = await getGmailClient(userId);
    
    try {
        await gmail.users.messages.modify({
            userId: 'me',
            id: messageId,
            requestBody: {
                removeLabelIds: ['SPAM'],
                addLabelIds: ['INBOX'],
            },
        });
        
        return { success: true, messageId, action: 'moved_from_spam' };
    } catch (error: any) {
        console.error(`Failed to move email ${messageId} from spam:`, error.message);
        return { success: false, messageId, error: error.message };
    }
}

/**
 * Add custom label to email (for priority classification)
 */
export async function addLabel(userId: string, messageId: string, labelName: string) {
    const gmail = await getGmailClient(userId);
    
    try {
        // First, get or create the label
        const labelsResponse = await gmail.users.labels.list({ userId: 'me' });
        const existingLabel = labelsResponse.data.labels?.find(
            l => l.name?.toLowerCase() === labelName.toLowerCase()
        );

        let labelId: string;
        
        if (existingLabel?.id) {
            labelId = existingLabel.id;
        } else {
            // Create the label if it doesn't exist
            const newLabel = await gmail.users.labels.create({
                userId: 'me',
                requestBody: {
                    name: labelName,
                    labelListVisibility: 'labelShow',
                    messageListVisibility: 'show',
                },
            });
            labelId = newLabel.data.id!;
        }

        // Add label to message
        await gmail.users.messages.modify({
            userId: 'me',
            id: messageId,
            requestBody: {
                addLabelIds: [labelId],
            },
        });

        return { success: true, messageId, labelId, labelName };
    } catch (error: any) {
        console.error(`Failed to add label ${labelName} to email ${messageId}:`, error.message);
        return { success: false, messageId, error: error.message };
    }
}

/**
 * Mark email as read/unread
 */
export async function markAsRead(userId: string, messageId: string, isRead: boolean = true) {
    const gmail = await getGmailClient(userId);
    
    try {
        await gmail.users.messages.modify({
            userId: 'me',
            id: messageId,
            requestBody: isRead 
                ? { removeLabelIds: ['UNREAD'] }
                : { addLabelIds: ['UNREAD'] },
        });
        
        return { success: true, messageId, isRead };
    } catch (error: any) {
        console.error(`Failed to mark email ${messageId} as ${isRead ? 'read' : 'unread'}:`, error.message);
        return { success: false, messageId, error: error.message };
    }
}

/**
 * Archive email (remove from inbox but not delete)
 */
export async function archiveEmail(userId: string, messageId: string) {
    const gmail = await getGmailClient(userId);
    
    try {
        await gmail.users.messages.modify({
            userId: 'me',
            id: messageId,
            requestBody: {
                removeLabelIds: ['INBOX'],
            },
        });
        
        return { success: true, messageId, action: 'archived' };
    } catch (error: any) {
        console.error(`Failed to archive email ${messageId}:`, error.message);
        return { success: false, messageId, error: error.message };
    }
}

/**
 * Batch operations for efficiency
 */
export async function batchMoveToSpam(userId: string, messageIds: string[]) {
    const results = await Promise.allSettled(
        messageIds.map(id => moveToSpam(userId, id))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return { total: messageIds.length, successful, failed, results };
}
