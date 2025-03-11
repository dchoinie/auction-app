import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { sql } from "drizzle-orm";

export async function POST() {
  try {
    // Intentionally updating all rows as this is a reset operation
    // eslint-disable-next-line drizzle/enforce-update-with-where
    await db.execute(sql`
      UPDATE "auction-app_roster" 
      SET 
        qb = NULL,
        rb1 = NULL,
        rb2 = NULL,
        wr1 = NULL,
        wr2 = NULL,
        te = NULL,
        flex1 = NULL,
        flex2 = NULL,
        bench1 = NULL,
        bench2 = NULL,
        bench3 = NULL,
        bench4 = NULL,
        bench5 = NULL,
        bench6 = NULL
    `);

    return NextResponse.json({ message: "Rosters reset successfully" });
  } catch (error) {
    console.error("Error resetting rosters:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
