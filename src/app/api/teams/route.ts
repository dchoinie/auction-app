import { db } from "~/server/db";
import { teams } from "~/server/db/schema";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// GET /api/teams - fetch all teams
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allTeams = await db.select().from(teams);
    return NextResponse.json(allTeams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 },
    );
  }
}

interface CreateTeamRequest {
  name?: string; // Optional since we might use Clerk name
  ownerName: string;
}

// POST /api/teams - create a new team
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as CreateTeamRequest;
    const { name: teamName, ownerName } = body;

    // If no name provided, check if owner name exists
    if (!teamName && !ownerName) {
      return NextResponse.json(
        { error: "Team name is required when owner name is not provided" },
        { status: 400 },
      );
    }

    const finalTeamName = teamName ?? `${ownerName}'s Team`;

    const newTeam = await db
      .insert(teams)
      .values({
        name: finalTeamName,
        ownerName,
        ownerId: userId,
      })
      .returning();

    return NextResponse.json(newTeam[0]);
  } catch (error) {
    console.error("Error creating team:", error);
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 },
    );
  }
}

// ... rest of file
