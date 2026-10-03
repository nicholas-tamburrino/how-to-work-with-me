import { auth } from "@clerk/nextjs/server";
import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { SignInRedirectFailsafe } from "../SignInRedirectFailsafe";
import { SignInRememberEmail } from "../SignInRememberEmail";

const AUTH_CALLBACK = "/auth/callback";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string; next?: string }>;
}) {
  const { userId } = await auth();
  if (userId) {
    redirect(AUTH_CALLBACK);
  }

  const params = await searchParams;
  const hasRedirectUrl = "redirect_url" in params && !!params.redirect_url;
  const hasNext = "next" in params && !!params.next;
  if (process.env.AUTH_DEBUG === "true") {
    console.log("[auth]", { pathname: "/sign-in", hasRedirectUrl, hasNext, isSignedIn: false });
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <SignInRedirectFailsafe />
      <div className="flex flex-col items-center">
        <SignIn
          afterSignInUrl={AUTH_CALLBACK}
          redirectUrl={AUTH_CALLBACK}
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-none border border-stone-200",
            },
          }}
        />
        <SignInRememberEmail />
      </div>
    </main>
  );
}
