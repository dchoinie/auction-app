"use client";

import { useState, useEffect } from "react";
import Container from "~/components/Container";
import ManualPlayerAssign from "./components/ManualPlayerAssign";
import { useUserRole } from "~/hooks/use-user-role";
import { hasPermission } from "~/lib/permissions";
import { redirect, useRouter } from "next/navigation";
import Link from "next/link";
import { useNominationStore } from "~/store/nomination";
import { usePartySocket } from "partysocket/react";

interface Team {
  id: number;
  name: string;
  ownerName: string;
  draftOrder: number | null;
}

interface SyncResponse {
  message: string;
}

function TeamListItem({
  team,
  isModified,
}: {
  team: Team;
  isModified?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded border px-2 py-1 text-sm ${
        isModified ? "border-amber-500" : "border-gray-200"
      }`}
    >
      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
        {team.draftOrder ?? "—"}
      </div>
      <span className="font-medium">{team.name}</span>
      <span className="text-xs text-gray-500">({team.ownerName})</span>
      {isModified && <span className="text-xs text-amber-600">*</span>}
    </div>
  );
}

export default function AdminPage() {
  const role = useUserRole();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [draftOrderChanges, setDraftOrderChanges] = useState<
    Record<number, number>
  >({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [isResettingDraft, setIsResettingDraft] = useState(false);
  const [isSyncingPlayers, setIsSyncingPlayers] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const { resetNomination } = useNominationStore();

  // Add socket connection
  const socket = usePartySocket({
    host: process.env.NEXT_PUBLIC_PARTYKIT_HOST!,
    room: "draft",
  });

  useEffect(() => {
    const fetchTeams = async () => {
      const response = await fetch("/api/teams");
      const data = (await response.json()) as Team[];
      setTeams(data);
    };
    void fetchTeams();
  }, []);

  if (!hasPermission(role, "admin")) {
    redirect("/dashboard");
  }

  const handleRandomize = () => {
    setTeams((currentTeams) => {
      // Create a copy of teams array
      const shuffledTeams = [...currentTeams];

      // Fisher-Yates shuffle algorithm
      for (let i = shuffledTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledTeams[i], shuffledTeams[j]] = [
          shuffledTeams[j]!,
          shuffledTeams[i]!,
        ];
      }

      // Update draft order changes based on new random positions
      const newChanges = { ...draftOrderChanges };
      shuffledTeams.forEach((team, index) => {
        const newPosition = index + 1;
        if (team.draftOrder !== newPosition) {
          newChanges[team.id] = newPosition;
        }
      });
      setDraftOrderChanges(newChanges);

      return shuffledTeams;
    });
  };

  const handleSaveDraftOrder = async () => {
    setIsUpdating(true);
    setUpdateMessage(null);

    try {
      const response = await fetch("/api/teams/draft-order", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ updates: draftOrderChanges }),
      });

      if (!response.ok) {
        throw new Error("Failed to update draft order");
      }

      // Update local state
      setTeams(
        teams.map((team) => ({
          ...team,
          draftOrder: draftOrderChanges[team.id] ?? team.draftOrder,
        })),
      );

      // Clear changes
      setDraftOrderChanges({});

      setUpdateMessage({
        type: "success",
        text: "Draft order updated successfully",
      });
    } catch (error) {
      setUpdateMessage({ type: "error", text: "Failed to update draft order" });
      console.error("Error updating draft order:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetDraft = async () => {
    if (
      !confirm(
        "Are you sure you want to reset the draft? This will clear all rosters, player assignments, budgets, and draft order. This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsResettingDraft(true);
    setUpdateMessage(null);

    try {
      // Reset rosters
      await fetch("/api/rosters/reset", {
        method: "POST",
      });

      // Reset NFL players
      await fetch("/api/nfl-players/reset", {
        method: "POST",
      });

      // Reset team budgets
      await fetch("/api/teams/budget/reset", {
        method: "POST",
      });

      // Reset draft orders
      await fetch("/api/teams/draft-order/reset", {
        method: "POST",
      });

      // Reset nomination store AFTER all resets are complete
      resetNomination();

      // Broadcast draft reset to all clients
      socket.send(
        JSON.stringify({
          type: "draft_reset",
        }),
      );

      // Fetch updated teams list
      const response = await fetch("/api/teams");
      const data = (await response.json()) as Team[];
      setTeams(data);

      // Clear any pending draft order changes
      setDraftOrderChanges({});

      setUpdateMessage({
        type: "success",
        text: "Draft has been reset successfully",
      });
    } catch (error) {
      console.error("Error resetting draft:", error);
      setUpdateMessage({
        type: "error",
        text: "Failed to reset draft",
      });
    } finally {
      setIsResettingDraft(false);
    }
  };

  const handleSyncPlayers = async () => {
    if (
      !confirm(
        "Are you sure you want to sync NFL players? This will replace all existing players in the database.",
      )
    ) {
      return;
    }

    setIsSyncingPlayers(true);
    setUpdateMessage(null);

    try {
      const response = await fetch("/api/nfl-players/sync", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to sync players");
      }

      const data = (await response.json()) as SyncResponse;
      setUpdateMessage({
        type: "success",
        text: data.message,
      });
    } catch (error) {
      console.error("Error syncing players:", error);
      setUpdateMessage({
        type: "error",
        text: "Failed to sync players",
      });
    } finally {
      setIsSyncingPlayers(false);
    }
  };

  const hasUnsavedChanges = Object.keys(draftOrderChanges).length > 0;

  return (
    <Container className="mb-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>

      {/* Rosters Section */}
      <div className="mb-8">
        <Link
          href="/dashboard/admin/rosters"
          className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          View All Rosters
        </Link>
      </div>

      {/* Draft Order Section */}
      <div className="mb-8 rounded-lg border p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Set Draft Order</h2>
            <button
              onClick={handleRandomize}
              disabled={isUpdating}
              className={`rounded-md px-4 py-2 text-white ${
                isUpdating
                  ? "cursor-not-allowed bg-gray-400"
                  : "bg-purple-500 hover:bg-purple-600"
              }`}
            >
              Randomize Order
            </button>
          </div>
          {hasUnsavedChanges && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-amber-600">
                You have unsaved changes
              </span>
              <button
                onClick={handleSaveDraftOrder}
                disabled={isUpdating}
                className={`rounded-md px-4 py-2 text-white ${
                  isUpdating
                    ? "cursor-not-allowed bg-blue-400"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {isUpdating ? "Saving..." : "Save Draft Order"}
              </button>
            </div>
          )}
        </div>

        {updateMessage && (
          <div
            className={`mb-4 rounded-lg p-3 ${
              updateMessage.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {updateMessage.text}
          </div>
        )}

        <div className="grid grid-cols-10">
          {teams.map((team) => (
            <TeamListItem
              key={team.id}
              team={team}
              isModified={draftOrderChanges[team.id] !== undefined}
            />
          ))}
        </div>
      </div>

      {/* Player Management Section */}
      <div className="mb-8 rounded-lg border p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Player Management</h2>
          <button
            onClick={handleSyncPlayers}
            disabled={isSyncingPlayers}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-white ${
              isSyncingPlayers
                ? "cursor-not-allowed bg-blue-400"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {isSyncingPlayers ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Syncing Players...</span>
              </>
            ) : (
              "Sync NFL Players"
            )}
          </button>
        </div>
        {isSyncingPlayers && (
          <div className="mb-4 rounded-lg bg-blue-50 p-4 text-blue-700">
            <p className="text-sm">
              Please wait while we sync NFL players. This may take a few moments
              as we process a large amount of data.
            </p>
          </div>
        )}
      </div>

      {/* Manual Player Assignment Section */}
      <div className="mb-8">
        <ManualPlayerAssign />
      </div>

      {/* Reset Draft Section */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h2 className="mb-4 text-xl font-semibold text-red-800">Reset Draft</h2>
        <p className="mb-6 text-red-700">
          Warning: This action will reset the entire draft. It will clear all
          rosters, player assignments, and team budgets. This action cannot be
          undone.
        </p>
        <div className="flex items-center justify-between">
          <button
            onClick={handleResetDraft}
            disabled={isResettingDraft}
            className={`rounded-md px-6 py-3 text-white ${
              isResettingDraft
                ? "cursor-not-allowed bg-red-400"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isResettingDraft ? "Resetting Draft..." : "Reset Draft"}
          </button>
          {updateMessage && updateMessage.type === "success" && (
            <span className="text-green-600">{updateMessage.text}</span>
          )}
          {updateMessage && updateMessage.type === "error" && (
            <span className="text-red-600">{updateMessage.text}</span>
          )}
        </div>
      </div>
    </Container>
  );
}
