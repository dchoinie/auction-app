"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import Container from "~/components/Container";
import { useRouter } from "next/navigation";

export default function CreateTeamPage() {
  const { user } = useUser();
  const [teamName, setTeamName] = useState("");
  const [ownerName, setOwnerName] = useState(
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : "",
  );
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName,
          ownerName: ownerName || `${user?.firstName} ${user?.lastName}`,
        }),
      });
      if (!res.ok) throw new Error("Failed to create team");
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to create team:", error);
    }
  };

  return (
    <Container>
      <h1 className="mb-8 text-2xl font-bold">Create New Team</h1>
      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Team Name
          </label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="mt-1 block w-full rounded-md border p-2"
            placeholder="Enter team name"
          />
        </div>

        {/* Only show owner name input if Clerk doesn't have the info */}
        {(!user?.firstName || !user?.lastName) && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Owner Name
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="mt-1 block w-full rounded-md border p-2"
              placeholder="Enter your full name"
              required
            />
          </div>
        )}

        <button
          type="submit"
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Create Team
        </button>
      </form>
    </Container>
  );
}
