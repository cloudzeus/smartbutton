import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard")
    const isOnAuth = req.nextUrl.pathname.startsWith("/auth")

    if (isOnDashboard && !isLoggedIn) {
        return NextResponse.redirect(new URL("/auth/signin", req.url))
    }

    if (isOnAuth && isLoggedIn) {
        return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    return NextResponse.next()
})

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
