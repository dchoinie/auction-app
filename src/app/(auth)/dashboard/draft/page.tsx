"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Container from "~/components/Container";
import { usePartySocket } from "partysocket/react";
import { useNFLPlayersStore } from "~/store/nfl-players";
import NFLPlayerSelect from "./components/NFLPlayerSelect";
import Countdown from "./components/Countdown";

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
}

interface Team {
  id: number;
  name: string;
  ownerName: string;
  ownerId: string;
  draftOrder: number | null;
}

export default function DraftRoomPage() {
  const router = useRouter();
  const { user } = useUser();
  const [activeUsers, setActiveUsers] = useState<DraftUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { players: nflPlayers, fetchPlayers } = useNFLPlayersStore();
  const [selectedPlayer, setSelectedPlayer] = useState<NFLPlayer | null>(null);
  const [currentBid, setCurrentBid] = useState<DraftBid | null>(null);
  const [bidAmount, setBidAmount] = useState(1);
  const [bidIncrement] = useState(1);
  const [bidHistory, setBidHistory] = useState<BidHistoryItem[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeUserIds, setActiveUserIds] = useState<Set<string>>(new Set());
  const [showCountdown, setShowCountdown] = useState(false);

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
        console.log("Received message:", data);

        switch (data.type) {
          case "init_state":
            if (data.state?.currentBid) {
              console.log("Received initial state:", data.state);
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
              console.log("Received new bid:", data.bid);
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

  // Fetch NFL Players
  useEffect(() => {
    void fetchPlayers();
  }, [fetchPlayers]);

  // Fetch teams on mount
  useEffect(() => {
    const fetchTeams = async () => {
      const res = await fetch("/api/teams");
      const data = (await res.json()) as TeamResponse[];
      setTeams(
        data.map((team) => ({
          id: team.id,
          name: team.name,
          ownerName: team.ownerName,
          ownerId: team.ownerId,
          draftOrder: team.draftOrder,
        })),
      );
    };
    void fetchTeams();
  }, []);

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
    const player = nflPlayers.find((p) => p.id === playerId);
    if (player && user) {
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

    // Cancel any active countdown
    setShowCountdown(false);

    const newBid: DraftBid = {
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      amount: bidAmount,
      timestamp: Date.now(),
    };

    console.log("Sending bid:", newBid);

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

  const handleNewBid = () => {
    setShowCountdown(false);
  };

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

          {/* Replace the old dropdown with the new component */}
          <NFLPlayerSelect
            selectedPlayerId={selectedPlayer?.id}
            onPlayerSelect={handlePlayerSelect}
          />

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
                        // Create initial bid
                        const initialBid: DraftBid = {
                          userId: user.id,
                          userName: `${user.firstName} ${user.lastName}`,
                          amount: 1,
                          timestamp: Date.now(),
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
                    className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                  >
                    Place Bid
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
              onComplete={() => {
                setShowCountdown(false);
                // Handle auction completion here
                console.log("Auction complete!");
              }}
              onCancel={() => setShowCountdown(false)}
            />
          )}
        </div>

        {/* Teams sidebar */}
        <div className="col-span-3 rounded-lg border p-4">
          <h2 className="mb-4 text-lg font-semibold">Teams</h2>
          <div className="space-y-2">
            {[...teams]
              .sort(
                (a, b) =>
                  (a.draftOrder ?? Infinity) - (b.draftOrder ?? Infinity),
              )
              .map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between rounded-lg border p-2"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        activeUserIds.has(team.ownerId)
                          ? "bg-green-500"
                          : "bg-gray-300"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        {team.draftOrder && (
                          <span className="text-sm font-semibold text-blue-600">
                            #{team.draftOrder}
                          </span>
                        )}
                        <span className="font-medium">{team.name}</span>
                      </div>
                      <p className="text-xs text-gray-600">{team.ownerName}</p>
                    </div>
                  </div>
                  {team.ownerId === user?.id && (
                    <span className="text-xs text-gray-500">(You)</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </Container>
  );
}
