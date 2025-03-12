import { db } from "~/server/db";
import { teams } from "~/server/db/schema";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Reset all teams' draft orders to null
    await db
      .update(teams)
      .set({ draftOrder: null })
      .where(eq(teams.id, teams.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resetting draft order:", error);
    return NextResponse.json(
      { error: "Failed to reset draft order" },
      { status: 500 },
    );
  }
}
