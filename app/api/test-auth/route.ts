import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const auth = await getAuthenticatedUser();

        if (!auth) {
            return NextResponse.json({
                error: 'No Supabase session found',
                loginStatus: 'Not logged in'
            }, { status: 401 });
        }

        const { supabaseUser, mongoUser } = auth;

        // Count emails for this user
        const emailCount = mongoUser ? await prisma.email.count({
            where: { userId: mongoUser.id }
        }) : 0;

        // Get all users with this email
        const allUsers = await prisma.user.findMany({
            where: { email: supabaseUser.email! }
        });

        // Count emails for each user
        const userStats = await Promise.all(
            allUsers.map(async (u) => ({
                id: u.id,
                email: u.email,
                name: u.name,
                emailCount: await prisma.email.count({ where: { userId: u.id } })
            }))
        );

        return NextResponse.json({
            loginStatus: 'Logged in',
            supabaseEmail: supabaseUser.email,
            mongoUserFound: !!mongoUser,
            mongoUserId: mongoUser?.id,
            mongoUserEmail: mongoUser?.email,
            emailsForThisUser: emailCount,
            allUsersWithThisEmail: userStats
        });
    } catch (error: any) {
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
