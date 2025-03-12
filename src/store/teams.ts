import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Team {
  id: number;
  name: string;
  ownerName: string;
  ownerId: string;
  draftOrder: number | null;
  totalBudget: number;
  createdAt: string;
}

interface ApiError {
  error: string;
  details?: string;
}

interface CreateTeamResponse {
  team: Team;
  roster: {
    id: number;
    teamId: number;
    createdAt: Date;
    updatedAt: Date | null;
  };
}

interface TeamsStore {
  teams: Team[];
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;
  fetchTeams: () => Promise<void>;
  createTeam: (name: string, ownerName: string) => Promise<Team>;
}

export const useTeamsStore = create<TeamsStore>()(
  persist(
    (set) => ({
      teams: [],
      isLoading: false,
      error: null,
      hasFetched: false,
      fetchTeams: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch("/api/teams");
          if (!res.ok) throw new Error("Failed to fetch teams");
          const data = (await res.json()) as Team[];
          set({ teams: data, isLoading: false, hasFetched: true });
        } catch (error) {
          set({ error: "Failed to fetch teams", isLoading: false });
          throw error;
        }
      },
      createTeam: async (name: string, ownerName: string) => {
        try {
          const res = await fetch("/api/teams", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ name, ownerName }),
          });

          const data = (await res.json()) as CreateTeamResponse | ApiError;

          if (!res.ok) {
            const error = data as ApiError;
            throw new Error(
              error.details ?? error.error ?? "Failed to create team",
            );
          }

          const response = data as CreateTeamResponse;
          set((state) => ({ teams: [...state.teams, response.team] }));
          return response.team;
        } catch (error) {
          console.error("Team creation error:", error);
          throw error;
        }
      },
    }),
    {
      name: "teams-storage", // unique name for localStorage key
      partialize: (state) => ({ teams: state.teams }), // only persist teams array
    },
  ),
);
