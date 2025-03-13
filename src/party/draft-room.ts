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
  currentRound: number;
  currentNominatorDraftOrder: number;
}

interface DraftMessage {
  type:
    | "join"
    | "leave"
    | "select_player"
    | "new_bid"
    | "user_joined"
    | "user_left"
    | "heartbeat"
    | "update_nomination";
  user?: DraftUser;
  userId?: string;
  player?: NFLPlayer;
  bid?: DraftBid;
  state?: DraftState;
}

export default class DraftRoom {
  static async onBeforeConnect(_req: Request) {
    // We can add auth validation later if needed
    return { success: true };
  }

  connections = new Set<Connection>();
  activeUsers = new Map<string, DraftUser>();
  currentState: DraftState = {
    selectedPlayer: null,
    currentBid: null,
    currentRound: 1,
    currentNominatorDraftOrder: 1,
  };

  constructor(readonly party: Party) {
    console.log("Draft room created:", party.id);
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
        state: this.currentState,
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
            };
            this.activeUsers.set(data.user.id, userWithConnection);

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
            // Update state with the received values
            if (data.state) {
              this.currentState.currentRound = data.state.currentRound;
              this.currentState.currentNominatorDraftOrder =
                data.state.currentNominatorDraftOrder;
            }
            // Broadcast to ALL connections including sender
            this.party.broadcast(
              JSON.stringify({
                type: "select_player",
                player: data.player,
                state: this.currentState,
              }),
            );
          } else {
            // Handle clearing the selected player
            this.currentState.selectedPlayer = null;
            this.currentState.currentBid = null;
            // Broadcast to ALL connections including sender
            this.party.broadcast(
              JSON.stringify({
                type: "select_player",
                player: null,
                state: this.currentState,
              }),
            );
          }
          break;

        case "update_nomination":
          if (data.state) {
            this.currentState.currentRound = data.state.currentRound;
            this.currentState.currentNominatorDraftOrder =
              data.state.currentNominatorDraftOrder;
            this.party.broadcast(
              JSON.stringify({
                type: "update_nomination",
                state: this.currentState,
              }),
            );
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
          state: this.currentState,
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
