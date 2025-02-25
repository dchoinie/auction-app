import { db } from "~/server/db";
import { nflPlayers, rosters } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

interface Roster {
  id: number;
  teamId: number;
  qb: number | null;
  rb1: number | null;
  rb2: number | null;
  wr1: number | null;
  wr2: number | null;
  te: number | null;
  flex1: number | null;
  flex2: number | null;
  bench1: number | null;
  bench2: number | null;
  bench3: number | null;
  bench4: number | null;
  bench5: number | null;
  bench6: number | null;
  updatedAt: Date;
  createdAt: Date;
}

type RosterPosition =
  | "qb"
  | "rb1"
  | "rb2"
  | "wr1"
  | "wr2"
  | "te"
  | "flex1"
  | "flex2"
  | "bench1"
  | "bench2"
  | "bench3"
  | "bench4"
  | "bench5"
  | "bench6";

interface UpdatePlayerRequest {
  assignedTeamId: number;
  draftedAmount: number;
}

async function findAvailableRosterSpot(
  roster: Roster,
  position: string,
): Promise<RosterPosition | null> {
  const benchSpots: RosterPosition[] = [
    "bench1",
    "bench2",
    "bench3",
    "bench4",
    "bench5",
    "bench6",
  ];

  switch (position) {
    case "QB":
      return !roster.qb ? "qb" : null;

    case "RB":
      if (!roster.rb1) return "rb1";
      if (!roster.rb2) return "rb2";
      if (!roster.flex1) return "flex1";
      if (!roster.flex2) return "flex2";
      return benchSpots.find((spot) => !roster[spot]) || null;

    case "WR":
      if (!roster.wr1) return "wr1";
      if (!roster.wr2) return "wr2";
      if (!roster.flex1) return "flex1";
      if (!roster.flex2) return "flex2";
      return benchSpots.find((spot) => !roster[spot]) || null;

    case "TE":
      if (!roster.te) return "te";
      if (!roster.flex1) return "flex1";
      if (!roster.flex2) return "flex2";
      return benchSpots.find((spot) => !roster[spot]) || null;

    default:
      return benchSpots.find((spot) => !roster[spot]) || null;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { assignedTeamId, draftedAmount } =
      (await request.json()) as UpdatePlayerRequest;
    const playerId = parseInt(params.id);

    // First update the NFL player
    const [updatedPlayer] = await db
      .update(nflPlayers)
      .set({
        assignedTeamId,
        draftedAmount,
        updatedAt: new Date(),
      })
      .where(eq(nflPlayers.id, playerId))
      .returning();

    // Get the team's roster
    const [roster] = await db
      .select()
      .from(rosters)
      .where(eq(rosters.teamId, assignedTeamId));

    if (!roster) {
      throw new Error("Roster not found");
    }

    // Find the first available spot based on position
    const availableSpot = await findAvailableRosterSpot(
      roster,
      updatedPlayer.position,
    );

    if (!availableSpot) {
      throw new Error("No available roster spots");
    }

    // Update the roster with the player in the available spot
    await db
      .update(rosters)
      .set({
        [availableSpot]: playerId,
        updatedAt: new Date(),
      })
      .where(eq(rosters.teamId, assignedTeamId));

    return NextResponse.json(updatedPlayer);
  } catch (error) {
    console.error("Error updating player:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
