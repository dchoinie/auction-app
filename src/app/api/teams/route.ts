import { db } from "~/server/db";
import { teams, rosters } from "~/server/db/schema";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export interface TeamResponse {
  id: number;
  name: string;
  ownerName: string;
  ownerId: string;
  draftOrder: number | null;
  totalBudget: number;
}

// GET /api/teams - fetch all teams
export async function GET() {
  try {
    const allTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        ownerName: teams.ownerName,
        ownerId: teams.ownerId,
        draftOrder: teams.draftOrder,
        totalBudget: teams.totalBudget,
        createdAt: teams.createdAt,
      })
      .from(teams);

    return NextResponse.json(allTeams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
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

    // Create empty roster for the team
    await db.insert(rosters).values({
      teamId: newTeam[0].id,
      players: [], // Initialize with empty array
    });

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
