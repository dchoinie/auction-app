import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { sql } from "drizzle-orm";

export async function POST() {
  try {
    // Reset all NFL players' draft-related fields
    await db.execute(sql`
      UPDATE "auction-app_nfl_player" 
      SET 
        assigned_team_id = NULL,
        drafted_amount = NULL,
        is_keeper = FALSE
    `);

    return NextResponse.json({ message: "NFL players reset successfully" });
  } catch (error) {
    console.error("Error resetting NFL players:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
