"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignInPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setIsLoading(true)

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            })

            if (result?.error) {
                setError("Invalid email or password")
            } else {
                router.push("/dashboard")
                router.refresh()
            }
        } catch (error) {
            setError("An error occurred. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-accent/20 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                        Hotel Smart Button
                    </CardTitle>
                    <CardDescription className="text-center text-base">
                        Sign in to access the PBX Dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="transition-all focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="transition-all focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        {error && (
                            <div className="p-3 text-sm text-destructive-foreground bg-destructive/10 border border-destructive rounded-md">
                                {error}
                            </div>
                        )}
                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-primary to-chart-2 hover:from-chart-2 hover:to-primary transition-all duration-300 shadow-lg hover:shadow-xl"
                            disabled={isLoading}
                        >
                            {isLoading ? "Signing in..." : "Sign In"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
