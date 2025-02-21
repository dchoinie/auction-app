"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Container from "~/components/Container";
import { useTeamsStore } from "~/store/teams";

export default function CreateTeamPage() {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const createTeam = useTeamsStore((state) => state.createTeam);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createTeam(name);
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to create team:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container>
      <h1 className="mb-6 text-2xl font-bold">Create Your Team</h1>
      <form onSubmit={handleSubmit} className="max-w-md">
        <div className="mb-4">
          <label htmlFor="name" className="mb-2 block font-medium">
            Team Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border p-2"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create Team"}
        </button>
      </form>
    </Container>
  );
}
