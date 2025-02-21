import { create } from "zustand";

interface NFLPlayer {
  id: number;
  firstName: string;
  lastName: string;
  position: "QB" | "RB" | "WR" | "TE";
  nflTeamName: string;
  draftedAmount: number | null;
}

interface Roster {
  id: number;
  teamId: number;
  QB: NFLPlayer | null;
  RB1: NFLPlayer | null;
  RB2: NFLPlayer | null;
  WR1: NFLPlayer | null;
  WR2: NFLPlayer | null;
  TE: NFLPlayer | null;
  Flex1: NFLPlayer | null;
  Flex2: NFLPlayer | null;
  Bench1: NFLPlayer | null;
  Bench2: NFLPlayer | null;
  Bench3: NFLPlayer | null;
  Bench4: NFLPlayer | null;
  Bench5: NFLPlayer | null;
  Bench6: NFLPlayer | null;
}

interface RosterStore {
  rosters: Record<number, Roster | null>; // Cache by teamId
  isLoading: boolean;
  error: string | null;
  fetchRoster: (teamId: number) => Promise<void>;
}

export const useRosterStore = create<RosterStore>((set, get) => ({
  rosters: {},
  isLoading: false,
  error: null,
  fetchRoster: async (teamId: number) => {
    // Return cached data if available
    if (get().rosters[teamId]) return;

    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/teams/${teamId}/roster`);
      if (!res.ok) throw new Error("Failed to fetch roster");
      const data = await res.json();
      set((state) => ({
        rosters: { ...state.rosters, [teamId]: data },
        isLoading: false,
      }));
    } catch (error) {
      set({ error: "Failed to fetch roster", isLoading: false });
      throw error;
    }
  },
}));
