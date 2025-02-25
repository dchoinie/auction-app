/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
"use client";

import { useState } from "react";
import Papa from "papaparse";
import { positionEnum } from "~/server/db/schema";

export interface NFLPlayer {
  firstName: string;
  lastName: string;
  position: string;
  nflTeamName: string;
}

// Add type for valid positions
type ValidPosition = (typeof positionEnum.enumValues)[number];

// Add position validation
const isValidPosition = (position: string): position is ValidPosition => {
  return positionEnum.enumValues.includes(position as ValidPosition);
};

export default function PlayerImport() {
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage("");

    try {
      const results = await new Promise<Papa.ParseResult<unknown>>(
        (resolve, reject) => {
          Papa.parse(file, {
            header: true,
            complete: resolve,
            error: reject,
            transform: (value) => value.trim(),
          });
        },
      );

      console.log("Parsed CSV data:", results.data);

      const players = results.data.map((row: unknown) => {
        const nflPlayer = row as NFLPlayer;
        if (
          !nflPlayer.firstName ||
          !nflPlayer.lastName ||
          !nflPlayer.position ||
          !nflPlayer.nflTeamName
        ) {
          throw new Error("Missing required fields in CSV");
        }

        if (!isValidPosition(nflPlayer.position)) {
          throw new Error(
            `Invalid position: ${nflPlayer.position}. Must be one of: ${positionEnum.enumValues.join(
              ", ",
            )}`,
          );
        }

        return {
          firstName: nflPlayer.firstName,
          lastName: nflPlayer.lastName,
          position: nflPlayer.position,
          nflTeamName: nflPlayer.nflTeamName,
        };
      });

      console.log("Transformed players:", players);

      const res = await fetch("/api/nfl-players/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to import players");
      }

      const data = await res.json();
      setMessage(data.message || data.error);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error importing players";
      setMessage(errorMessage);
      console.error("Import error:", error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="rounded-lg border p-4">
      <h2 className="mb-4 text-lg font-semibold">Import NFL Players</h2>
      <div className="space-y-4">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={importing}
          className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
        />
        {importing && <p>Importing...</p>}
        {message && <p>{message}</p>}
      </div>
    </div>
  );
}
