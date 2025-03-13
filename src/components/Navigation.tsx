"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import Container from "./Container";
import NavItem, { NavItem as NavItemType } from "./NavItem";
import { useUserRole } from "~/hooks/use-user-role";
import { hasPermission } from "~/lib/permissions";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";

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
          {/* Left side navigation - visible only on medium screens and up */}
          <div className="hidden gap-12 md:flex">
            {navItems.map((item: NavItemType) => (
              <NavItem key={item.href} {...item} />
            ))}
            {hasPermission(role, "admin") && (
              <NavItem label="Admin Tools" href="/dashboard/admin" />
            )}
          </div>

          {/* Hamburger menu - visible only on small screens */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[240px] sm:w-[300px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 py-4">
                  {navItems.map((item: NavItemType) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-lg font-medium transition-colors hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  ))}
                  {hasPermission(role, "admin") && (
                    <Link
                      href="/dashboard/admin"
                      className="text-lg font-medium transition-colors hover:text-primary"
                    >
                      Admin Tools
                    </Link>
                  )}
                  <div className="mt-4">
                    <Link
                      href="/dashboard/draft"
                      className="inline-block w-full rounded bg-blue-500 px-4 py-2 text-center text-white hover:bg-blue-600"
                    >
                      Join Draft
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Logo or brand name can go here */}
          <div className="flex-1 text-center font-bold md:hidden">
            Auction App
          </div>

          {/* Right side items */}
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/draft"
              className="hidden rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 md:block"
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
