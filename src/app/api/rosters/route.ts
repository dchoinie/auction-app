import { db } from "~/server/db";
import { rosters } from "~/server/db/schema";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const allRosters = await db.select().from(rosters);
    return NextResponse.json(allRosters);
  } catch (error) {
    console.error("Error fetching rosters:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
