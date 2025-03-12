import { clerkMiddleware } from "@clerk/nextjs/server";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your middleware
export default clerkMiddleware();

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - party (PartyKit server)
     * - api/webhook (webhook endpoints)
     * - api/uploadthing (uploadthing endpoints)
     */
    "/((?!_next/static|_next/image|favicon.ico|party|api/webhook|api/uploadthing).*)",
  ],
};
