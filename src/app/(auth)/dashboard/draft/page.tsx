/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Container from "~/components/Container";
import { usePartySocket } from "partysocket/react";
import { useNFLPlayersStore } from "~/store/nfl-players";
import { useNominationStore } from "~/store/nomination";
import NFLPlayerSelect from "./components/NFLPlayerSelect";
import Countdown from "./components/Countdown";
import RosterModal from "./components/RosterModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { Notification } from "./components/UserNotification";
import { useNotifications } from "~/contexts/NotificationContext";

interface NFLPlayer {
  id: number;
  firstName: string;
  lastName: string;
  nflTeamName: string;
  position: string;
}

interface DraftBid {
  userId: string;
  userName: string;
  amount: number;
  timestamp: number;
  teamId: number;
}

interface DraftUser {
  id: string;
  name: string;
  isActive: boolean;
  joinedAt: number;
  connectionId?: string;
  lastHeartbeat?: number;
}

interface DraftState {
  selectedPlayer: NFLPlayer | null;
  currentBid: DraftBid | null;
  users: DraftUser[];
  currentNominatorDraftOrder: number;
  currentRound: number;
  isCountdownActive: boolean;
  countdownStartTime: number | null;
  triggeredBy: string | null;
}

interface DraftMessage {
  type:
    | "users"
    | "welcome"
    | "select_player"
    | "new_bid"
    | "init_state"
    | "user_joined"
    | "user_left"
    | "heartbeat"
    | "update_nomination"
    | "start_countdown"
    | "cancel_countdown"
    | "countdown_complete"
    | "draft_reset";
  users?: DraftUser[];
  message?: string;
  player?: NFLPlayer;
  bid?: DraftBid;
  startTime?: number;
  state?: DraftState;
  user?: DraftUser;
  userId?: string;
  triggeredBy?: string;
}

interface BidHistoryItem {
  userId: string;
  userName: string;
  amount: number;
  timestamp: number;
  isHighestBid: boolean;
}

interface TeamResponse {
  id: number;
  name: string;
  ownerName: string;
  ownerId: string;
  draftOrder: number | null;
  totalBudget: number;
}

interface Team {
  id: number;
  name: string;
  ownerName: string;
  ownerId: string;
  draftOrder: number | null;
  totalBudget: number;
}

interface TeamBudget {
  teamId: number;
  spentAmount: number;
}

interface Roster {
  id: number;
  teamId: number;
  QB: number | null;
  RB1: number | null;
  RB2: number | null;
  WR1: number | null;
  WR2: number | null;
  TE: number | null;
  Flex1: number | null;
  Flex2: number | null;
  Bench1: number | null;
  Bench2: number | null;
  Bench3: number | null;
  Bench4: number | null;
  Bench5: number | null;
  Bench6: number | null;
}

