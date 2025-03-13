"use client";

import clsx from "clsx";

export default function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("mx-auto max-w-screen-xl px-4 lg:px-0", className)}>
      {children}
    </div>
  );
}
