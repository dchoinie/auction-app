import { db } from "~/server/db";
import { nflPlayers } from "~/server/db/schema";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const players = await db
      .select()
      .from(nflPlayers)
      .orderBy(nflPlayers.lastName, nflPlayers.firstName);

    return NextResponse.json(players);
  } catch (error) {
    console.error("Error fetching NFL players:", error);
    return NextResponse.json(
      { error: "Failed to fetch NFL players" },
      { status: 500 },
    );
  }
}