export default function DraftRoomPage() {
  const router = useRouter();
  const { user } = useUser();
  const {
    currentNominatorDraftOrder,
    moveToNextNominator,
    setCurrentNominator,
    forceNextDirection,
    currentRound,
  } = useNominationStore();
  const [isConnected, setIsConnected] = useState(false);
  const { players, fetchPlayers, updatePlayer, invalidateCache } =
    useNFLPlayersStore();
  const [selectedPlayer, setSelectedPlayer] = useState<NFLPlayer | null>(null);
  const [currentBid, setCurrentBid] = useState<DraftBid | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(1);
  const [bidIncrement] = useState(1);
  const [initialNominationAmount, setInitialNominationAmount] = useState(1);
  const [bidHistory, setBidHistory] = useState<BidHistoryItem[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [activeUserIds, setActiveUserIds] = useState<Set<string>>(new Set());
  const [showCountdown, setShowCountdown] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamBudgets, setTeamBudgets] = useState<Record<number, number>>({});
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [isAssigningPlayer, setIsAssigningPlayer] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [nominationError, setNominationError] = useState<string | null>(null);
  const [isPlayerConfirmed, setIsPlayerConfirmed] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "reconnecting"
  >("disconnected");
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [previousOnlineUsers, setPreviousOnlineUsers] = useState<Set<string>>(
    new Set(),
  );
  const { addNotification } = useNotifications();
  const [countdownStartTime, setCountdownStartTime] = useState<
    number | undefined
  >(undefined);
  const [countdownTriggeredBy, setCountdownTriggeredBy] = useState<
    string | undefined
  >(undefined);

  // Add effect to update online users when Clerk session changes
  useEffect(() => {
    if (user) {
      setOnlineUsers((prev) => new Set([...prev, user.id]));
    }
  }, [user]);

  // Track user activity changes and show notifications
  useEffect(() => {
    if (teams.length === 0) return; // Skip if teams aren't loaded yet

    // Find new users that weren't online before
    const newUsers = Array.from(onlineUsers).filter(
      (userId) => !previousOnlineUsers.has(userId),
    );

    // Find users that left
    const leftUsers = Array.from(previousOnlineUsers).filter(
      (userId) => !onlineUsers.has(userId),
    );

    // Create notifications for new users
    newUsers.forEach((userId) => {
      const team = teams.find((t) => t.ownerId === userId);
      if (team && userId !== user?.id) {
        // Don't notify about the current user
        addNotification({
          message: `${team.ownerName} has joined the draft room`,
          type: "success",
        });
      }
    });

    // Create notifications for users that left
    leftUsers.forEach((userId) => {
      const team = teams.find((t) => t.ownerId === userId);
      if (team && userId !== user?.id) {
        // Don't notify about the current user
        addNotification({
          message: `${team.ownerName} has left the draft room`,
          type: "warning",
        });
      }
    });

    // Update previous online users for next comparison
    setPreviousOnlineUsers(new Set(onlineUsers));
  }, [onlineUsers, teams, user?.id, addNotification]);

  const socket = usePartySocket({
    host: process.env.NEXT_PUBLIC_PARTYKIT_HOST!,
    room: "draft",
    onOpen() {
      console.log("Connected to PartyKit");
      setIsConnected(true);
      setConnectionStatus("connected");
      // Server will automatically send init_state after connection
    },
    onClose() {
      console.log("Disconnected from PartyKit");
      setIsConnected(false);
      setConnectionStatus("disconnected");
      cleanup();
    },
    onMessage(event: MessageEvent) {
      try {
        const data = JSON.parse(event.data as string) as DraftMessage;

        switch (data.type) {
          case "init_state":
            // Always set users if they exist, regardless of current bid
            if (data.state?.users) {
              console.log("Setting initial active users:", data.state.users);
              setActiveUserIds(
                new Set(data.state.users.map((user) => user.id)),
              );
            }

            // Set other state if there's a current bid
            if (data.state?.currentBid) {
              setSelectedPlayer(data.state.selectedPlayer);
              setCurrentBid(data.state.currentBid);
              setBidAmount(data.state.currentBid.amount + bidIncrement);
            }

            // Update nomination state
            if (data.state?.currentNominatorDraftOrder) {
              setCurrentNominator(data.state.currentNominatorDraftOrder);
            }

            if (
              data.state?.isCountdownActive &&
              data.state?.countdownStartTime
            ) {
              setShowCountdown(true);
              setCountdownStartTime(data.state.countdownStartTime);
              // Use optional chaining for triggeredBy since it's optional
              if (data.state?.triggeredBy) {
                setCountdownTriggeredBy(data.state.triggeredBy);
              }
            }
            break;
          case "welcome":
            console.log("Welcome message:", data.message);
            break;
          case "select_player":
            if (data.player) {
              setSelectedPlayer(data.player);
              setCurrentBid(null);
              setBidAmount(1);
              setIsPlayerConfirmed(false); // Reset confirmation when a new player is selected

              // Sync nomination state
              if (data.state) {
                setCurrentNominator(data.state.currentNominatorDraftOrder);
                // Note: We don't set currentRound here as it's managed by the store
              }
            } else {
              // Handle clearing the selected player
              setSelectedPlayer(null);
              setCurrentBid(null);
              setBidHistory([]);
              setBidAmount(1);
              setIsPlayerConfirmed(false);
            }
            break;
          case "new_bid":
            if (data.bid) {
              setCurrentBid(data.bid);
              setBidAmount(data.bid.amount + 1);
              setIsPlayerConfirmed(true);

              // Create new bid history item
              const newBid: BidHistoryItem = {
                userId: data.bid.userId,
                userName: data.bid.userName,
                amount: data.bid.amount,
                timestamp: data.bid.timestamp,
                isHighestBid: true,
              };

              // Update bid history ensuring uniqueness and proper ordering
              setBidHistory((prev) => {
                // Remove any existing bids from this user for this amount (prevent duplicates)
                const filteredHistory = prev.filter(
                  (bid) =>
                    !(
                      bid.userId === newBid.userId &&
                      bid.amount === newBid.amount
                    ),
                );

                // Add new bid and mark all others as not highest
                return [
                  newBid,
                  ...filteredHistory.map((bid) => ({
                    ...bid,
                    isHighestBid: false,
                  })),
                ].slice(0, 10); // Keep only last 10 bids
              });
            }
            break;
          case "user_joined":
            if (data.user) {
              setActiveUserIds((prev) => new Set([...prev, data.user!.id]));
              setOnlineUsers((prev) => new Set([...prev, data.user!.id]));
            }
            break;
          case "user_left":
            if (data.userId) {
              setActiveUserIds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(data.userId!);
                return newSet;
              });
              setOnlineUsers((prev) => {
                const newSet = new Set(prev);
                newSet.delete(data.userId!);
                return newSet;
              });
            }
            break;
          case "update_nomination":
            if (data.state) {
              console.log("Received nomination update:", data.state);
              // Update the nomination store with the new state
              setCurrentNominator(data.state.currentNominatorDraftOrder);

              // Update other state if needed
              if (data.state.selectedPlayer !== undefined) {
                setSelectedPlayer(data.state.selectedPlayer);
              }
              if (data.state.currentBid !== undefined) {
                setCurrentBid(data.state.currentBid);
                if (data.state.currentBid) {
                  setBidAmount(data.state.currentBid.amount + bidIncrement);
                }
              }
              if (data.state.users) {
                setActiveUserIds(
                  new Set(data.state.users.map((user) => user.id)),
                );
              }
            }
            break;
          case "start_countdown":
            if (data.startTime) {
              setShowCountdown(true);
              setCountdownStartTime(data.startTime);
              setCountdownTriggeredBy(data.triggeredBy);
            }
            break;
          case "cancel_countdown":
            setShowCountdown(false);
            setCountdownStartTime(undefined);
            setCountdownTriggeredBy(undefined);
            break;
          case "countdown_complete":
            if (data.state) {
              setSelectedPlayer(null);
              setCurrentBid(null);
              setBidHistory([]);
              setBidAmount(1);
              setIsPlayerConfirmed(false);
              if (data.state.currentNominatorDraftOrder) {
                setCurrentNominator(data.state.currentNominatorDraftOrder);
              }
            }
            break;
          case "draft_reset":
            // Reset all local state
            setSelectedPlayer(null);
            setCurrentBid(null);
            setBidHistory([]);
            setBidAmount(1);
            setInitialNominationAmount(1);
            setIsPlayerConfirmed(false);
            setShowCountdown(false);
            setIsSelling(false);
            setCountdownStartTime(undefined);
            setCountdownTriggeredBy(undefined);

            // Refresh teams, budgets, and rosters
            void (async () => {
              try {
                // Fetch fresh teams data
                const teamsRes = await fetch("/api/teams");
                const teamsData = (await teamsRes.json()) as TeamResponse[];
                setTeams(
                  teamsData.map((team) => ({
                    id: team.id,
                    name: team.name,
                    ownerName: team.ownerName,
                    ownerId: team.ownerId,
                    draftOrder: team.draftOrder,
                    totalBudget: team.totalBudget,
                  })),
                );

                // Fetch fresh budget data
                const budgetsRes = await fetch("/api/teams/budget");
                const budgets = (await budgetsRes.json()) as TeamBudget[];
                setTeamBudgets(
                  Object.fromEntries(
                    budgets.map((b) => [b.teamId, b.spentAmount]),
                  ),
                );

                // Fetch fresh roster data
                const rostersRes = await fetch("/api/rosters");
                const rostersData = (await rostersRes.json()) as Roster[];
                setRosters(rostersData);

                // Invalidate and refresh players cache
                invalidateCache();
                void fetchPlayers();
              } catch (error) {
                console.error(
                  "Error refreshing data after draft reset:",
                  error,
                );
              }
            })();
            break;
        }
      } catch (e) {
        console.error("Error processing message:", e);
      }
    },
  });

  // Force a fresh fetch when the component mounts
  useEffect(() => {
    invalidateCache(); // Clear the cache
    void fetchPlayers(); // Fetch fresh data
  }, [fetchPlayers, invalidateCache]);

  // Fetch teams on mount
  useEffect(() => {
    const fetchTeams = async () => {
      setIsLoadingTeams(true);
      try {
        const res = await fetch("/api/teams");
        const data = (await res.json()) as TeamResponse[];
        setTeams(
          data.map((team) => ({
            id: team.id,
            name: team.name,
            ownerName: team.ownerName,
            ownerId: team.ownerId,
            draftOrder: team.draftOrder,
            totalBudget: team.totalBudget,
          })),
        );
      } catch (error) {
        console.error("Error fetching teams:", error);
      } finally {
        setIsLoadingTeams(false);
      }
    };
    void fetchTeams();
  }, []);

  // Add this effect to fetch budgets
  useEffect(() => {
    const fetchBudgets = async () => {
      const res = await fetch("/api/teams/budget");
      const budgets = (await res.json()) as TeamBudget[];
      setTeamBudgets(
        Object.fromEntries(budgets.map((b) => [b.teamId, b.spentAmount])),
      );
    };
    void fetchBudgets();
  }, [currentBid]); // Refetch when bids are finalized

  useEffect(() => {
    const fetchRosters = async () => {
      try {
        const res = await fetch("/api/rosters");
        const data = (await res.json()) as Roster[];
        setRosters(data);
      } catch (error) {
        console.error("Error fetching rosters:", error);
      }
    };
    void fetchRosters();
  }, [currentBid]); // Refetch when players are drafted

  const joinDraftRoom = () => {
    if (user) {
      // Send join message to server
      socket.send(
        JSON.stringify({
          type: "join",
          user: {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            isActive: true,
            joinedAt: Date.now(),
          },
        }),
      );
    }
  };

  const leaveDraftRoom = () => {
    if (user) {
      socket.send(
        JSON.stringify({
          type: "leave",
          userId: user.id,
        }),
      );
      router.push("/dashboard");
    }
  };

  const handlePlayerSelect = (playerId: number) => {
    const player = players.find((p) => p.id === playerId);
    // Only allow selection if it's the user's team's turn to nominate
    const userTeam = teams.find((team) => team.ownerId === user?.id);
    const isAdmin = user?.publicMetadata?.role === "admin";
    const currentNominatorTeam = teams.find(
      (t) => t.draftOrder === currentNominatorDraftOrder,
    );

    if (!userTeam && !isAdmin) {
      setNominationError("You must be on a team to nominate players");
      setTimeout(() => setNominationError(null), 5000);
      return;
    }

    if (!isAdmin && userTeam?.draftOrder !== currentNominatorDraftOrder) {
      setNominationError(
        `It's ${currentNominatorTeam?.name}'s turn to nominate a player`,
      );
      setTimeout(() => setNominationError(null), 5000);
      return;
    }

    if (player && user) {
      setNominationError(null);
      setSelectedPlayer(player);
      setCurrentBid(null);
      setBidAmount(1);
      setInitialNominationAmount(1);
      setIsPlayerConfirmed(false); // Reset confirmation status when a new player is selected

      // Send complete state to server
      socket.send(
        JSON.stringify({
          type: "select_player",
          player,
          state: {
            selectedPlayer: player,
            currentBid: null,
            currentRound,
            currentNominatorDraftOrder,
            users: Array.from(activeUserIds).map((id) => ({
              id,
              name: teams.find((t) => t.ownerId === id)?.ownerName || "",
              isActive: true,
              joinedAt: Date.now(),
            })),
            isCountdownActive: false,
            countdownStartTime: null,
            triggeredBy: null,
          } satisfies DraftState,
        }),
      );
    }
  };

  const handleBidSubmit = () => {
    if (!user || !selectedPlayer || isSelling) return; // Only check isSelling, not showCountdown

    // Find the user's team
    const userTeam = teams.find((team) => team.ownerId === user.id);
    if (!userTeam) return;

    // Calculate remaining budget and roster spots
    const remainingBudget =
      userTeam.totalBudget - (teamBudgets[userTeam.id] ?? 0);
    const roster = rosters.find((r) => r.teamId === userTeam.id);
    const rosterPositions = [
      "QB",
      "RB1",
      "RB2",
      "WR1",
      "WR2",
      "TE",
      "Flex1",
      "Flex2",
      "Bench1",
      "Bench2",
      "Bench3",
      "Bench4",
      "Bench5",
      "Bench6",
    ];
    const filledSpots = roster
      ? rosterPositions.filter(
          (pos) => roster[pos as keyof typeof roster] !== null,
        ).length
      : 0;
    const totalRosterSpots = 14;
    const remainingSpots = totalRosterSpots - filledSpots;
    const reserveAmount = remainingSpots - 1;
    const maxBid = Math.max(0, remainingBudget - reserveAmount);

    // Validate bid amount
    const minBid = (currentBid?.amount ?? 0) + 1;
    if (bidAmount < minBid || bidAmount > maxBid) {
      return; // Don't allow invalid bids
    }

    // Reset countdown if it's active
    if (showCountdown) {
      socket.send(
        JSON.stringify({
          type: "cancel_countdown",
        }),
      );
    }

    const newBid: DraftBid = {
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      amount: bidAmount,
      timestamp: Date.now(),
      teamId: userTeam.id,
    };

    // Update local state optimistically
    setCurrentBid(newBid);
    setBidHistory((prev) =>
      [
        { ...newBid, isHighestBid: true },
        ...prev.map((bid) => ({ ...bid, isHighestBid: false })),
      ].slice(0, 10),
    );

    // Send to server
    socket.send(
      JSON.stringify({
        type: "new_bid",
        bid: newBid,
      }),
    );
  };

  const adjustBidAmount = (amount: number) => {
    if (!user) return;

    // Find the user's team
    const userTeam = teams.find((team) => team.ownerId === user.id);
    if (!userTeam) return;

    // Calculate remaining budget and roster spots
    const remainingBudget =
      userTeam.totalBudget - (teamBudgets[userTeam.id] ?? 0);
    const roster = rosters.find((r) => r.teamId === userTeam.id);
    const rosterPositions = [
      "QB",
      "RB1",
      "RB2",
      "WR1",
      "WR2",
      "TE",
      "Flex1",
      "Flex2",
      "Bench1",
      "Bench2",
      "Bench3",
      "Bench4",
      "Bench5",
      "Bench6",
    ];
    const filledSpots = roster
      ? rosterPositions.filter(
          (pos) => roster[pos as keyof typeof roster] !== null,
        ).length
      : 0;
    const totalRosterSpots = 14;
    const remainingSpots = totalRosterSpots - filledSpots;
    const reserveAmount = remainingSpots - 1;
    const maxBid = Math.max(0, remainingBudget - reserveAmount);

    // Calculate the new bid amount
    const newBidAmount = bidAmount + amount;
    const minBid = (currentBid?.amount ?? 0) + 1;

    // Only allow the bid if it's within valid range
    if (newBidAmount >= minBid && newBidAmount <= maxBid) {
      setBidAmount(newBidAmount);
    }
  };

  const handleCountdownComplete = useCallback(async () => {
    // Only the user who triggered the countdown should handle the player assignment
    if (!user || user.id !== countdownTriggeredBy) {
      setShowCountdown(false);
      setIsSelling(false);
      return;
    }

    // Set isSelling first to prevent any new bids
    setIsSelling(true);
    // Then remove the countdown display
    setShowCountdown(false);

    if (!selectedPlayer || !currentBid) {
      setIsSelling(false);
      return;
    }

    setIsAssigningPlayer(true);

    try {
      // Update NFL player and roster in one call
      const playerResponse = await fetch(
        `/api/nfl-players/${selectedPlayer.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assignedTeamId: currentBid.teamId,
            draftedAmount: currentBid.amount,
            isKeeper: false,
          }),
        },
      );

      if (!playerResponse.ok) {
        throw new Error("Failed to update player");
      }

      // Update the player in the store
      updatePlayer(selectedPlayer.id, {
        assignedTeamId: currentBid.teamId,
        draftedAmount: currentBid.amount,
      });

      // Add notification for successful draft
      const draftedTeam = teams.find((t) => t.id === currentBid.teamId);
      if (draftedTeam) {
        addNotification({
          message: `${selectedPlayer.firstName} ${selectedPlayer.lastName} drafted by ${draftedTeam.name} for $${currentBid.amount}`,
          type: "info",
        });
      }

      // Move to next nominator after player is drafted
      // Keep moving to next nominator until we find a team with available spots
      let nextNominatorFound = false;
      let nextNominatorDraftOrder = currentNominatorDraftOrder;
      while (!nextNominatorFound) {
        // Move to next nominator and capture the new value
        moveToNextNominator();
        nextNominatorDraftOrder = currentNominatorDraftOrder;

        // Find the next nominator's team
        const nextNominatorTeam = teams.find(
          (t) => t.draftOrder === nextNominatorDraftOrder,
        );

        if (!nextNominatorTeam) {
          // If no team found, we've gone through all teams
          break;
        }

        // Check if the team has any available spots
        const roster = rosters.find((r) => r.teamId === nextNominatorTeam.id);
        const rosterPositions = [
          "QB",
          "RB1",
          "RB2",
          "WR1",
          "WR2",
          "TE",
          "Flex1",
          "Flex2",
          "Bench1",
          "Bench2",
          "Bench3",
          "Bench4",
          "Bench5",
          "Bench6",
        ];

        const filledSpots = roster
          ? rosterPositions.filter(
              (pos) => roster[pos as keyof typeof roster] !== null,
            ).length
          : 0;

        if (filledSpots < 14) {
          nextNominatorFound = true;
          // Set the current nominator to the next valid nominator
          setCurrentNominator(nextNominatorDraftOrder);
        }
      }

      // First, broadcast the nomination update to all users
      socket.send(
        JSON.stringify({
          type: "update_nomination",
          state: {
            selectedPlayer: null,
            currentBid: null,
            currentRound,
            currentNominatorDraftOrder: nextNominatorDraftOrder,
            users: Array.from(activeUserIds).map((id) => ({
              id,
              name: teams.find((t) => t.ownerId === id)?.ownerName || "",
              isActive: true,
              joinedAt: Date.now(),
            })),
            isCountdownActive: false,
            countdownStartTime: null,
            triggeredBy: null,
          } satisfies DraftState,
        }),
      );

      // Then notify other users that countdown is complete
      socket.send(
        JSON.stringify({
          type: "countdown_complete",
          state: {
            selectedPlayer: null,
            currentBid: null,
            currentRound,
            currentNominatorDraftOrder: nextNominatorDraftOrder,
            users: Array.from(activeUserIds).map((id) => ({
              id,
              name: teams.find((t) => t.ownerId === id)?.ownerName || "",
              isActive: true,
              joinedAt: Date.now(),
            })),
            isCountdownActive: false,
            countdownStartTime: null,
            triggeredBy: null,
          } satisfies DraftState,
        }),
      );

      // Refresh team budgets to update the UI
      const budgetsResponse = await fetch("/api/teams/budget");
      const budgets = (await budgetsResponse.json()) as TeamBudget[];
      setTeamBudgets(
        Object.fromEntries(budgets.map((b) => [b.teamId, b.spentAmount])),
      );
    } catch (error) {
      console.error("Error finalizing draft:", error);
      addNotification({
        message: "Error finalizing draft. Please try again.",
        type: "error",
      });
    } finally {
      setIsAssigningPlayer(false);
      setIsSelling(false);
      setCountdownTriggeredBy(undefined);
    }
  }, [
    user,
    countdownTriggeredBy,
    selectedPlayer,
    currentBid,
    socket,
    updatePlayer,
    moveToNextNominator,
    teams,
    rosters,
    addNotification,
    currentRound,
    currentNominatorDraftOrder,
  ]);

  const handleCountdownCancel = useCallback(() => {
    setShowCountdown(false);
    setIsSelling(false);
  }, []);

  // Add cleanup function for WebSocket
  const cleanup = useCallback(() => {
    if (user) {
      socket.send(
        JSON.stringify({
          type: "leave",
          userId: user.id,
        }),
      );
    }
  }, [socket, user]);

  // Clean up on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Update connection status based on socket state
  useEffect(() => {
    setConnectionStatus(isConnected ? "connected" : "disconnected");
  }, [isConnected]);

  // Update the connection status indicator in the UI
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500";
      case "reconnecting":
        return "bg-yellow-500";
      case "disconnected":
        return "bg-red-500";
    }
  };

  // Update the countdown trigger function
  const triggerCountdown = () => {
    if (!user) return;
    setCountdownTriggeredBy(user.id);
    socket.send(
      JSON.stringify({
        type: "start_countdown",
        triggeredBy: user.id,
      }),
    );
  };

  // Update the countdown cancel function
  const cancelCountdown = () => {
    socket.send(
      JSON.stringify({
        type: "cancel_countdown",
      }),
    );
  };

  return (
    <Container>
      <div className="mb-32 mt-6 flex flex-col gap-4 sm:mb-64 sm:mt-12">
        {/* Teams section - now horizontal at top */}
        <div className="rounded-lg border p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <h2 className="text-base font-semibold sm:text-lg">Teams</h2>
          </div>
          {isLoadingTeams ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
              <p className="mt-4 text-sm text-gray-500">Loading teams...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {[...teams]
                .sort((a, b) => {
                  // If both have draft orders, compare them
                  if (a.draftOrder !== null && b.draftOrder !== null) {
                    return a.draftOrder - b.draftOrder;
                  }
                  // If only one has a draft order, the one with the draft order comes first
                  if (a.draftOrder !== null) return -1;
                  if (b.draftOrder !== null) return 1;
                  // If neither has a draft order, maintain their original order
                  return 0;
                })
                .map((team) => {
                  const remainingBudget =
                    team.totalBudget - (teamBudgets[team.id] ?? 0);
                  const roster = rosters.find((r) => r.teamId === team.id);
                  const isCurrentNominator =
                    team.draftOrder !== null &&
                    team.draftOrder === currentNominatorDraftOrder;
                  const isUserActive = onlineUsers.has(team.ownerId);

                  // Calculate roster spots
                  const rosterPositions = [
                    "QB",
                    "RB1",
                    "RB2",
                    "WR1",
                    "WR2",
                    "TE",
                    "Flex1",
                    "Flex2",
                    "Bench1",
                    "Bench2",
                    "Bench3",
                    "Bench4",
                    "Bench5",
                    "Bench6",
                  ];

                  const filledSpots = roster
                    ? rosterPositions.filter(
                        (pos) => roster[pos as keyof typeof roster] !== null,
                      ).length
                    : 0;

                  const totalRosterSpots = 14;
                  const remainingSpots = totalRosterSpots - filledSpots;
                  const reserveAmount = remainingSpots - 1;
                  const maxBid = Math.max(0, remainingBudget - reserveAmount);

                  return (
                    <div
                      key={team.id}
                      className={`relative rounded-lg border p-2 text-sm transition-all ${
                        isCurrentNominator
                          ? "border-blue-500 bg-blue-50 shadow-md"
                          : ""
                      }`}
                    >
                      {isCurrentNominator && (
                        <span className="absolute -top-[12px] left-1/2 -translate-x-1/2 transform rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 shadow-sm">
                          Nominating
                        </span>
                      )}
                      {user?.publicMetadata?.role === "admin" && (
                        <div className="absolute right-2 top-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100">
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (team.draftOrder) {
                                    setCurrentNominator(team.draftOrder);
                                  }
                                }}
                                disabled={!team.draftOrder}
                              >
                                Set as Current Nominator
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => moveToNextNominator()}
                                disabled={!isCurrentNominator}
                              >
                                Skip Turn
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  forceNextDirection(
                                    currentRound % 2 === 1
                                      ? "backward"
                                      : "forward",
                                  );
                                }}
                              >
                                Direction:{" "}
                                {currentRound % 2 === 1
                                  ? "⬅️ Backward"
                                  : "➡️ Forward"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            isUserActive ? "bg-green-500" : "bg-gray-300"
                          }`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {team.draftOrder && (
                              <span className="text-sm font-semibold text-blue-600">
                                #{team.draftOrder}
                              </span>
                            )}
                            <span className="font-medium">{team.name}</span>
                            {team.ownerId === user?.id && (
                              <span className="text-xs text-gray-500">
                                (You)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">
                            {team.ownerName}
                          </p>
                          <div className="mt-1 flex items-center justify-between">
                            <div className="text-sm">
                              <span className="font-medium text-green-600">
                                ${remainingBudget}
                              </span>
                              <span className="text-gray-500"> remaining</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-blue-600">
                                {filledSpots}
                              </span>
                              <span className="text-gray-500"> filled</span>
                            </div>
                          </div>
                          <div className="mt-1 flex items-center justify-between">
                            <div className="text-sm">
                              <span className="font-medium text-amber-600">
                                ${maxBid > 0 ? maxBid : 0}
                              </span>
                              <span className="text-gray-500"> max bid</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-blue-600">
                                {remainingSpots}
                              </span>
                              <span className="text-gray-500"> remaining</span>
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedTeam(team)}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                          >
                            View Team
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Main draft room content */}
        <div className="rounded-lg border p-3 sm:p-4">
          <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold sm:text-2xl">Draft Room</h1>
              <div className="flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs sm:gap-2 sm:px-3 sm:text-sm">
                <span className="text-sm font-medium text-blue-700">Round</span>
                <span className="text-lg font-bold text-blue-800">
                  {currentRound}
                </span>
                <span className="text-sm font-medium text-blue-700">Pick</span>
                <span className="text-lg font-bold text-blue-800">
                  {currentNominatorDraftOrder}
                </span>
                <span className="text-sm font-medium text-blue-700">
                  {currentRound % 2 === 1 ? "➡️" : "⬅️"}
                </span>
              </div>
            </div>
            {isConnected && (
              <button
                onClick={leaveDraftRoom}
                className="mt-2 rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600 sm:mt-0 sm:px-4 sm:py-2 sm:text-base"
              >
                Leave Room
              </button>
            )}
          </div>
          {!isConnected ? (
            <button
              onClick={joinDraftRoom}
              className="mt-4 rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600 sm:px-4 sm:py-2 sm:text-base"
            >
              Join Draft Room
            </button>
          ) : (
            <p className="mt-4 text-green-600">Connected to draft room</p>
          )}

          {/* Nomination Error Alert */}
          {nominationError && (
            <div className="mt-4 rounded-lg border border-red-500 bg-red-50 p-3 text-red-700">
              <p className="font-medium">{nominationError}</p>
            </div>
          )}

          {/* Replace the old dropdown with the new component */}
          <NFLPlayerSelect
            selectedPlayerId={selectedPlayer?.id}
            onPlayerSelect={handlePlayerSelect}
            isDisabled={
              !user ||
              (!teams.find((team) => team.ownerId === user.id)?.draftOrder &&
                user.publicMetadata?.role !== "admin") // Allow admin to always nominate
            }
            currentNominator={
              teams.find(
                (team) => team.draftOrder === currentNominatorDraftOrder,
              )?.name
            }
          />

          {/* Selected Player and Current Bid */}
          {selectedPlayer && (
            <div className="mb-6 space-y-4 overflow-hidden rounded-xl border-2 border-blue-500 bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4 shadow-2xl transition-all sm:space-y-6 sm:p-8">
              <div className="relative">
                {/* Sparkle effects */}
                <div className="absolute -left-4 -top-4 h-8 w-8 animate-pulse rounded-full bg-blue-200 opacity-50 blur-xl sm:h-12 sm:w-12"></div>
                <div className="absolute -bottom-4 -right-4 h-8 w-8 animate-pulse rounded-full bg-blue-200 opacity-50 blur-xl sm:h-12 sm:w-12"></div>

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-auto">
                    <div className="animate-pulse-slow absolute -inset-1 rounded-lg bg-gradient-to-r from-blue-600 via-sky-400 to-blue-600 opacity-20 blur"></div>
                    <div className="relative">
                      <h2 className="bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 bg-clip-text text-2xl font-bold text-transparent sm:text-4xl">
                        {selectedPlayer.firstName} {selectedPlayer.lastName}
                      </h2>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-sm font-semibold text-blue-800 sm:text-lg">
                          {selectedPlayer.position}
                        </span>
                        <span className="text-sm text-blue-600 sm:text-lg">
                          {selectedPlayer.nflTeamName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {currentBid ? (
                    <div className="relative mt-4 w-full sm:mt-0 sm:w-auto">
                      <div className="animate-pulse-slow absolute -inset-1 rounded-lg bg-gradient-to-r from-green-600 via-emerald-400 to-green-600 opacity-20 blur"></div>
                      <div className="relative rounded-xl border-2 border-green-500 bg-gradient-to-b from-green-50 to-white p-4 shadow-lg sm:p-6">
                        <div className="text-xs font-medium text-green-800 sm:text-sm">
                          Current Leader
                        </div>
                        <div className="bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
                          ${currentBid.amount}
                        </div>
                        <div className="text-xs font-medium text-green-600 sm:text-sm">
                          by {currentBid.userName}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                      <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-4">
                        <div className="flex w-full items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              setInitialNominationAmount((prev) =>
                                Math.max(1, prev - bidIncrement),
                              )
                            }
                            className={`rounded px-3 py-1 ${(() => {
                              if (!user) return "bg-gray-100 text-gray-400";
                              const userTeam = teams.find(
                                (team) => team.ownerId === user.id,
                              );
                              if (!userTeam) return "bg-gray-100 text-gray-400";
                              const minBid = 1;
                              return initialNominationAmount <= minBid
                                ? "bg-gray-100 text-gray-400"
                                : "bg-gray-200 hover:bg-gray-300";
                            })()}`}
                          >
                            -
                          </button>
                          <span className="min-w-[3ch] text-center">
                            ${initialNominationAmount}
                          </span>
                          <button
                            onClick={() => {
                              const currentNominatorTeam = teams.find(
                                (t) =>
                                  t.draftOrder === currentNominatorDraftOrder,
                              );
                              if (!currentNominatorTeam) return;

                              const remainingBudget =
                                currentNominatorTeam.totalBudget -
                                (teamBudgets[currentNominatorTeam.id] ?? 0);
                              const roster = rosters.find(
                                (r) => r.teamId === currentNominatorTeam.id,
                              );
                              const rosterPositions = [
                                "QB",
                                "RB1",
                                "RB2",
                                "WR1",
                                "WR2",
                                "TE",
                                "Flex1",
                                "Flex2",
                                "Bench1",
                                "Bench2",
                                "Bench3",
                                "Bench4",
                                "Bench5",
                                "Bench6",
                              ];
                              const filledSpots = roster
                                ? rosterPositions.filter(
                                    (pos) =>
                                      roster[pos as keyof typeof roster] !==
                                      null,
                                  ).length
                                : 0;
                              const totalRosterSpots = 14;
                              const remainingSpots =
                                totalRosterSpots - filledSpots;
                              const reserveAmount = remainingSpots - 1;
                              const maxBid = Math.max(
                                0,
                                remainingBudget - reserveAmount,
                              );

                              if (initialNominationAmount < maxBid) {
                                setInitialNominationAmount(
                                  (prev) => prev + bidIncrement,
                                );
                              }
                            }}
                            disabled={(() => {
                              const currentNominatorTeam = teams.find(
                                (t) =>
                                  t.draftOrder === currentNominatorDraftOrder,
                              );
                              if (!currentNominatorTeam) return true;

                              const remainingBudget =
                                currentNominatorTeam.totalBudget -
                                (teamBudgets[currentNominatorTeam.id] ?? 0);
                              const roster = rosters.find(
                                (r) => r.teamId === currentNominatorTeam.id,
                              );
                              const rosterPositions = [
                                "QB",
                                "RB1",
                                "RB2",
                                "WR1",
                                "WR2",
                                "TE",
                                "Flex1",
                                "Flex2",
                                "Bench1",
                                "Bench2",
                                "Bench3",
                                "Bench4",
                                "Bench5",
                                "Bench6",
                              ];
                              const filledSpots = roster
                                ? rosterPositions.filter(
                                    (pos) =>
                                      roster[pos as keyof typeof roster] !==
                                      null,
                                  ).length
                                : 0;
                              const totalRosterSpots = 14;
                              const remainingSpots =
                                totalRosterSpots - filledSpots;
                              const reserveAmount = remainingSpots - 1;
                              const maxBid = Math.max(
                                0,
                                remainingBudget - reserveAmount,
                              );

                              return initialNominationAmount >= maxBid;
                            })()}
                            className={`rounded px-3 py-1 ${(() => {
                              if (!user) return "bg-gray-100 text-gray-400";
                              const userTeam = teams.find(
                                (team) => team.ownerId === user.id,
                              );
                              if (!userTeam) return "bg-gray-100 text-gray-400";
                              const remainingBudget =
                                userTeam.totalBudget -
                                (teamBudgets[userTeam.id] ?? 0);
                              const roster = rosters.find(
                                (r) => r.teamId === userTeam.id,
                              );
                              const rosterPositions = [
                                "QB",
                                "RB1",
                                "RB2",
                                "WR1",
                                "WR2",
                                "TE",
                                "Flex1",
                                "Flex2",
                                "Bench1",
                                "Bench2",
                                "Bench3",
                                "Bench4",
                                "Bench5",
                                "Bench6",
                              ];
                              const filledSpots = roster
                                ? rosterPositions.filter(
                                    (pos) =>
                                      roster[pos as keyof typeof roster] !==
                                      null,
                                  ).length
                                : 0;
                              const totalRosterSpots = 14;
                              const remainingSpots =
                                totalRosterSpots - filledSpots;
                              const reserveAmount = remainingSpots - 1;
                              const maxBid = Math.max(
                                0,
                                remainingBudget - reserveAmount,
                              );
                              return bidAmount >= maxBid
                                ? "bg-gray-100 text-gray-400"
                                : "bg-gray-200 hover:bg-gray-300";
                            })()}`}
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            if (!user) return;

                            // Find the current nominator's team
                            const currentNominatorTeam = teams.find(
                              (t) =>
                                t.draftOrder === currentNominatorDraftOrder,
                            );
                            if (!currentNominatorTeam) return;

                            // Create initial bid using the current nominator's team's owner info
                            const initialBid: DraftBid = {
                              userId: currentNominatorTeam.ownerId,
                              userName: currentNominatorTeam.ownerName,
                              amount: initialNominationAmount,
                              timestamp: Date.now(),
                              teamId: currentNominatorTeam.id,
                            };

                            // Update local state
                            setCurrentBid(initialBid);
                            setBidAmount(initialNominationAmount + 1); // Set next bid to current + 1
                            setBidHistory((prev) =>
                              [
                                { ...initialBid, isHighestBid: true },
                                ...prev.map((bid) => ({
                                  ...bid,
                                  isHighestBid: false,
                                })),
                              ].slice(0, 10),
                            );

                            // Set player as confirmed
                            setIsPlayerConfirmed(true);

                            // Send to server
                            socket.send(
                              JSON.stringify({
                                type: "new_bid",
                                bid: initialBid,
                              }),
                            );
                          }}
                          className="w-full whitespace-nowrap rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-4 py-2 text-sm text-white shadow-lg transition-all hover:from-green-600 hover:to-green-700 hover:shadow-xl sm:w-auto sm:px-6 sm:py-3 sm:text-base"
                        >
                          Confirm Selection
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPlayer(null);
                            setIsPlayerConfirmed(false); // Reset confirmation status when selection is canceled
                            socket.send(
                              JSON.stringify({
                                type: "select_player",
                                player: null,
                              }),
                            );
                          }}
                          className="w-full whitespace-nowrap rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 px-4 py-2 text-sm text-white shadow-lg transition-all hover:from-gray-600 hover:to-gray-700 hover:shadow-xl sm:w-auto sm:px-6 sm:py-3 sm:text-base"
                        >
                          Cancel Selection
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bidding Controls */}
              <div className="space-y-4 rounded-lg bg-white/50 p-4 backdrop-blur-sm">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <label className="text-xs font-medium text-gray-700 sm:text-sm">
                      Bid Amount:
                    </label>
                    <button
                      onClick={() => adjustBidAmount(-bidIncrement)}
                      disabled={(() => {
                        if (!user) return true;
                        const userTeam = teams.find(
                          (team) => team.ownerId === user.id,
                        );
                        if (!userTeam) return true;
                        const minBid = (currentBid?.amount ?? 0) + 1;
                        return bidAmount <= minBid;
                      })()}
                      className={`rounded px-2 py-1 text-sm sm:px-3 ${(() => {
                        if (!user) return "bg-gray-100 text-gray-400";
                        const userTeam = teams.find(
                          (team) => team.ownerId === user.id,
                        );
                        if (!userTeam) return "bg-gray-100 text-gray-400";
                        const minBid = (currentBid?.amount ?? 0) + 1;
                        return bidAmount <= minBid
                          ? "bg-gray-100 text-gray-400"
                          : "bg-gray-200 hover:bg-gray-300";
                      })()}`}
                    >
                      -
                    </button>
                    <span className="min-w-[3ch] text-center text-sm sm:text-base">
                      ${bidAmount}
                    </span>
                    <button
                      onClick={() => adjustBidAmount(bidIncrement)}
                      disabled={(() => {
                        if (!user) return true;
                        const userTeam = teams.find(
                          (team) => team.ownerId === user.id,
                        );
                        if (!userTeam) return true;
                        const remainingBudget =
                          userTeam.totalBudget -
                          (teamBudgets[userTeam.id] ?? 0);
                        const roster = rosters.find(
                          (r) => r.teamId === userTeam.id,
                        );
                        const rosterPositions = [
                          "QB",
                          "RB1",
                          "RB2",
                          "WR1",
                          "WR2",
                          "TE",
                          "Flex1",
                          "Flex2",
                          "Bench1",
                          "Bench2",
                          "Bench3",
                          "Bench4",
                          "Bench5",
                          "Bench6",
                        ];
                        const filledSpots = roster
                          ? rosterPositions.filter(
                              (pos) =>
                                roster[pos as keyof typeof roster] !== null,
                            ).length
                          : 0;
                        const totalRosterSpots = 14;
                        const remainingSpots = totalRosterSpots - filledSpots;
                        const reserveAmount = remainingSpots - 1;
                        const maxBid = Math.max(
                          0,
                          remainingBudget - reserveAmount,
                        );
                        return bidAmount >= maxBid;
                      })()}
                      className={`rounded px-2 py-1 text-sm sm:px-3 ${(() => {
                        if (!user) return "bg-gray-100 text-gray-400";
                        const userTeam = teams.find(
                          (team) => team.ownerId === user.id,
                        );
                        if (!userTeam) return "bg-gray-100 text-gray-400";
                        const remainingBudget =
                          userTeam.totalBudget -
                          (teamBudgets[userTeam.id] ?? 0);
                        const roster = rosters.find(
                          (r) => r.teamId === userTeam.id,
                        );
                        const rosterPositions = [
                          "QB",
                          "RB1",
                          "RB2",
                          "WR1",
                          "WR2",
                          "TE",
                          "Flex1",
                          "Flex2",
                          "Bench1",
                          "Bench2",
                          "Bench3",
                          "Bench4",
                          "Bench5",
                          "Bench6",
                        ];
                        const filledSpots = roster
                          ? rosterPositions.filter(
                              (pos) =>
                                roster[pos as keyof typeof roster] !== null,
                            ).length
                          : 0;
                        const totalRosterSpots = 14;
                        const remainingSpots = totalRosterSpots - filledSpots;
                        const reserveAmount = remainingSpots - 1;
                        const maxBid = Math.max(
                          0,
                          remainingBudget - reserveAmount,
                        );
                        return bidAmount >= maxBid
                          ? "bg-gray-100 text-gray-400"
                          : "bg-gray-200 hover:bg-gray-300";
                      })()}`}
                    >
                      +
                    </button>
                    <button
                      onClick={handleBidSubmit}
                      disabled={(() => {
                        if (
                          !user ||
                          !selectedPlayer ||
                          isSelling ||
                          !isPlayerConfirmed
                        )
                          return true;

                        // Find the user's team
                        const userTeam = teams.find(
                          (team) => team.ownerId === user.id,
                        );
                        if (!userTeam) return true;

                        // Calculate remaining budget and roster spots
                        const remainingBudget =
                          userTeam.totalBudget -
                          (teamBudgets[userTeam.id] ?? 0);
                        const roster = rosters.find(
                          (r) => r.teamId === userTeam.id,
                        );
                        const rosterPositions = [
                          "QB",
                          "RB1",
                          "RB2",
                          "WR1",
                          "WR2",
                          "TE",
                          "Flex1",
                          "Flex2",
                          "Bench1",
                          "Bench2",
                          "Bench3",
                          "Bench4",
                          "Bench5",
                          "Bench6",
                        ];
                        const filledSpots = roster
                          ? rosterPositions.filter(
                              (pos) =>
                                roster[pos as keyof typeof roster] !== null,
                            ).length
                          : 0;
                        const totalRosterSpots = 14;
                        const remainingSpots = totalRosterSpots - filledSpots;
                        const reserveAmount = remainingSpots - 1;
                        const maxBid = Math.max(
                          0,
                          remainingBudget - reserveAmount,
                        );

                        // Validate bid amount
                        const minBid = (currentBid?.amount ?? 0) + 1;
                        return bidAmount < minBid || bidAmount > maxBid;
                      })()}
                      className={`rounded px-4 py-2 text-white ${(() => {
                        if (
                          !user ||
                          !selectedPlayer ||
                          isSelling ||
                          !isPlayerConfirmed
                        )
                          return "cursor-not-allowed bg-gray-400";
                        const userTeam = teams.find(
                          (team) => team.ownerId === user.id,
                        );
                        if (!userTeam) return "cursor-not-allowed bg-gray-400";
                        const remainingBudget =
                          userTeam.totalBudget -
                          (teamBudgets[userTeam.id] ?? 0);
                        const roster = rosters.find(
                          (r) => r.teamId === userTeam.id,
                        );
                        const rosterPositions = [
                          "QB",
                          "RB1",
                          "RB2",
                          "WR1",
                          "WR2",
                          "TE",
                          "Flex1",
                          "Flex2",
                          "Bench1",
                          "Bench2",
                          "Bench3",
                          "Bench4",
                          "Bench5",
                          "Bench6",
                        ];
                        const filledSpots = roster
                          ? rosterPositions.filter(
                              (pos) =>
                                roster[pos as keyof typeof roster] !== null,
                            ).length
                          : 0;
                        const totalRosterSpots = 14;
                        const remainingSpots = totalRosterSpots - filledSpots;
                        const reserveAmount = remainingSpots - 1;
                        const maxBid = Math.max(
                          0,
                          remainingBudget - reserveAmount,
                        );
                        const minBid = (currentBid?.amount ?? 0) + 1;
                        return bidAmount < minBid || bidAmount > maxBid
                          ? "cursor-not-allowed bg-gray-400"
                          : "bg-blue-500 hover:bg-blue-600";
                      })()}`}
                    >
                      {!selectedPlayer
                        ? "Select a Player"
                        : isSelling
                          ? "Bidding Closed"
                          : !isPlayerConfirmed
                            ? "Confirm player selection first"
                            : (() => {
                                if (!user) return "Not Logged In";
                                const userTeam = teams.find(
                                  (team) => team.ownerId === user.id,
                                );
                                if (!userTeam) return "No Team";
                                const remainingBudget =
                                  userTeam.totalBudget -
                                  (teamBudgets[userTeam.id] ?? 0);
                                const roster = rosters.find(
                                  (r) => r.teamId === userTeam.id,
                                );
                                const rosterPositions = [
                                  "QB",
                                  "RB1",
                                  "RB2",
                                  "WR1",
                                  "WR2",
                                  "TE",
                                  "Flex1",
                                  "Flex2",
                                  "Bench1",
                                  "Bench2",
                                  "Bench3",
                                  "Bench4",
                                  "Bench5",
                                  "Bench6",
                                ];
                                const filledSpots = roster
                                  ? rosterPositions.filter(
                                      (pos) =>
                                        roster[pos as keyof typeof roster] !==
                                        null,
                                    ).length
                                  : 0;
                                const totalRosterSpots = 14;
                                const remainingSpots =
                                  totalRosterSpots - filledSpots;
                                const reserveAmount = remainingSpots - 1;
                                const maxBid = Math.max(
                                  0,
                                  remainingBudget - reserveAmount,
                                );
                                const minBid = (currentBid?.amount ?? 0) + 1;
                                if (bidAmount < minBid)
                                  return `Bid must be > $${minBid}`;
                                if (bidAmount > maxBid)
                                  return `Max bid is $${maxBid}`;
                                return "Place Bid";
                              })()}
                    </button>
                  </div>

                  {currentBid && (
                    <button
                      onClick={triggerCountdown}
                      className={`mt-2 rounded px-3 py-1 text-xs text-white sm:mt-0 sm:px-4 sm:py-2 sm:text-sm ${
                        showCountdown || isSelling
                          ? "cursor-not-allowed bg-gray-400"
                          : "bg-yellow-500 hover:bg-yellow-600"
                      }`}
                      disabled={showCountdown || isSelling}
                    >
                      Trigger Countdown
                    </button>
                  )}
                </div>
              </div>

              {/* Bid History */}
              <div className="rounded-lg bg-white/50 p-4 backdrop-blur-sm">
                <h3 className="mb-3 text-base font-semibold text-gray-800 sm:text-lg">
                  Bid History
                </h3>
                <div className="space-y-2">
                  {bidHistory
                    .sort((a, b) => b.timestamp - a.timestamp) // Ensure newest bids are always at top
                    .map((bid) => (
                      <div
                        key={`${bid.userId}-${bid.amount}-${bid.timestamp}`}
                        className={`rounded-lg border-2 p-2 transition-all sm:p-3 ${
                          bid.isHighestBid
                            ? "border-green-500 bg-green-50 shadow-lg" // Highest bid is always green
                            : bid.userId === user?.id
                              ? "border-blue-400 bg-blue-50" // Your non-highest bids are blue
                              : "border-red-300 bg-red-50" // Other users' non-highest bids are red
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-sm font-medium sm:text-base ${
                              bid.isHighestBid
                                ? "text-green-800"
                                : bid.userId === user?.id
                                  ? "text-blue-800"
                                  : "text-red-800"
                            }`}
                          >
                            {bid.userName}
                            {bid.userId === user?.id && " (You)"}
                          </span>
                          <span
                            className={`text-base font-bold sm:text-lg ${
                              bid.isHighestBid
                                ? "text-green-700"
                                : bid.userId === user?.id
                                  ? "text-blue-700"
                                  : "text-red-700"
                            }`}
                          >
                            ${bid.amount}
                          </span>
                        </div>
                        <div
                          className={`text-xs sm:text-sm ${
                            bid.isHighestBid
                              ? "text-green-600"
                              : bid.userId === user?.id
                                ? "text-blue-600"
                                : "text-red-600"
                          }`}
                        >
                          {new Date(bid.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Countdown overlay */}
          {showCountdown && (
            <Countdown
              onComplete={handleCountdownComplete}
              onCancel={cancelCountdown}
              startTime={countdownStartTime}
            />
          )}

          {/* Loading overlay for player assignment */}
          {isAssigningPlayer && (
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
              <div className="rounded-lg bg-white/90 px-12 py-8 text-center shadow-lg">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                <p className="text-lg font-semibold text-gray-800">
                  Adding player and adjusting budgets...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Roster Modal */}
      {selectedTeam && (
        <RosterModal
          isOpen={Boolean(selectedTeam)}
          onClose={() => setSelectedTeam(null)}
          teamId={selectedTeam.id}
          teamName={selectedTeam.name}
        />
      )}
    </Container>
  );
}
