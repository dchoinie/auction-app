import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { sql } from "drizzle-orm";

export async function POST() {
  try {
    // Reset all teams' budgets back to default (200)
    await db.execute(sql`
      UPDATE "auction-app_team" 
      SET total_budget = 200
    `);

    return NextResponse.json({ message: "Team budgets reset successfully" });
  } catch (error) {
    console.error("Error resetting team budgets:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
