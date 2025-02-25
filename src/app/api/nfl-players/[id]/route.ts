import { db } from "~/server/db";
import { nflPlayers } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { assignedTeamId, draftedAmount } = await request.json();
    const playerId = parseInt(params.id);

    const [updatedPlayer] = await db
      .update(nflPlayers)
      .set({
        assignedTeamId,
        draftedAmount,
        updatedAt: new Date(),
      })
      .where(eq(nflPlayers.id, playerId))
      .returning();

    return NextResponse.json(updatedPlayer);
  } catch (error) {
    console.error("Error updating player:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
