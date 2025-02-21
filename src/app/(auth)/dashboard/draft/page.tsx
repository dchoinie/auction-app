"use client";

import { usePartySocket } from "partysocket/react";
import { useState } from "react";

interface DraftMessage {
  type: "welcome" | "userJoined";
  message?: string;
  userId?: string;
}

export default function DraftPage() {
  const [messages, setMessages] = useState<DraftMessage[]>([]);

  const socket = usePartySocket({
    host: process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "127.0.0.1:1999",
    room: "draft-room",
    id: "main",
    onMessage(event: MessageEvent) {
      const data = JSON.parse(event.data as string) as DraftMessage;
      setMessages((prev) => [...prev, data]);
    },
    onOpen() {
      console.log("Connected to PartyKit");
    },
    onClose() {
      console.log("Disconnected from PartyKit");
    },
  });

  return (
    <main className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Fantasy Football Draft Room</h1>

      <div className="mb-4 min-h-[200px] rounded border p-4">
        {messages.map((msg, i) => (
          <div key={i} className="mb-2">
            {msg.type === "welcome" && (
              <p className="text-green-600">{msg.message}</p>
            )}
            {msg.type === "userJoined" && (
              <p className="text-blue-600">
                User {msg.userId} joined the draft
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="text-sm text-gray-600">
        {socket.readyState === 1
          ? "✅ Connected to draft room"
          : "⏳ Connecting..."}
      </div>
    </main>
  );
}
