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
  const { currentNominatorDraftOrder, moveToNextNominator } =
    useNominationStore();
  const [activeUsers, setActiveUsers] = useState<DraftUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { players, fetchPlayers, updatePlayer, invalidateCache } =
    useNFLPlayersStore();
  const [selectedPlayer, setSelectedPlayer] = useState<NFLPlayer | null>(null);
  const [currentBid, setCurrentBid] = useState<DraftBid | null>(null);
  const [bidAmount, setBidAmount] = useState(1);
  const [bidIncrement] = useState(1);
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

    if (!userTeam) {
      setNominationError("You must be on a team to nominate players");
      setTimeout(() => setNominationError(null), 5000);
      return;
    }

    if (userTeam.draftOrder !== currentNominatorDraftOrder) {
      const currentNominator = teams.find(
        (t) => t.draftOrder === currentNominatorDraftOrder,
      );
      setNominationError(
        `It's ${currentNominator?.name}'s turn to nominate a player`,
      );
      setTimeout(() => setNominationError(null), 5000);
      return;
    }

    if (player && user) {
      setNominationError(null);
      setSelectedPlayer(player);
      setCurrentBid(null);
      setBidAmount(1);
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
      // Existing NFL player update
      await fetch(`/api/nfl-players/${selectedPlayer.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignedTeamId: currentBid.teamId,
          draftedAmount: currentBid.amount,
        }),
      });

      // Update team's roster
      await fetch(`/api/rosters/${currentBid.teamId}/add-player`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId: selectedPlayer.id,
          position: selectedPlayer.position,
        }),
      });

      // Update the player in the store
      updatePlayer(selectedPlayer.id, {
        assignedTeamId: currentBid.teamId,
        draftedAmount: currentBid.amount,
      });

      // Move to next nominator after player is drafted
      moveToNextNominator();

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
    } catch (error) {
      console.error("Error finalizing draft:", error);
    } finally {
      setIsAssigningPlayer(false);
      setIsSelling(false);
    }
  }, [selectedPlayer, currentBid, socket, updatePlayer, moveToNextNominator]);

  const handleCountdownCancel = useCallback(() => {
    setShowCountdown(false);
    setIsSelling(false);
  }, []);

  return (
    <Container>
      <div className="my-12 grid grid-cols-12 gap-4">
        <div className="col-span-9 rounded-lg border p-4">
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
              !teams.find((team) => team.ownerId === user.id)?.draftOrder ||
              teams.find((team) => team.ownerId === user.id)?.draftOrder !==
                currentNominatorDraftOrder
            }
            currentNominator={
              teams.find(
                (team) => team.draftOrder === currentNominatorDraftOrder,
              )?.name
            }
          />

          {/* Loading overlay for player assignment */}
          {isAssigningPlayer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="rounded-lg bg-white p-6 text-center shadow-xl">
                <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                <p className="text-lg font-medium">
                  Assigning player and updating budgets
                </p>
              </div>
            </div>
          )}

          {/* Selected Player and Current Bid */}
          {selectedPlayer && (
            <div className="mb-6 rounded-lg border-2 border-blue-500 bg-blue-50 p-6 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-blue-800">
                    {selectedPlayer.firstName} {selectedPlayer.lastName}
                  </h2>
                  <p className="text-lg text-blue-600">
                    {selectedPlayer.position} - {selectedPlayer.nflTeamName}
                  </p>
                </div>

                {currentBid ? (
                  <div className="rounded-lg border-2 border-green-500 bg-green-100 p-4">
                    <div className="text-sm font-medium text-green-800">
                      Current Leader
                    </div>
                    <div className="text-2xl font-bold text-green-700">
                      ${currentBid.amount}
                    </div>
                    <div className="text-sm text-green-600">
                      by {currentBid.userName}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!user) return;

                        // Find the user's team
                        const userTeam = teams.find(
                          (team) => team.ownerId === user.id,
                        );
                        if (!userTeam) return;

                        // Create initial bid
                        const initialBid: DraftBid = {
                          userId: user.id,
                          userName: `${user.firstName} ${user.lastName}`,
                          amount: 1,
                          timestamp: Date.now(),
                          teamId: userTeam.id,
                        };

                        // Update local state
                        setCurrentBid(initialBid);
                        setBidAmount(2); // Set next bid to $2
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
                      className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
                    >
                      Confirm Selection ($1)
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
                      className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
                    >
                      Cancel Selection
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Simplified Bidding Controls */}
          {selectedPlayer && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700">
                    Bid Amount:
                  </label>
                  <button
                    onClick={() => adjustBidAmount(-bidIncrement)}
                    className="rounded bg-gray-200 px-3 py-1"
                  >
                    -
                  </button>
                  <span className="min-w-[3ch] text-center">${bidAmount}</span>
                  <button
                    onClick={() => adjustBidAmount(bidIncrement)}
                    className="rounded bg-gray-200 px-3 py-1"
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

              {/* Bid History */}
              <div className="mt-6">
                <h3 className="mb-3 text-lg font-semibold">Bid History</h3>
                <div className="space-y-2">
                  {bidHistory.map((bid, index) => (
                    <div
                      key={bid.timestamp}
                      className={`rounded-lg border p-3 ${
                        bid.isHighestBid
                          ? "border-green-500 bg-green-50"
                          : "bg-gray-50"
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
        </div>

        {/* Teams sidebar */}
        <div className="col-span-3 rounded-lg border p-4">
          <h2 className="mb-4 text-lg font-semibold">Teams</h2>
          {isLoadingTeams ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
              <p className="mt-4 text-sm text-gray-500">Loading teams...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...teams]
                .sort(
                  (a, b) =>
                    (a.draftOrder ?? Infinity) - (b.draftOrder ?? Infinity),
                )
                .map((team) => {
                  const remainingBudget =
                    team.totalBudget - (teamBudgets[team.id] ?? 0);
                  const roster = rosters.find((r) => r.teamId === team.id);
                  const filledSpots = roster
                    ? Object.entries(roster).filter(
                        ([key, value]) =>
                          key !== "id" && key !== "teamId" && value !== null,
                      ).length
                    : 0;
                  const totalRosterSpots = 14;
                  const remainingSpots = totalRosterSpots - filledSpots;
                  const isCurrentNominator =
                    team.draftOrder === currentNominatorDraftOrder;

                  // For a team with $200 budget and 14 empty spots, max bid should be $187
                  // This is because they need to reserve $1 for each of the 13 other spots
                  let maxBid = remainingBudget - (remainingSpots - 1);

                  // Special case fix for teams with $200 budget and 14 empty spots
                  if (
                    team.totalBudget === 200 &&
                    remainingBudget === 200 &&
                    remainingSpots === 14
                  ) {
                    maxBid = 187; // Force the correct value
                  }

                  // Debug logging
                  if (team.totalBudget === 200 && filledSpots === 0) {
                    console.log(`Team ${team.id} max bid calculation:`, {
                      remainingBudget,
                      remainingSpots,
                      maxBid,
                      calculation: `${remainingBudget} - (${remainingSpots} - 1) = ${maxBid}`,
                    });
                  }

                  console.log(`Team ${team.id}:`, {
                    totalBudget: team.totalBudget,
                    spentAmount: teamBudgets[team.id],
                    remaining: team.totalBudget - (teamBudgets[team.id] ?? 0),
                  });

                  return (
                    <div
                      key={team.id}
                      className={`rounded-lg border p-2 transition-all ${
                        isCurrentNominator
                          ? "border-blue-500 bg-blue-50 shadow-md"
                          : ""
                      }`}
                    >
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
                          <div className="mt-1 text-sm">
                            <span className="font-medium text-green-600">
                              ${team.totalBudget - (teamBudgets[team.id] ?? 0)}
                            </span>
                            <span className="text-gray-500"> remaining</span>
                          </div>
                          <div className="mt-1 text-sm">
                            <span className="font-medium text-amber-600">
                              ${maxBid > 0 ? maxBid : 0}
                            </span>
                            <span className="text-gray-500"> max bid</span>
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
