import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NFLPlayer {
  id: number;
  firstName: string;
  lastName: string;
  position: string;
  nflTeamName: string;
}

interface NFLPlayersStore {
  players: NFLPlayer[];
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;
  fetchPlayers: () => Promise<void>;
}

export const useNFLPlayersStore = create<NFLPlayersStore>()(
  persist(
    (set) => ({
      players: [],
      isLoading: false,
      error: null,
      hasFetched: false,
      fetchPlayers: async () => {
        // Only fetch if we haven't already
        if (!useNFLPlayersStore.getState().hasFetched) {
          set({ isLoading: true, error: null });
          try {
            const res = await fetch("/api/nfl-players");
            if (!res.ok) throw new Error("Failed to fetch players");
            const data = await res.json();
            set({ players: data, isLoading: false, hasFetched: true });
          } catch (error) {
            set({ error: "Failed to fetch players", isLoading: false });
            throw error;
          }
        }
      },
    }),
    {
      name: "nfl-players-storage",
      partialize: (state) => ({
        players: state.players,
        hasFetched: state.hasFetched,
      }),
    },
  ),
);
