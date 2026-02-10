
'use client'

import { useState } from 'react'
import { createClientBrowser } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail } from 'lucide-react'

export default function LoginPage() {
    const [loading, setLoading] = useState(false)
    const supabase = createClientBrowser()

    const handleLogin = async () => {
        try {
            setLoading(true)
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            })
            if (error) throw error
        } catch (error) {
            console.error('Error logging in:', error)
            alert('Error logging in')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
                    <CardDescription>
                        Login to your email management system
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center py-8">
                    <div className="rounded-full bg-primary/10 p-6">
                        <Mail className="h-12 w-12 text-primary" />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full"
                        onClick={handleLogin}
                        disabled={loading}
                    >
                        {loading ? 'Connecting...' : 'Continue with Google'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
