import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encryptToken } from '@/lib/auth-helpers';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// Helper function to retry database operations (for Neon DB wake-up)
async function retryDatabaseOperation<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delayMs = 2000
): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            
            // Check if it's a connection error (Neon DB sleeping)
            if (error.code === 'P1001' || error.message?.includes("Can't reach database")) {
                console.log(`Database connection attempt ${attempt}/${maxRetries} failed, retrying...`);
                
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    continue;
                }
            }
            
            // If it's not a connection error, throw immediately
            throw error;
        }
    }
    
    throw lastError || new Error('Database operation failed after retries');
}

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

        // Retry database operation in case database is sleeping
        await retryDatabaseOperation(async () => {
            return await prisma.user.upsert({
                where: { email: userInfo.email! },
                update: {
                    googleAccessToken: encryptedAccessToken,
                    ...(encryptedRefreshToken && { googleRefreshToken: encryptedRefreshToken }),
                    googleTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
                    name: userInfo.name,
                    avatar: userInfo.picture,
                },
                create: {
                    email: userInfo.email!,
                    name: userInfo.name,
                    avatar: userInfo.picture,
                    googleAccessToken: encryptedAccessToken,
                    ...(encryptedRefreshToken && { googleRefreshToken: encryptedRefreshToken }),
                    googleTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
                },
            });
        });

        return NextResponse.redirect(new URL('/inbox', request.url));
    } catch (error: any) {
        console.error('OAuth callback error:', error);
        
        // Special handling for database connection errors
        if (error.code === 'P1001' || error.message?.includes("Can't reach database")) {
            return NextResponse.redirect(
                new URL('/login?error=database_unavailable&message=' + encodeURIComponent('Database is waking up. Please wait 30 seconds and try connecting Gmail again.'), request.url)
            );
        }
        
        return NextResponse.json({ 
            error: 'Failed to exchange token',
            details: error.message,
            response: error.response?.data
        }, { status: 500 });
    }
}
