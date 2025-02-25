import { db } from "~/server/db";
import { teams } from "~/server/db/schema";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: { teamId: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { draftOrder } = body;

    if (typeof draftOrder !== "number") {
      return NextResponse.json(
        { error: "Draft order must be a number" },
        { status: 400 },
      );
    }

    const updatedTeam = await db
      .update(teams)
      .set({ draftOrder })
      .where(eq(teams.id, parseInt(params.teamId)))
      .returning();

    return NextResponse.json(updatedTeam[0]);
  } catch (error) {
    console.error("Error updating draft order:", error);
    return NextResponse.json(
      { error: "Failed to update draft order" },
      { status: 500 },
    );
  }
}
