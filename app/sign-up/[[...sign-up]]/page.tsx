import { auth } from "@clerk/nextjs/server";
import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { SignUpRedirectFailsafe } from "../SignUpRedirectFailsafe";

const AUTH_CALLBACK = "/auth/callback";

export default async function SignUpPage({
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
    console.log("[auth]", { pathname: "/sign-up", hasRedirectUrl, hasNext, isSignedIn: false });
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <SignUpRedirectFailsafe />
      <SignUp
        afterSignUpUrl={AUTH_CALLBACK}
        redirectUrl={AUTH_CALLBACK}
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-none border border-stone-200",
          },
        }}
      />
    </main>
  );
}
