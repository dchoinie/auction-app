import { db } from "~/server/db";
import { rosters } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET /api/teams/[teamId]/roster - fetch roster for a specific team
export async function GET(
  _req: Request,
  { params }: { params: { teamId: number } },
) {
  try {
    const teamId = params.teamId;
    const roster = await db.query.rosters.findFirst({
      where: eq(rosters.teamId, teamId),
    });

    if (!roster) {
      return NextResponse.json(null);
    }

    return NextResponse.json(roster);
  } catch (error) {
    console.error("Error fetching roster:", error);
    return NextResponse.json(
      { error: "Failed to fetch roster" },
      { status: 500 },
    );
  }
}
