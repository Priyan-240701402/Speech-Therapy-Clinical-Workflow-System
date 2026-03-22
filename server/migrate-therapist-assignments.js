import dotenv from "dotenv";
import { getDb } from "./db.js";

dotenv.config();

const mapping = new Map([
  ["therapist01", "emily_therapist"],
  ["therapist02", "james_therapist"],
  ["therapist03", "sarah_therapist"],
  ["therapist04", "michael_therapist"],
  ["Dr. Emily Roberts", "emily_therapist"],
  ["Dr. James Wilson", "james_therapist"],
  ["Dr. Sarah Anderson", "sarah_therapist"],
  ["Dr. Michael Thompson", "michael_therapist"],
]);
const userDisplayNames = new Map([
  ["Dr. Emily Roberts", "emily_therapist"],
  ["Dr. James Wilson", "james_therapist"],
  ["Dr. Sarah Anderson", "sarah_therapist"],
  ["Dr. Michael Thompson", "michael_therapist"],
]);

const run = async () => {
  const db = getDb();
  let updated = 0;

  await db.query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT"
  );

  for (const [displayName, username] of mapping.entries()) {
    const result = await db.query(
      `UPDATE patients
       SET assigned_therapist = $1
       WHERE assigned_therapist = $2`,
      [username, displayName]
    );
    updated += result.rowCount || 0;
  }

  for (const [username, displayName] of userDisplayNames.entries()) {
    await db.query(
      `UPDATE users
       SET display_name = $1
       WHERE username = $2 AND (display_name IS NULL OR display_name = '')`,
      [displayName, username]
    );
  }

  console.log(`Therapist assignment migration complete. Updated ${updated} rows.`);
  await db.end();
};

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
