// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import {
  index,
  pgTableCreator,
  serial,
  timestamp,
  varchar,
  text,
  pgEnum,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `auction-app_${name}`);

// Create position enum
export const positionEnum = pgEnum("position", ["QB", "RB", "WR", "TE"]);

export const teams = createTable(
  "team",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    ownerName: varchar("owner_name", { length: 255 }).notNull(),
    ownerId: varchar("owner_id", { length: 255 }).notNull(),
    draftOrder: integer("draft_order"),
    totalBudget: integer("total_budget").notNull().default(200),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    nameIdx: index("name_idx").on(table.name),
  }),
);

export const nflPlayers = createTable(
  "nfl_player",
  {
    id: serial("id").primaryKey(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    position: positionEnum("position").notNull(),
    nflTeamName: varchar("nfl_team_name", { length: 100 }),
    assignedTeamId: integer("assigned_team_id").references(() => teams.id),
    draftedAmount: integer("drafted_amount"),
    isKeeper: boolean("is_keeper").default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => ({
    positionIdx: index("position_idx").on(table.position),
    nflTeamIdx: index("nfl_team_idx").on(table.nflTeamName),
    assignedTeamIdx: index("assigned_team_idx").on(table.assignedTeamId),
    playerNameIdx: index("player_name_idx").on(table.firstName, table.lastName),
  }),
);

export const rosters = createTable(
  "roster",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id")
      .references(() => teams.id)
      .notNull()
      .unique(), // One roster per team
    QB: integer("qb").references(() => nflPlayers.id),
    RB1: integer("rb1").references(() => nflPlayers.id),
    RB2: integer("rb2").references(() => nflPlayers.id),
    WR1: integer("wr1").references(() => nflPlayers.id),
    WR2: integer("wr2").references(() => nflPlayers.id),
    TE: integer("te").references(() => nflPlayers.id),
    Flex1: integer("flex1").references(() => nflPlayers.id),
    Flex2: integer("flex2").references(() => nflPlayers.id),
    Bench1: integer("bench1").references(() => nflPlayers.id),
    Bench2: integer("bench2").references(() => nflPlayers.id),
    Bench3: integer("bench3").references(() => nflPlayers.id),
    Bench4: integer("bench4").references(() => nflPlayers.id),
    Bench5: integer("bench5").references(() => nflPlayers.id),
    Bench6: integer("bench6").references(() => nflPlayers.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => ({
    teamIdIdx: index("team_id_idx").on(table.teamId),
  }),
);

export const rostersRelations = relations(rosters, ({ one }) => ({
  qbPlayer: one(nflPlayers, {
    fields: [rosters.QB],
    references: [nflPlayers.id],
  }),
  rb1Player: one(nflPlayers, {
    fields: [rosters.RB1],
    references: [nflPlayers.id],
  }),
  rb2Player: one(nflPlayers, {
    fields: [rosters.RB2],
    references: [nflPlayers.id],
  }),
  wr1Player: one(nflPlayers, {
    fields: [rosters.WR1],
    references: [nflPlayers.id],
  }),
  wr2Player: one(nflPlayers, {
    fields: [rosters.WR2],
    references: [nflPlayers.id],
  }),
  tePlayer: one(nflPlayers, {
    fields: [rosters.TE],
    references: [nflPlayers.id],
  }),
  flex1Player: one(nflPlayers, {
    fields: [rosters.Flex1],
    references: [nflPlayers.id],
  }),
  flex2Player: one(nflPlayers, {
    fields: [rosters.Flex2],
    references: [nflPlayers.id],
  }),
  bench1Player: one(nflPlayers, {
    fields: [rosters.Bench1],
    references: [nflPlayers.id],
  }),
  bench2Player: one(nflPlayers, {
    fields: [rosters.Bench2],
    references: [nflPlayers.id],
  }),
  bench3Player: one(nflPlayers, {
    fields: [rosters.Bench3],
    references: [nflPlayers.id],
  }),
  bench4Player: one(nflPlayers, {
    fields: [rosters.Bench4],
    references: [nflPlayers.id],
  }),
  bench5Player: one(nflPlayers, {
    fields: [rosters.Bench5],
    references: [nflPlayers.id],
  }),
  bench6Player: one(nflPlayers, {
    fields: [rosters.Bench6],
    references: [nflPlayers.id],
  }),
}));
