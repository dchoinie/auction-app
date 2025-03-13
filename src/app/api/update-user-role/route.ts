import { clerkClient } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

export async function POST(request: Request) {
  try {
    // Get the current authenticated user
    const { userId: currentUserId } = auth();

    if (!currentUserId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body
    const body = await request.json();
    const { userId, role } = body;

    // Validate that the user is updating their own role
    // This is a security measure to prevent users from updating others' roles
    if (userId !== currentUserId) {
      return NextResponse.json(
        { message: "You can only update your own role" },
        { status: 403 },
      );
    }

    // Validate the role
    if (role !== "admin" && role !== "user") {
      return NextResponse.json(
        { message: "Invalid role. Must be 'admin' or 'user'" },
        { status: 400 },
      );
    }

    // Update the user's metadata
    await clerkClient.users.updateUser(userId, {
      publicMetadata: { role },
    });

    return NextResponse.json(
      { message: "User role updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { message: "Failed to update user role" },
      { status: 500 },
    );
  }
}
