"use client";

import { useUser } from "@clerk/nextjs";
import type { UserRole } from "~/lib/permissions";

export function useUserRole() {
  const { user } = useUser();
  return (user?.publicMetadata?.role as UserRole) ?? "user";
}
