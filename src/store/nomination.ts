import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NominationState {
  currentNominatorDraftOrder: number;
  isSnakingBack: boolean;
  setCurrentNominator: (draftOrder: number) => void;
  moveToNextNominator: () => void;
  resetNomination: () => void;
}

export const useNominationStore = create<NominationState>()(
  persist(
    (set) => ({
      currentNominatorDraftOrder: 1, // Start with draft order 1
      isSnakingBack: false,
      setCurrentNominator: (draftOrder) =>
        set({ currentNominatorDraftOrder: draftOrder }),
      moveToNextNominator: () =>
        set((state) => {
          if (state.isSnakingBack) {
            // If we're at draft order 1 while snaking back, switch direction
            if (state.currentNominatorDraftOrder === 1) {
              return {
                currentNominatorDraftOrder: 2,
                isSnakingBack: false,
              };
            }
            // Continue snaking back
            return {
              currentNominatorDraftOrder: state.currentNominatorDraftOrder - 1,
            };
          } else {
            // If we reach draft order 10, start snaking back
            if (state.currentNominatorDraftOrder === 10) {
              return {
                currentNominatorDraftOrder: 10,
                isSnakingBack: true,
              };
            }
            // Continue forward
            return {
              currentNominatorDraftOrder: state.currentNominatorDraftOrder + 1,
            };
          }
        }),
      resetNomination: () =>
        set({ currentNominatorDraftOrder: 1, isSnakingBack: false }),
    }),
    {
      name: "nomination-storage",
      partialize: (state) => ({
        currentNominatorDraftOrder: state.currentNominatorDraftOrder,
        isSnakingBack: state.isSnakingBack,
      }),
    },
  ),
);
