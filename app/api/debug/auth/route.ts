import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/api-helpers';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();

        const mongoUser = supabaseUser?.email 
            ? await prisma.user.findUnique({ where: { email: supabaseUser.email } })
            : null;

        const allUsers = await prisma.user.findMany({
            select: { id: true, email: true, name: true }
        });

        return NextResponse.json({
            supabaseAuth: {
                authenticated: !!supabaseUser,
                email: supabaseUser?.email,
                id: supabaseUser?.id,
            },
            mongoUser: {
                found: !!mongoUser,
                id: mongoUser?.id,
                email: mongoUser?.email,
                name: mongoUser?.name,
            },
            allMongoUsers: allUsers,
            authHelperResult: await getAuthenticatedUser(),
        });
    } catch (error: any) {
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
