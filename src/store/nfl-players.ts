import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NFLPlayer {
  id: number;
  firstName: string;
  lastName: string;
  position: string;
  nflTeamName: string;
  assignedTeamId: number | null;
  draftedAmount: number | null;
}

interface NFLPlayersStore {
  players: NFLPlayer[];
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;
  fetchPlayers: () => Promise<void>;
  updatePlayer: (playerId: number, updates: Partial<NFLPlayer>) => void;
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
      updatePlayer: (playerId, updates) =>
        set((state) => ({
          players: state.players.map((player) =>
            player.id === playerId ? { ...player, ...updates } : player,
          ),
        })),
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
