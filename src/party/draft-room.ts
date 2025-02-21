import type * as Party from "partykit/server";

interface DraftMessage {
  type: "welcome" | "userJoined" | "chat";
  message?: string;
  userId?: string;
}

export default class DraftRoom implements Party.Server {
  constructor(readonly party: Party.Party) {}

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Send welcome message as JSON
    const welcomeMessage: DraftMessage = {
      type: "welcome",
      message: "Welcome to the draft room!",
    };
    conn.send(JSON.stringify(welcomeMessage));

    // Broadcast new user joined as JSON
    const joinMessage: DraftMessage = {
      type: "userJoined",
      userId: conn.id,
    };
    this.party.broadcast(JSON.stringify(joinMessage), [conn.id]);
  }

  async onMessage(rawMessage: string, sender: Party.Connection) {
    try {
      // Only handle JSON messages
      if (rawMessage.startsWith("{")) {
        const message = JSON.parse(rawMessage) as DraftMessage;
        this.party.broadcast(JSON.stringify(message));
      }
    } catch (e) {
      // Ignore invalid messages
      console.error("Invalid message format:", e);
    }
  }
}

// PartyKit configuration
export const config = {
  name: "draft-room",
};
