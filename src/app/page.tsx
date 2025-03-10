"use client";

import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import Image from "next/image";

type Member = {
  name: string;
  image: string;
};

const members: Member[] = [
  {
    name: "Alex Krenik",
    image: "/alex.jpg",
  },
  {
    name: "Brian Battista",
    image: "/battista.jpg",
  },
  {
    name: "Jon Bjelde",
    image: "/bjelde.jpg",
  },
  {
    name: "Dan Choiniere",
    image: "/dan.jpg",
  },
  {
    name: "Gene Richtsmeier",
    image: "/gene.jpg",
  },
  {
    name: "",
    image: "",
  },
  {
    name: "",
    image: "",
  },
  {
    name: "Kyle Olson",
    image: "/kyle.jpg",
  },
  {
    name: "Mike Kern",
    image: "/mike.jpg",
  },
  {
    name: "Derek Rux",
    image: "/rux.jpg",
  },
  {
    name: "Andrew Schwanke",
    image: "/schwanke.jpg",
  },
  {
    name: "Matt Taffe",
    image: "/taffe.jpg",
  },
];

function MemberBubble({ member }: { member: Member }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-48 w-48">
        {member.image && (
          <Image
            src={member.image}
            alt={member.name}
            fill
            sizes="192px"
            className="rounded-full object-cover shadow-xl"
            onError={(e) => {
              console.error(`Error loading image for ${member.name}:`, e);
            }}
          />
        )}
      </div>
      {member.name && (
        <p className="mt-2 text-center text-sm font-semibold text-gray-800">
          {member.name}
        </p>
      )}
    </div>
  );
}

function MemberBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="grid h-screen w-screen grid-cols-4 grid-rows-3 gap-8 p-8">
        {members.map((member) => (
          <div key={member.name} className="flex items-center justify-center">
            <div className="opacity-75">
              <MemberBubble member={member} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { user } = useUser();
  const currentYear = new Date().getFullYear();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative min-h-screen bg-transparent">
      <MemberBackground />
      <div className="container mx-auto flex min-h-screen flex-col items-center justify-center p-4">
        <div className="max-w-4xl space-y-3">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tight text-gray-900">
              True Fliers Fantasy Football
            </h1>
            <p className="text-xl text-gray-600">{currentYear} Auction Draft</p>
          </div>
          <p className="text-center text-sm text-gray-500">
            This is a private platform for True Fliers league members only. You
            need an invitation to join. If you&apos;re a league member but
            haven&apos;t received an invitation, please contact the league
            administrator.
          </p>
          <div className="flex justify-center gap-4">
            <SignInButton mode="modal">
              <button className="rounded-full bg-black px-8 py-3 text-sm font-medium text-white transition hover:bg-gray-800">
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      </div>
    </main>
  );
}
