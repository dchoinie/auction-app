"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import Container from "./Container";
import NavItem, { NavItem as NavItemType } from "./NavItem";
import { useUserRole } from "~/hooks/use-user-role";
import { hasPermission } from "~/lib/permissions";

const navItems: NavItemType[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    label: "Keepers",
    href: "/dashboard/keepers",
  },
];

export default function Navigation() {
  const role = useUserRole();

  return (
    <Container>
      <nav>
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Left side navigation */}
          <div className="flex gap-12">
            {navItems.map((item: NavItemType) => (
              <NavItem key={item.href} {...item} />
            ))}
            {hasPermission(role, "admin") && (
              <NavItem label="Admin Tools" href="/dashboard/admin" />
            )}
          </div>

          {/* Right side items */}
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/draft"
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Join Draft
            </Link>
            <UserButton />
          </div>
        </div>
      </nav>
    </Container>
  );
}
