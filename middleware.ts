
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Simple in-memory rate limiting (Note: clears on server restart)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT = 100;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Do not run on static assets or auth routes
    if (
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/api/auth') ||
        request.nextUrl.pathname.startsWith('/auth/callback') ||
        request.nextUrl.pathname === '/login'
    ) {
        return supabaseResponse
    }

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user && request.nextUrl.pathname !== '/login') {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Rate Limiting
    if (user && request.nextUrl.pathname.startsWith('/api')) {
        const userId = user.id;
        const now = Date.now();
        const userRateInfo = rateLimitMap.get(userId) || { count: 0, lastReset: now };

        if (now - userRateInfo.lastReset > RATE_LIMIT_WINDOW) {
            userRateInfo.count = 1;
            userRateInfo.lastReset = now;
        } else {
            userRateInfo.count++;
        }

        rateLimitMap.set(userId, userRateInfo);

        if (userRateInfo.count > RATE_LIMIT) {
            return NextResponse.json(
                { error: 'Too many requests' },
                { 
                    status: 429,
                    headers: {
                        'Retry-After': Math.ceil((userRateInfo.lastReset + RATE_LIMIT_WINDOW - now) / 1000).toString()
                    }
                }
            );
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
