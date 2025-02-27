import { db } from "~/server/db";
import { teams } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Validate the request body schema
const updateSchema = z.object({
  updates: z.record(z.string(), z.number()),
});

export async function PATCH(request: Request) {
  try {
    // Check admin permission
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate the request body
    const body = await request.json();
    const { updates } = updateSchema.parse(body);

    // Convert string keys to numbers and prepare updates
    const draftOrderUpdates = Object.entries(updates).map(
      ([teamId, position]) => ({
        teamId: parseInt(teamId, 10),
        position,
      }),
    );

    // Update each team's draft order in a transaction
    await db.transaction(async (tx) => {
      for (const { teamId, position } of draftOrderUpdates) {
        await tx
          .update(teams)
          .set({ draftOrder: position })
          .where(eq(teams.id, teamId));
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating draft orders:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Failed to update draft orders" },
      { status: 500 },
    );
  }
}
