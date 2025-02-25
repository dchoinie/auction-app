"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

interface NFLPlayer {
  id: number;
  firstName: string;
  lastName: string;
  position: string;
  nflTeamName: string;
  draftedAmount: number | null;
}

interface RosterWithPlayers {
  qbPlayer: NFLPlayer | null;
  rb1Player: NFLPlayer | null;
  rb2Player: NFLPlayer | null;
  wr1Player: NFLPlayer | null;
  wr2Player: NFLPlayer | null;
  tePlayer: NFLPlayer | null;
  flex1Player: NFLPlayer | null;
  flex2Player: NFLPlayer | null;
  bench1Player: NFLPlayer | null;
  bench2Player: NFLPlayer | null;
  bench3Player: NFLPlayer | null;
  bench4Player: NFLPlayer | null;
  bench5Player: NFLPlayer | null;
  bench6Player: NFLPlayer | null;
}

interface RosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  teamName: string;
}

export default function RosterModal({
  isOpen,
  onClose,
  teamId,
  teamName,
}: RosterModalProps) {
  const [roster, setRoster] = useState<RosterWithPlayers | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchRoster = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/rosters/${teamId}`);
          const data = (await response.json()) as RosterWithPlayers;
          setRoster(data);
        } catch (error) {
          console.error("Error fetching roster:", error);
        }
        setIsLoading(false);
      };

      void fetchRoster();
    }
  }, [isOpen, teamId]);

  const renderPlayer = (player: NFLPlayer | null, position: string) => {
    if (!player) return <div className="text-gray-400">Empty {position}</div>;
    return (
      <div className="rounded-lg border p-2">
        <div className="font-medium">
          {player.firstName} {player.lastName}
        </div>
        <div className="text-sm text-gray-600">
          {player.position} - {player.nflTeamName}
        </div>
        <div className="text-sm text-green-600">${player.draftedAmount}</div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{teamName} Roster</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="my-4">Loading roster...</div>
        ) : roster ? (
          <div className="mt-4 grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="mb-2 font-semibold">Starters</h3>
                <div className="space-y-2">
                  {renderPlayer(roster.qbPlayer, "QB")}
                  {renderPlayer(roster.rb1Player, "RB1")}
                  {renderPlayer(roster.rb2Player, "RB2")}
                  {renderPlayer(roster.wr1Player, "WR1")}
                  {renderPlayer(roster.wr2Player, "WR2")}
                  {renderPlayer(roster.tePlayer, "TE")}
                  {renderPlayer(roster.flex1Player, "FLEX1")}
                  {renderPlayer(roster.flex2Player, "FLEX2")}
                </div>
              </div>
              <div>
                <h3 className="mb-2 font-semibold">Bench</h3>
                <div className="space-y-2">
                  {renderPlayer(roster.bench1Player, "Bench 1")}
                  {renderPlayer(roster.bench2Player, "Bench 2")}
                  {renderPlayer(roster.bench3Player, "Bench 3")}
                  {renderPlayer(roster.bench4Player, "Bench 4")}
                  {renderPlayer(roster.bench5Player, "Bench 5")}
                  {renderPlayer(roster.bench6Player, "Bench 6")}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="my-4">No roster found</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
