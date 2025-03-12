import type { Party, Connection, Request } from "partykit/server";

interface DraftUser {
  id: string;
  name: string;
  isActive: boolean;
  joinedAt: number;
  connectionId?: string;
  lastHeartbeat: number;
}

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

interface DraftState {
  selectedPlayer: NFLPlayer | null;
  currentBid: DraftBid | null;
}

interface DraftMessage {
  type:
    | "join"
    | "leave"
    | "select_player"
    | "new_bid"
    | "user_joined"
    | "user_left"
    | "heartbeat";
  user?: DraftUser;
  userId?: string;
  player?: NFLPlayer;
  bid?: DraftBid;
}

export default class DraftRoom {
  static async onBeforeConnect(_req: Request) {
    // We can add auth validation later if needed
    return { success: true };
  }

  connections = new Set<Connection>();
  activeUsers = new Map<string, DraftUser>();
  heartbeatIntervals = new Map<string, NodeJS.Timeout>();
  currentState: DraftState = {
    selectedPlayer: null,
    currentBid: null,
  };

  constructor(readonly party: Party) {
    console.log("Draft room created:", party.id);
  }

  private startHeartbeat(userId: string, conn: Connection) {
    // Clear any existing heartbeat
    this.clearHeartbeat(userId);

    // Send initial heartbeat
    conn.send(JSON.stringify({ type: "heartbeat" }));

    // Set up interval to send heartbeat every 30 seconds
    const interval = setInterval(() => {
      if (this.connections.has(conn)) {
        conn.send(JSON.stringify({ type: "heartbeat" }));
      } else {
        this.clearHeartbeat(userId);
      }
    }, 30000);

    this.heartbeatIntervals.set(userId, interval);
  }

  private clearHeartbeat(userId: string) {
    const interval = this.heartbeatIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(userId);
    }
  }

  async onStart() {
    // Initialize room state when server starts
    console.log("Room started, broadcasting initial state");
    this.broadcastUsers();
  }

  async onConnect(conn: Connection) {
    this.connections.add(conn);
    console.log("New connection:", conn.id);

    // Send welcome message
    conn.send(
      JSON.stringify({
        type: "welcome",
        message: "Connected to draft room",
      }),
    );

    // Send initial state
    conn.send(
      JSON.stringify({
        type: "init_state",
        state: {
          selectedPlayer: this.currentState.selectedPlayer,
          currentBid: this.currentState.currentBid,
        },
      }),
    );
  }

  async onMessage(message: string | ArrayBuffer, sender: Connection) {
    try {
      const messageText =
        message instanceof ArrayBuffer
          ? new TextDecoder().decode(message)
          : message;

      const data = JSON.parse(messageText) as DraftMessage;
      console.log("Server received message:", data.type, data);

      switch (data.type) {
        case "join":
          if (data.user) {
            console.log("User joining:", data.user);
            // Store connection ID with user data
            const userWithConnection = {
              ...data.user,
              connectionId: sender.id,
              lastHeartbeat: Date.now(),
            };
            this.activeUsers.set(data.user.id, userWithConnection);
            this.startHeartbeat(data.user.id, sender);

            // Broadcast to all users that someone joined, including sender
            this.party.broadcast(
              JSON.stringify({
                type: "user_joined",
                user: userWithConnection,
              }),
            );
          }
          break;

        case "leave":
          if (data.userId) {
            console.log("User leaving:", data.userId);
            this.activeUsers.delete(data.userId);

            // Broadcast to all that user left
            this.party.broadcast(
              JSON.stringify({
                type: "user_left",
                userId: data.userId,
              }),
            );
          }
          break;

        case "new_bid":
          if (data.bid) {
            console.log("Processing bid:", data.bid);
            // Validate bid
            if (this.isValidBid(data.bid)) {
              this.currentState.currentBid = data.bid;
              // Broadcast to ALL connections including sender
              this.party.broadcast(
                JSON.stringify({
                  type: "new_bid",
                  bid: data.bid,
                  player: this.currentState.selectedPlayer,
                }),
              );
            } else {
              console.log("Invalid bid:", data.bid);
              // Optionally notify sender of invalid bid
              sender.send(
                JSON.stringify({
                  type: "bid_error",
                  message: "Invalid bid amount",
                }),
              );
            }
          }
          break;

        case "select_player":
          if (data.player) {
            this.currentState.selectedPlayer = data.player;
            this.currentState.currentBid = null;
            this.party.broadcast(
              JSON.stringify({
                type: "select_player",
                player: data.player,
              }),
            );
          }
          break;

        case "heartbeat":
          if (data.userId) {
            const user = this.activeUsers.get(data.userId);
            if (user) {
              user.lastHeartbeat = Date.now();
              this.activeUsers.set(data.userId, user);
            }
          }
          break;
      }
    } catch (error) {
      console.error("Error in onMessage:", error, "Raw message:", message);
    }
  }

  private isValidBid(bid: DraftBid): boolean {
    if (!this.currentState.selectedPlayer) return false;
    if (this.currentState.currentBid) {
      return bid.amount > this.currentState.currentBid.amount;
    }
    return bid.amount >= 1; // Minimum bid
  }

  private broadcastState() {
    if (this.currentState.selectedPlayer) {
      this.party.broadcast(
        JSON.stringify({
          type: "select_player",
          player: this.currentState.selectedPlayer,
          bid: this.currentState.currentBid,
        }),
      );
    }
  }

  private broadcastUsers() {
    const users = Array.from(this.activeUsers.values());
    console.log("Broadcasting users:", users);

    // Send to all connections
    this.party.broadcast(
      JSON.stringify({
        type: "users",
        users: users,
      }),
    );
  }

  async onClose(conn: Connection) {
    this.connections.delete(conn);
    console.log("Connection closed:", conn.id);

    // Find and remove the user associated with this connection
    for (const [userId, user] of this.activeUsers.entries()) {
      if (user.connectionId === conn.id) {
        this.activeUsers.delete(userId);
        this.clearHeartbeat(userId);

        // Broadcast to all that user left
        this.party.broadcast(
          JSON.stringify({
            type: "user_left",
            userId: userId,
          }),
        );
        break;
      }
    }
  }
}

// PartyKit configuration
export const config = {
  name: "draft-room",
};
