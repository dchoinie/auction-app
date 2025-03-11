import { db } from "~/server/db";
import { teams } from "~/server/db/schema";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

interface DraftOrderUpdates {
  updates: Record<number, number>;
}

export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as DraftOrderUpdates;
    const { updates } = body;

    // Update each team's draft order
    for (const [teamId, draftOrder] of Object.entries(updates)) {
      await db
        .update(teams)
        .set({ draftOrder })
        .where(eq(teams.id, parseInt(teamId)));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating draft order:", error);
    return NextResponse.json(
      { error: "Failed to update draft order" },
      { status: 500 },
    );
  }
}
