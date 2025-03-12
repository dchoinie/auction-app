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
      return NextResponse.json(
        { error: "Authentication required to create a team" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as CreateTeamRequest;
    console.log("Request body:", body); // Log the request body
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

    console.log("Created team:", newTeam[0]); // Log the created team

    // Create empty roster for the team
    await db.insert(rosters).values({
      teamId: newTeam[0]!.id,
      QB: null,
      RB1: null,
      RB2: null,
      WR1: null,
      WR2: null,
      TE: null,
      Flex1: null,
      Flex2: null,
      Bench1: null,
      Bench2: null,
      Bench3: null,
      Bench4: null,
      Bench5: null,
      Bench6: null,
    });

    return NextResponse.json(newTeam[0]);
  } catch (error) {
    console.error("Error creating team:", error);
    // Return more detailed error information
    return NextResponse.json(
      {
        error: "Failed to create team",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// ... rest of file
