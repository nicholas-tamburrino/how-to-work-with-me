import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/s(.*)",
  "/auth(.*)",
  "/api/health",
]);

export default clerkMiddleware((auth, req) => {
  const pathname = req.nextUrl.pathname;
  // Let all /api/* requests through; route handlers enforce auth where needed.
  if (pathname.startsWith("/api/")) {
    if (process.env.NODE_ENV === "development" && pathname.startsWith("/api/responses")) {
      // eslint-disable-next-line no-console
      console.log("[middleware] /api/responses allowed through (no intercept)");
    }
    return NextResponse.next();
  }
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
