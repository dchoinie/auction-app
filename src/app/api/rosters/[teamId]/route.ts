import { db } from "~/server/db";
import { rosters } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { teamId: string } },
) {
  try {
    const teamId = parseInt(params.teamId);

    const roster = await db.query.rosters.findFirst({
      where: eq(rosters.teamId, teamId),
      with: {
        qbPlayer: true,
        rb1Player: true,
        rb2Player: true,
        wr1Player: true,
        wr2Player: true,
        tePlayer: true,
        flex1Player: true,
        flex2Player: true,
        bench1Player: true,
        bench2Player: true,
        bench3Player: true,
        bench4Player: true,
        bench5Player: true,
        bench6Player: true,
      },
    });

    if (!roster) {
      return new NextResponse("Roster not found", { status: 404 });
    }

    return NextResponse.json(roster);
  } catch (error) {
    console.error("Error fetching roster:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
