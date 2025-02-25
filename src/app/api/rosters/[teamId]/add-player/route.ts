import { db } from "~/server/db";
import { rosters } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { teamId: string } },
) {
  try {
    const teamId = parseInt(params.teamId);
    const { playerId, position } = await request.json();

    const [roster] = await db
      .select()
      .from(rosters)
      .where(eq(rosters.teamId, teamId));

    if (!roster) {
      return new NextResponse("Roster not found", { status: 404 });
    }

    // Find first available spot based on position
    let updateField = null;

    switch (position) {
      case "QB":
        if (!roster.QB) updateField = "QB";
        break;
      case "RB":
        if (!roster.RB1) updateField = "RB1";
        else if (!roster.RB2) updateField = "RB2";
        else if (!roster.Flex1) updateField = "Flex1";
        else if (!roster.Flex2) updateField = "Flex2";
        break;
      case "WR":
        if (!roster.WR1) updateField = "WR1";
        else if (!roster.WR2) updateField = "WR2";
        else if (!roster.Flex1) updateField = "Flex1";
        else if (!roster.Flex2) updateField = "Flex2";
        break;
      case "TE":
        if (!roster.TE) updateField = "TE";
        else if (!roster.Flex1) updateField = "Flex1";
        else if (!roster.Flex2) updateField = "Flex2";
        break;
    }

    // If no position spot, try bench spots
    if (!updateField) {
      const benchSpots = [
        "Bench1",
        "Bench2",
        "Bench3",
        "Bench4",
        "Bench5",
        "Bench6",
      ];
      for (const spot of benchSpots) {
        if (!roster[spot]) {
          updateField = spot;
          break;
        }
      }
    }

    if (!updateField) {
      return new NextResponse("No available roster spots", { status: 400 });
    }

    // Update roster with player in found spot
    await db
      .update(rosters)
      .set({
        [updateField]: playerId,
        updatedAt: new Date(),
      })
      .where(eq(rosters.teamId, teamId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating roster:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
