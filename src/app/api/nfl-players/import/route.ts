/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { db } from "~/server/db";
import { nflPlayers } from "~/server/db/schema";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const players = data.players as {
      firstName: string;
      lastName: string;
      position: "QB" | "RB" | "WR" | "TE";
      nflTeamName: string;
    }[];

    const insertedPlayers = await db
      .insert(nflPlayers)
      .values(players)
      .returning();

    return NextResponse.json({
      message: `Successfully imported ${insertedPlayers.length} players`,
    });
  } catch (error) {
    console.error("Error importing players:", error);
    return NextResponse.json(
      { error: "Failed to import players" },
      { status: 500 },
    );
  }
}
