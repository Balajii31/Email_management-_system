
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
