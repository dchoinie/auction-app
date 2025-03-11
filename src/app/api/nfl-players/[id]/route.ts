import { db } from "~/server/db";
import { nflPlayers, rosters } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

interface Roster {
  id: number;
  teamId: number;
  QB: number | null;
  RB1: number | null;
  RB2: number | null;
  WR1: number | null;
  WR2: number | null;
  TE: number | null;
  Flex1: number | null;
  Flex2: number | null;
  Bench1: number | null;
  Bench2: number | null;
  Bench3: number | null;
  Bench4: number | null;
  Bench5: number | null;
  Bench6: number | null;
  updatedAt: Date | null;
  createdAt: Date;
}

type RosterPosition =
  | "QB"
  | "RB1"
  | "RB2"
  | "WR1"
  | "WR2"
  | "TE"
  | "Flex1"
  | "Flex2"
  | "Bench1"
  | "Bench2"
  | "Bench3"
  | "Bench4"
  | "Bench5"
  | "Bench6";

interface UpdatePlayerRequest {
  assignedTeamId: number;
  draftedAmount: number;
  isKeeper: boolean;
}

async function findAvailableRosterSpot(
  roster: Roster,
  position: string,
): Promise<RosterPosition | null> {
  const benchSpots: RosterPosition[] = [
    "Bench1",
    "Bench2",
    "Bench3",
    "Bench4",
    "Bench5",
    "Bench6",
  ];

  switch (position) {
    case "QB":
      return !roster.QB ? "QB" : null;

    case "RB":
      if (!roster.RB1) return "RB1";
      if (!roster.RB2) return "RB2";
      if (!roster.Flex1) return "Flex1";
      if (!roster.Flex2) return "Flex2";
      return benchSpots.find((spot) => !roster[spot]) ?? null;

    case "WR":
      if (!roster.WR1) return "WR1";
      if (!roster.WR2) return "WR2";
      if (!roster.Flex1) return "Flex1";
      if (!roster.Flex2) return "Flex2";
      return benchSpots.find((spot) => !roster[spot]) ?? null;

    case "TE":
      if (!roster.TE) return "TE";
      if (!roster.Flex1) return "Flex1";
      if (!roster.Flex2) return "Flex2";
      return benchSpots.find((spot) => !roster[spot]) ?? null;

    default:
      return benchSpots.find((spot) => !roster[spot]) ?? null;
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

    const { assignedTeamId, draftedAmount, isKeeper } =
      (await request.json()) as UpdatePlayerRequest;
    const playerId = parseInt(params.id);

    // First update the NFL player
    const [updatedPlayer] = await db
      .update(nflPlayers)
      .set({
        assignedTeamId,
        draftedAmount,
        isKeeper,
        updatedAt: new Date(),
      })
      .where(eq(nflPlayers.id, playerId))
      .returning();

    if (!updatedPlayer) {
      throw new Error("Player not found");
    }

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
