import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NominationState {
  currentRound: number;
  currentNominatorDraftOrder: number;
  setCurrentNominator: (draftOrder: number) => void;
  moveToNextNominator: () => void;
  resetNomination: () => void;
  forceNextDirection: (direction: "forward" | "backward") => void;
}

export const useNominationStore = create<NominationState>()(
  persist(
    (set) => ({
      currentRound: 1, // Start with round 1
      currentNominatorDraftOrder: 1, // Start with draft order 1
      setCurrentNominator: (draftOrder) => {
        set((state) => {
          // If the draft order is changing to a value that doesn't make sense for the current round,
          // we need to adjust the round number
          if (state.currentRound % 2 === 1) {
            // Odd rounds go 1 -> 10
            if (draftOrder < state.currentNominatorDraftOrder) {
              // If we're going backwards in an odd round, we need to move to the next round
              return {
                currentRound: state.currentRound + 1,
                currentNominatorDraftOrder: draftOrder,
              };
            }
          } else {
            // Even rounds go 10 -> 1
            if (draftOrder > state.currentNominatorDraftOrder) {
              // If we're going forwards in an even round, we need to move to the next round
              return {
                currentRound: state.currentRound + 1,
                currentNominatorDraftOrder: draftOrder,
              };
            }
          }
          return { currentNominatorDraftOrder: draftOrder };
        });
      },
      moveToNextNominator: () =>
        set((state) => {
          // In odd rounds (1, 3, 5...), go from 1 to 10
          if (state.currentRound % 2 === 1) {
            if (state.currentNominatorDraftOrder === 10) {
              // End of round, move to next round and start from 10
              return {
                currentRound: state.currentRound + 1,
                currentNominatorDraftOrder: 10,
              };
            }
            // Continue forward in odd rounds
            return {
              currentNominatorDraftOrder: state.currentNominatorDraftOrder + 1,
            };
          } else {
            // In even rounds (2, 4, 6...), go from 10 to 1
            if (state.currentNominatorDraftOrder === 1) {
              // End of round, move to next round and start from 1
              return {
                currentRound: state.currentRound + 1,
                currentNominatorDraftOrder: 1,
              };
            }
            // Continue backward in even rounds
            return {
              currentNominatorDraftOrder: state.currentNominatorDraftOrder - 1,
            };
          }
        }),
      resetNomination: () =>
        set({
          currentRound: 1,
          currentNominatorDraftOrder: 1,
        }),
      forceNextDirection: (direction) =>
        set((state) => {
          // If we want to force forward direction
          if (direction === "forward") {
            // If we're in an even round, move to next round and start from 1
            if (state.currentRound % 2 === 0) {
              return {
                currentRound: state.currentRound + 1,
                currentNominatorDraftOrder: 1,
              };
            }
            // If we're in an odd round but at 10, move to next round and start from 1
            if (state.currentNominatorDraftOrder === 10) {
              return {
                currentRound: state.currentRound + 1,
                currentNominatorDraftOrder: 1,
              };
            }
            // Otherwise, just move forward
            return {
              currentNominatorDraftOrder: state.currentNominatorDraftOrder + 1,
            };
          } else {
            // If we want to force backward direction
            // If we're in an odd round, move to next round and start from 10
            if (state.currentRound % 2 === 1) {
              return {
                currentRound: state.currentRound + 1,
                currentNominatorDraftOrder: 10,
              };
            }
            // If we're in an even round but at 1, move to next round and start from 10
            if (state.currentNominatorDraftOrder === 1) {
              return {
                currentRound: state.currentRound + 1,
                currentNominatorDraftOrder: 10,
              };
            }
            // Otherwise, just move backward
            return {
              currentNominatorDraftOrder: state.currentNominatorDraftOrder - 1,
            };
          }
        }),
    }),
    {
      name: "nomination-storage", // unique name for localStorage key
      partialize: (state) => ({
        currentRound: state.currentRound,
        currentNominatorDraftOrder: state.currentNominatorDraftOrder,
      }), // only persist these fields
    },
  ),
);
