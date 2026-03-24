import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { createClient } from './supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export type ApiResponse<T = any> = {
    data?: T;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    message?: string;
    error?: string;
    details?: any;
};

export function successResponse<T>(data: T, message?: string, pagination?: ApiResponse['pagination']) {
    return NextResponse.json({
        data,
        message,
        pagination,
    });
}

export function errorResponse(message: string, status: number = 400, details?: any) {
    return NextResponse.json(
        {
            error: message,
            details,
        },
        { status }
    );
}

export function handleApiError(error: any) {
    console.error('API Error:', error);

    if (error instanceof ZodError) {
        return errorResponse('Validation error', 400, error.errors);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Standard Prisma error handling
        if (error.code === 'P2002') {
            return errorResponse('Duplicate record found', 409);
        }
        if (error.code === 'P2025') {
            return errorResponse('Record not found', 404);
        }
        return errorResponse('Database error', 500, { code: error.code });
    }

    return errorResponse(error.message || 'Internal server error', 500);
}

/**
 * Get MongoDB user from Supabase user (handles MongoDB ObjectId vs Supabase UUID)
 * @returns MongoDB user or null if not found
 */
export async function getMongoUserFromSupabase(supabaseUser: SupabaseUser) {
    if (!supabaseUser.email) {
        return null;
    }
    
    return await prisma.user.findUnique({
        where: { email: supabaseUser.email }
    });
}

/**
 * Get authenticated user (Supabase + MongoDB)
 * @returns { supabaseUser, mongoUser } or null if unauthorized
 */
export async function getAuthenticatedUser() {
    const supabase = await createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser) {
        return null;
    }

    const mongoUser = await getMongoUserFromSupabase(supabaseUser);
    
    return { supabaseUser, mongoUser };
}
