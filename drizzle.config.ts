import { type Config } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: ".env.local" });

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
  tablesFilter: ["auction-app_*"],
} satisfies Config;
