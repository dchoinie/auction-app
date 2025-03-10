/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";

import { useEffect, useState, useCallback } from "react";
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
}

interface DraftState {
  selectedPlayer: NFLPlayer | null;
  currentBid: DraftBid | null;
}

interface DraftMessage {
  type:
    | "users"
    | "welcome"
    | "select_player"
    | "new_bid"
    | "init_state"
    | "user_joined"
    | "user_left";
  users?: DraftUser[];
  message?: string;
  player?: NFLPlayer;
  bid?: DraftBid;
  state?: {
    selectedPlayer: NFLPlayer | null;
    currentBid: DraftBid | null;
    users: DraftUser[];
  };
  user?: DraftUser;
  userId?: string;
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
  } = useNominationStore();
  const [activeUsers, setActiveUsers] = useState<DraftUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { players, fetchPlayers, updatePlayer, invalidateCache } =
    useNFLPlayersStore();
  const [selectedPlayer, setSelectedPlayer] = useState<NFLPlayer | null>(null);
  const [currentBid, setCurrentBid] = useState<DraftBid | null>(null);
  const [bidAmount, setBidAmount] = useState(1);
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

  const socket = usePartySocket({
    host: process.env.NEXT_PUBLIC_PARTYKIT_HOST!,
    room: "draft",
    onOpen() {
      console.log("Connected to PartyKit");
      setIsConnected(true);
      // Server will automatically send init_state after connection
    },
    onClose() {
      console.log("Disconnected from PartyKit");
      setIsConnected(false);
    },
    onMessage(event: MessageEvent) {
      try {
        const data = JSON.parse(event.data as string) as DraftMessage;

        switch (data.type) {
          case "init_state":
            if (data.state?.currentBid) {
              setSelectedPlayer(data.state.selectedPlayer);
              setCurrentBid(data.state.currentBid);
              setBidAmount(
                data.state.currentBid ? data.state.currentBid.amount + 1 : 1,
              );

              // Always set users if they exist
              if (data.state.users) {
                const sortedUsers = [...data.state.users].sort(
                  (a, b) => a.joinedAt - b.joinedAt,
                );
                setActiveUsers(sortedUsers);
              }

              // Fix type safety in bid history
              const newBid: BidHistoryItem = {
                ...data.state.currentBid,
                isHighestBid: true,
              };
              setBidHistory((prev) =>
                [
                  newBid,
                  ...prev.map((bid) => ({ ...bid, isHighestBid: false })),
                ].slice(0, 10),
              );
            }
            break;
          case "welcome":
            console.log(data.message);
            break;
          case "select_player":
            if (data.player) {
              setSelectedPlayer(data.player);
              setCurrentBid(null);
              setBidAmount(1);
            }
            break;
          case "new_bid":
            if (data.bid) {
              setCurrentBid(data.bid);
              setBidAmount(data.bid.amount + 1);

              // Ensure bid has all required fields
              const newBid: BidHistoryItem = {
                userId: data.bid.userId,
                userName: data.bid.userName,
                amount: data.bid.amount,
                timestamp: data.bid.timestamp,
                isHighestBid: true,
              };

              setBidHistory((prev) =>
                [
                  newBid,
                  ...prev.map((bid) => ({ ...bid, isHighestBid: false })),
                ].slice(0, 10),
              );
            }
            break;
          case "user_joined":
            if (data.user) {
              setActiveUserIds((prev) => new Set(prev).add(data.user!.id));
            }
            break;
          case "user_left":
            if (data.userId) {
              setActiveUserIds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(data.userId!);
                return newSet;
              });
            }
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
      // Add user to active users immediately in local state
      const newUser: DraftUser = {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        isActive: true,
        joinedAt: Date.now(),
      };
      setActiveUsers((prev) => [...prev, newUser]);

      // Send join message to server
      socket.send(
        JSON.stringify({
          type: "join",
          user: newUser,
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
      socket.send(
        JSON.stringify({
          type: "select_player",
          player,
        }),
      );
    }
  };

  const handleBidSubmit = () => {
    if (!user || !selectedPlayer) return;

    // Find the user's team
    const userTeam = teams.find((team) => team.ownerId === user.id);
    if (!userTeam) return;

    // Cancel any active countdown
    setShowCountdown(false);

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
    const minBid = currentBid ? currentBid.amount + 1 : 1;
    setBidAmount(Math.max(minBid, bidAmount + amount));
  };

  const handleCountdownComplete = useCallback(async () => {
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

      // Move to next nominator after player is drafted
      // Keep moving to next nominator until we find a team with available spots
      let nextNominatorFound = false;
      while (!nextNominatorFound) {
        moveToNextNominator();

        // Find the current nominator's team
        const currentNominatorTeam = teams.find(
          (t) => t.draftOrder === currentNominatorDraftOrder,
        );

        if (!currentNominatorTeam) {
          // If no team found, we've gone through all teams
          break;
        }

        // Check if the team has any available spots
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
              (pos) => roster[pos as keyof typeof roster] !== null,
            ).length
          : 0;

        if (filledSpots < 14) {
          nextNominatorFound = true;
        }
      }

      // Clear the selected player and current bid
      setSelectedPlayer(null);
      setCurrentBid(null);
      setBidHistory([]);
      setBidAmount(1);

      // Notify other users via websocket
      socket.send(
        JSON.stringify({
          type: "player_drafted",
          player: selectedPlayer,
          bid: currentBid,
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
      // You might want to show an error message to the user here
    } finally {
      setIsAssigningPlayer(false);
      setIsSelling(false);
    }
  }, [
    selectedPlayer,
    currentBid,
    socket,
    updatePlayer,
    moveToNextNominator,
    teams,
    rosters,
  ]);

  const handleCountdownCancel = useCallback(() => {
    setShowCountdown(false);
    setIsSelling(false);
  }, []);

  return (
    <Container>
      <div className="mb-64 mt-12 flex flex-col gap-4">
        {/* Teams section - now horizontal at top */}
        <div className="rounded-lg border p-4">
          <h2 className="mb-4 text-lg font-semibold">Teams</h2>
          {isLoadingTeams ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
              <p className="mt-4 text-sm text-gray-500">Loading teams...</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-4 xl:grid-cols-5">
              {[...teams]
                .sort(
                  (a, b) =>
                    (a.draftOrder ?? Infinity) - (b.draftOrder ?? Infinity),
                )
                .map((team) => {
                  const remainingBudget =
                    team.totalBudget - (teamBudgets[team.id] ?? 0);
                  const roster = rosters.find((r) => r.teamId === team.id);

                  // Count filled spots by checking each roster position
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
                  const isCurrentNominator =
                    team.draftOrder === currentNominatorDraftOrder;

                  return (
                    <div
                      key={team.id}
                      className={`relative rounded-lg border p-2 transition-all ${
                        isCurrentNominator
                          ? "border-blue-500 bg-blue-50 shadow-md"
                          : ""
                      }`}
                    >
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
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            activeUserIds.has(team.ownerId)
                              ? "bg-green-500"
                              : "bg-gray-300"
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
                            {isCurrentNominator && (
                              <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                Nominating
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
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Draft Room</h1>
            {isConnected && (
              <button
                onClick={leaveDraftRoom}
                className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
              >
                Leave Room
              </button>
            )}
          </div>
          {!isConnected ? (
            <button
              onClick={joinDraftRoom}
              className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
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
            <div className="mb-6 space-y-6 overflow-hidden rounded-xl border-2 border-blue-500 bg-gradient-to-br from-blue-50 via-white to-blue-50 p-8 shadow-2xl transition-all">
              <div className="relative">
                {/* Sparkle effects */}
                <div className="absolute -left-4 -top-4 h-12 w-12 animate-pulse rounded-full bg-blue-200 opacity-50 blur-xl"></div>
                <div className="absolute -bottom-4 -right-4 h-12 w-12 animate-pulse rounded-full bg-blue-200 opacity-50 blur-xl"></div>

                <div className="flex items-center justify-between">
                  <div className="relative">
                    <div className="animate-pulse-slow absolute -inset-1 rounded-lg bg-gradient-to-r from-blue-600 via-sky-400 to-blue-600 opacity-20 blur"></div>
                    <div className="relative">
                      <h2 className="bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 bg-clip-text text-4xl font-bold text-transparent">
                        {selectedPlayer.firstName} {selectedPlayer.lastName}
                      </h2>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-lg font-semibold text-blue-800">
                          {selectedPlayer.position}
                        </span>
                        <span className="text-lg text-blue-600">
                          {selectedPlayer.nflTeamName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {currentBid ? (
                    <div className="relative">
                      <div className="animate-pulse-slow absolute -inset-1 rounded-lg bg-gradient-to-r from-green-600 via-emerald-400 to-green-600 opacity-20 blur"></div>
                      <div className="relative rounded-xl border-2 border-green-500 bg-gradient-to-b from-green-50 to-white p-6 shadow-lg">
                        <div className="text-sm font-medium text-green-800">
                          Current Leader
                        </div>
                        <div className="bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-3xl font-bold text-transparent">
                          ${currentBid.amount}
                        </div>
                        <div className="text-sm font-medium text-green-600">
                          by {currentBid.userName}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setInitialNominationAmount((prev) =>
                                Math.max(1, prev - bidIncrement),
                              )
                            }
                            className="rounded bg-gray-200 px-3 py-1 hover:bg-gray-300"
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
                            className="rounded bg-gray-200 px-3 py-1 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
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

                            // Send to server
                            socket.send(
                              JSON.stringify({
                                type: "new_bid",
                                bid: initialBid,
                              }),
                            );
                          }}
                          className="rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-white shadow-lg transition-all hover:from-green-600 hover:to-green-700 hover:shadow-xl"
                        >
                          Confirm Selection
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPlayer(null);
                            socket.send(
                              JSON.stringify({
                                type: "select_player",
                                player: null,
                              }),
                            );
                          }}
                          className="rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 px-6 py-3 text-white shadow-lg transition-all hover:from-gray-600 hover:to-gray-700 hover:shadow-xl"
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">
                      Bid Amount:
                    </label>
                    <button
                      onClick={() => adjustBidAmount(-bidIncrement)}
                      className="rounded bg-gray-200 px-3 py-1 hover:bg-gray-300"
                    >
                      -
                    </button>
                    <span className="min-w-[3ch] text-center">
                      ${bidAmount}
                    </span>
                    <button
                      onClick={() => adjustBidAmount(bidIncrement)}
                      className="rounded bg-gray-200 px-3 py-1 hover:bg-gray-300"
                    >
                      +
                    </button>
                    <button
                      onClick={handleBidSubmit}
                      disabled={Boolean(
                        !selectedPlayer ||
                          (currentBid && bidAmount <= currentBid.amount) ||
                          isSelling,
                      )}
                      className={`rounded px-4 py-2 text-white ${
                        !selectedPlayer ||
                        (currentBid && bidAmount <= currentBid.amount) ||
                        isSelling
                          ? "cursor-not-allowed bg-gray-400"
                          : "bg-blue-500 hover:bg-blue-600"
                      }`}
                    >
                      {!selectedPlayer
                        ? "Select a Player"
                        : isSelling
                          ? "Bidding Closed"
                          : currentBid && bidAmount <= currentBid.amount
                            ? `Bid must be > $${currentBid.amount}`
                            : "Place Bid"}
                    </button>
                  </div>

                  {currentBid && (
                    <button
                      onClick={() => setShowCountdown(true)}
                      className="rounded bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600"
                      disabled={showCountdown}
                    >
                      Trigger Countdown
                    </button>
                  )}
                </div>
              </div>

              {/* Bid History */}
              <div className="rounded-lg bg-white/50 p-4 backdrop-blur-sm">
                <h3 className="mb-3 text-lg font-semibold text-gray-800">
                  Bid History
                </h3>
                <div className="space-y-2">
                  {bidHistory.map((bid, index) => (
                    <div
                      key={bid.timestamp}
                      className={`rounded-lg border p-3 ${
                        bid.isHighestBid
                          ? "border-green-500 bg-green-50"
                          : "bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{bid.userName}</span>
                        <span className="text-lg font-bold">${bid.amount}</span>
                      </div>
                      <div className="text-sm text-gray-500">
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
              onCancel={handleCountdownCancel}
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
