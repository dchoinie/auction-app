"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Container from "~/components/Container";
import { usePartySocket } from "partysocket/react";

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

export default function DraftRoomPage() {
  const router = useRouter();
  const { user } = useUser();
  const [activeUsers, setActiveUsers] = useState<DraftUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [nflPlayers, setNflPlayers] = useState<NFLPlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<NFLPlayer | null>(null);
  const [currentBid, setCurrentBid] = useState<DraftBid | null>(null);
  const [bidAmount, setBidAmount] = useState(1);
  const [bidIncrement] = useState(1);
  const [bidHistory, setBidHistory] = useState<BidHistoryItem[]>([]);

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
              setBidAmount(data.state.currentBid.amount + 1);
              // Sort users by join time
              const sortedUsers = [...data.state.users].sort(
                (a, b) => a.joinedAt - b.joinedAt,
              );
              setActiveUsers(sortedUsers);
              setBidHistory((prev) =>
                [
                  { ...data.state.currentBid, isHighestBid: true },
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
              setBidHistory((prev) =>
                [
                  { ...data.bid, isHighestBid: true },
                  ...prev.map((bid) => ({ ...bid, isHighestBid: false })),
                ].slice(0, 10),
              );
            }
            break;
          case "user_joined":
            if (data.user && data.user.id !== user?.id) {
              setActiveUsers((prev) => [...prev, data.user!]);
            }
            break;
          case "user_left":
            if (data.userId) {
              setActiveUsers((prev) =>
                prev.filter((u) => u.id !== data.userId),
              );
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
    const fetchPlayers = async () => {
      const res = await fetch("/api/nfl-players");
      const data = (await res.json()) as NFLPlayer[];
      setNflPlayers(data);
    };
    void fetchPlayers();
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
    if (player) {
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

          {/* Player Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700">
              Select Player
            </label>
            <select
              className="mt-1 block w-full rounded-md border p-2"
              onChange={(e) => handlePlayerSelect(Number(e.target.value))}
              value={selectedPlayer?.id ?? ""}
            >
              <option value="">Select a player</option>
              {nflPlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.firstName} {player.lastName} - {player.position} -{" "}
                  {player.nflTeamName}
                </option>
              ))}
            </select>
          </div>

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

                {currentBid && (
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
                )}
              </div>
            </div>
          )}

          {/* Simplified Bidding Controls */}
          {selectedPlayer && (
            <div className="space-y-4">
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
                  className={`rounded px-4 py-2 text-white ${
                    !selectedPlayer ||
                    (currentBid && bidAmount <= currentBid.amount)
                      ? "cursor-not-allowed bg-gray-400"
                      : "bg-blue-500 hover:bg-blue-600"
                  }`}
                  disabled={
                    !selectedPlayer ||
                    (currentBid && bidAmount <= currentBid.amount)
                  }
                >
                  {!selectedPlayer
                    ? "Select a Player"
                    : currentBid && bidAmount <= currentBid.amount
                      ? `Bid must be > $${currentBid.amount}`
                      : "Place Bid"}
                </button>
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
        </div>

        {/* Active users sidebar */}
        <div className="col-span-3 rounded-lg border p-4">
          <h2 className="mb-4 text-lg font-semibold">Active Users</h2>
          <div className="space-y-2">
            {activeUsers.map((draftUser) => (
              <div
                key={draftUser.id}
                className="flex items-center justify-between rounded-lg border p-2"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      draftUser.isActive ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <span className="font-medium">{draftUser.name}</span>
                </div>
                {draftUser.id === user?.id && (
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
