import { db } from "~/server/db";
import { rosters } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// GET /api/teams/[teamId]/roster - fetch roster for a specific team
export async function GET(
  _req: Request,
  { params }: { params: { teamId: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teamId = Number(params.teamId);
    if (isNaN(teamId)) {
      return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
    }

    const roster = await db
      .select()
      .from(rosters)
      .where(eq(rosters.teamId, teamId))
      .limit(1);

    if (!roster[0]) {
      return NextResponse.json(null);
    }

    return NextResponse.json(roster[0]);
  } catch (error) {
    console.error("Error fetching roster:", error);
    return NextResponse.json(
      { error: "Failed to fetch roster" },
      { status: 500 },
    );
  }
}
