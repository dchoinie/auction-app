import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default function LandingPage() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="max-w-2xl">
        <h1 className="mb-6 text-5xl font-bold text-gray-900">
          True Fliers Fantasy Football
        </h1>
        <p className="mb-8 text-xl text-gray-600">
          Join the ultimate fantasy football auction experience. Draft your
          dream team, manage your budget, and compete with fellow managers.
        </p>

        <div className="flex justify-center gap-4">
          <SignInButton mode="modal">
            <button className="rounded bg-blue-500 px-6 py-3 font-semibold text-white transition hover:bg-blue-600">
              Sign In
            </button>
          </SignInButton>

          <SignUpButton mode="modal">
            <button className="rounded border-2 border-blue-500 px-6 py-3 font-semibold text-blue-500 transition hover:bg-blue-50">
              Create Account
            </button>
          </SignUpButton>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h3 className="mb-2 font-semibold">Live Auction Draft</h3>
            <p className="text-sm text-gray-600">
              Real-time bidding with live updates
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="mb-2 font-semibold">Budget Management</h3>
            <p className="text-sm text-gray-600">
              Strategic fund allocation for your roster
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="mb-2 font-semibold">Player Analytics</h3>
            <p className="text-sm text-gray-600">
              In-depth stats and predictions
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
