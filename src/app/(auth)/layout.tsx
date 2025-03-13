import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import Navigation from "~/components/Navigation";
import { NotificationProvider } from "~/contexts/NotificationContext";
import GlobalNotifications from "~/components/GlobalNotifications";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SignedIn>
        <NotificationProvider>
          <GlobalNotifications />
          <Navigation />
          {children}
        </NotificationProvider>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
