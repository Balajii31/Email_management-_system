import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encryptToken } from '@/lib/auth-helpers';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const userId = searchParams.get('state');

    if (!code || !userId) {
        return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.access_token) {
            throw new Error('Failed to retrieve access token');
        }

        // Set credentials for the client
        oauth2Client.setCredentials(tokens);

        // Encrypt tokens before storing
        const encryptedAccessToken = encryptToken(tokens.access_token);
        const encryptedRefreshToken = tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined;

        // Fetch user info from Google to ensure we have the email if the record is missing
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data: userInfo } = await oauth2.userinfo.get();

        if (!userInfo.email) {
            throw new Error('Failed to retrieve user email from Google');
        }

        await prisma.user.upsert({
            where: { id: userId },
            update: {
                googleAccessToken: encryptedAccessToken,
                ...(encryptedRefreshToken && { googleRefreshToken: encryptedRefreshToken }),
                googleTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
                name: userInfo.name,
                avatar: userInfo.picture,
            },
            create: {
                id: userId,
                email: userInfo.email,
                name: userInfo.name,
                avatar: userInfo.picture,
                googleAccessToken: encryptedAccessToken,
                ...(encryptedRefreshToken && { googleRefreshToken: encryptedRefreshToken }),
                googleTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
            },
        });

        return NextResponse.redirect(new URL('/inbox', request.url));
    } catch (error: any) {
        console.error('OAuth callback error:', error);
        return NextResponse.json({ 
            error: 'Failed to exchange token',
            details: error.message,
            response: error.response?.data
        }, { status: 500 });
    }
}
