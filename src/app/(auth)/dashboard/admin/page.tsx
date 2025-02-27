"use client";

import { useState, useEffect } from "react";
import Container from "~/components/Container";
import PlayerImport from "./components/PlayerImport";
import { useUserRole } from "~/hooks/use-user-role";
import { hasPermission } from "~/lib/permissions";
import { redirect } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Team {
  id: number;
  name: string;
  ownerName: string;
  draftOrder: number | null;
}

interface SortableTeamItemProps {
  team: Team;
  isModified?: boolean;
}

function SortableTeamItem({ team, isModified }: SortableTeamItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: team.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`my-12 flex items-center gap-4 rounded-lg border p-4 ${
        isDragging ? "bg-blue-50 shadow-lg" : "bg-white"
      } ${isModified ? "border-amber-500" : ""}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 font-semibold text-gray-700">
        {team.draftOrder ?? "—"}
      </div>
      <div>
        <div className="font-medium">{team.name}</div>
        <div className="text-sm text-gray-500">{team.ownerName}</div>
        {isModified && <div className="text-xs text-amber-600">Modified</div>}
      </div>
      <div className="ml-auto cursor-move text-gray-400">⋮⋮</div>
    </div>
  );
}

export default function AdminPage() {
  const role = useUserRole();
  const [teams, setTeams] = useState<Team[]>([]);
  const [draftOrderChanges, setDraftOrderChanges] = useState<
    Record<number, number>
  >({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [isResettingDraft, setIsResettingDraft] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setTeams((teams) => {
      const oldIndex = teams.findIndex((team) => team.id === active.id);
      const newIndex = teams.findIndex((team) => team.id === over.id);

      const newTeams = arrayMove(teams, oldIndex, newIndex);

      // Update draft order changes based on new positions
      const newChanges = { ...draftOrderChanges };
      newTeams.forEach((team, index) => {
        const newPosition = index + 1;
        if (team.draftOrder !== newPosition) {
          newChanges[team.id] = newPosition;
        }
      });
      setDraftOrderChanges(newChanges);

      return newTeams;
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

  const handleRandomize = () => {
    setTeams((currentTeams) => {
      // Create a copy of teams array
      const shuffledTeams = [...currentTeams];

      // Fisher-Yates shuffle algorithm
      for (let i = shuffledTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledTeams[i], shuffledTeams[j]] = [
          shuffledTeams[j],
          shuffledTeams[i],
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

  const handleResetDraft = async () => {
    if (
      !confirm(
        "Are you sure you want to reset the draft? This will clear all rosters, player assignments, and budgets. This action cannot be undone.",
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

  const hasUnsavedChanges = Object.keys(draftOrderChanges).length > 0;

  return (
    <Container>
      <h1 className="mb-6 text-2xl font-bold">Admin Dashboard</h1>

      {/* Draft Order Section */}
      <div className="mb-8 rounded-lg border p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Set Draft Order</h2>
            <button
              onClick={handleRandomize}
              disabled={isUpdating}
              className={`ml-4 rounded-md px-4 py-2 text-white ${
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

        <div className="space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={teams.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {teams.map((team) => (
                <SortableTeamItem
                  key={team.id}
                  team={team}
                  isModified={draftOrderChanges[team.id] !== undefined}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Player Import Section */}
      <div className="mb-8">
        <PlayerImport />
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
