import { db } from "~/server/db";
import { teams, rosters } from "~/server/db/schema";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// GET /api/teams - fetch all teams
export async function GET() {
  try {
    const allTeams = await db.select().from(teams);
    console.log(allTeams);
    return NextResponse.json(allTeams);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 },
    );
  }
}

// POST /api/teams - create a new team
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    const { name } = (await req.json()) as { name: string };
    const ownerName = `${user.firstName} ${user.lastName}`.trim();

    const result = await db.transaction(async (tx) => {
      // Create team and ensure we get a result
      const teamResult = await tx
        .insert(teams)
        .values({
          name,
          ownerId: userId,
          ownerName,
        })
        .returning();

      if (!teamResult[0]) {
        throw new Error("Failed to create team - no team returned");
      }

      const team = teamResult[0];

      // Now we know team.id exists
      const rosterResult = await tx
        .insert(rosters)
        .values({
          teamId: team.id,
        })
        .returning();

      if (!rosterResult[0]) {
        throw new Error("Failed to create roster - no roster returned");
      }

      return { team, roster: rosterResult[0] };
    });

    return new NextResponse(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Create team error:", error);
    return new NextResponse(
      JSON.stringify({
        error: "Failed to create team",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}
