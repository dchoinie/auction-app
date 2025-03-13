import { db } from "~/server/db";
import { nflPlayers } from "~/server/db/schema";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

interface SleeperPlayer {
  player_id: string;
  first_name: string;
  last_name: string;
  position: string;
  team: string;
  active: boolean;
  depth_chart_order: number | null;
  search_rank: number | null;
}

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch players from Sleeper API
    const response = await fetch("https://api.sleeper.app/v1/players/nfl", {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Sleeper API error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      return NextResponse.json(
        {
          error: `Sleeper API error: ${response.status} ${response.statusText}`,
        },
        { status: response.status },
      );
    }

    const sleeperPlayers = (await response.json()) as Record<
      string,
      SleeperPlayer
    >;
    console.log(
      `Fetched ${Object.keys(sleeperPlayers).length} players from Sleeper API`,
    );

    // Filter and transform players
    const filteredPlayers = Object.values(sleeperPlayers)
      .filter(
        (player) =>
          player.active &&
          ["QB", "RB", "WR", "TE"].includes(player.position) &&
          // Only include players with depth chart order <= 3 (must have a value)
          player.depth_chart_order !== null &&
          player.depth_chart_order <= 3 &&
          // Only include players with search rank < 500 (must have a value)
          player.search_rank !== null &&
          player.search_rank < 500,
      )
      .map((player) => ({
        firstName: player.first_name,
        lastName: player.last_name,
        position: player.position as "QB" | "RB" | "WR" | "TE",
        nflTeamName: player.team,
        search_rank: player.search_rank, // Keep search_rank for sorting
      }))
      .sort((a, b) => (a.search_rank ?? 0) - (b.search_rank ?? 0)) // Sort by search_rank
      .map(({ search_rank, ...player }) => player); // Remove search_rank before DB insert

    console.log(
      `Filtered and sorted ${filteredPlayers.length} active players by search rank`,
    );

    try {
      // Clear existing players
      await db.delete(nflPlayers).where(sql`1=1`);
      console.log("Cleared existing players from database");

      // Insert new players
      const insertedPlayers = await db
        .insert(nflPlayers)
        .values(filteredPlayers)
        .returning();

      console.log(`Successfully inserted ${insertedPlayers.length} players`);

      return NextResponse.json({
        message: `Successfully synced ${insertedPlayers.length} players`,
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        {
          error: `Database error: ${dbError instanceof Error ? dbError.message : "Unknown error"}`,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      {
        error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    );
  }
}
