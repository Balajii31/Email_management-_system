
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in search params, use it as the redirection URL
    const next = searchParams.get('next') ?? '/'

    console.log('Auth callback hit with code:', !!code)
    if (code) {
        const supabase = await createClient()
        const { data: { user: supabaseUser }, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            console.error('Auth error exchanging code:', error)
        }

        if (!error && supabaseUser) {
            console.log('User authenticated:', supabaseUser.email)
            // Create user in Prisma if not exists
            try {
                await prisma.user.upsert({
                    where: { email: supabaseUser.email! },
                    update: {
                        name: supabaseUser.user_metadata.full_name,
                        avatar: supabaseUser.user_metadata.avatar_url,
                    },
                    create: {
                        email: supabaseUser.email!,
                        name: supabaseUser.user_metadata.full_name,
                        avatar: supabaseUser.user_metadata.avatar_url,
                        id: supabaseUser.id, // Use Supabase user ID as primary key
                    },
                })
                console.log('User synced to Prisma')
            } catch (err) {
                console.error('Prisma upsert error:', err)
            }

            console.log('Redirecting to:', `${origin}${next}`)
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
