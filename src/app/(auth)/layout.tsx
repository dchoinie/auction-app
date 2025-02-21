import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import Navigation from "~/components/Navigation";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SignedIn>
        <Navigation />
        {children}
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
