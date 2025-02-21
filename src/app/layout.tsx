import { ClerkProvider, ClerkLoading } from "@clerk/nextjs";
import "../styles/globals.css";
import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "True Fliers Auction",
  description: "True Fliers Auction",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${GeistSans.variable} h-full`}>
        <body className="flex h-full flex-col">
          <ClerkLoading>
            <div className="fixed inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
                <p className="text-gray-600">Loading...</p>
              </div>
            </div>
          </ClerkLoading>
          <div className="flex min-h-full flex-col">
            <main className="flex-1">{children}</main>
            <footer className="bg-gray-300 py-4 text-center text-sm text-gray-800">
              © {new Date().getFullYear()} Dan Choiniere
            </footer>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
