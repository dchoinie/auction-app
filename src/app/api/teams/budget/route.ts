import { db } from "~/server/db";
import { nflPlayers } from "~/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const budgets = await db
      .select({
        teamId: nflPlayers.assignedTeamId,
        spentAmount: sql<number>`
          COALESCE(
            SUM(
              CASE 
                WHEN ${nflPlayers.isKeeper} = true THEN ${nflPlayers.draftedAmount}
                ELSE ${nflPlayers.draftedAmount}
              END
            ), 
            0
          )::integer
        `,
      })
      .from(nflPlayers)
      .where(sql`${nflPlayers.assignedTeamId} IS NOT NULL`)
      .groupBy(nflPlayers.assignedTeamId);

    console.log("Budget response:", budgets);
    return NextResponse.json(budgets);
  } catch (error) {
    console.error("Error fetching team budgets:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
