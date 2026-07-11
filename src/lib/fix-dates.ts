/**
 * Fix existing date data — replaces the string "CURRENT_TIMESTAMP"
 * stored in the database with an actual ISO timestamp.
 *
 * Run: npx tsx src/lib/fix-dates.ts
 */
import { createClient } from "@libsql/client";

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient(
  tursoUrl
    ? { url: tursoUrl, authToken: tursoToken }
    : { url: "file:sqlite.db" }
);

const now = new Date().toISOString();

async function fixDates() {
  console.log(`Fixing dates — using timestamp: ${now}\n`);
  console.log("Connection:", tursoUrl ? "Turso (remote)" : "SQLite (local)");

  const updates = [
    { sql: "UPDATE customers SET created_at = ? WHERE created_at = 'CURRENT_TIMESTAMP'", label: "customers.created_at" },
    { sql: "UPDATE products SET created_at = ? WHERE created_at = 'CURRENT_TIMESTAMP'", label: "products.created_at" },
    { sql: "UPDATE products SET updated_at = ? WHERE updated_at = 'CURRENT_TIMESTAMP'", label: "products.updated_at" },
    { sql: "UPDATE orders SET created_at = ? WHERE created_at = 'CURRENT_TIMESTAMP'", label: "orders.created_at" },
    { sql: "UPDATE orders SET updated_at = ? WHERE updated_at = 'CURRENT_TIMESTAMP'", label: "orders.updated_at" },
    { sql: "UPDATE users SET created_at = ? WHERE created_at = 'CURRENT_TIMESTAMP'", label: "users.created_at" },
  ];

  let totalFixed = 0;

  for (const u of updates) {
    const result = await client.execute({ sql: u.sql, args: [now] });
    if (result.rowsAffected > 0) {
      console.log(`  ✅ ${u.label}: fixed ${result.rowsAffected} rows`);
      totalFixed += result.rowsAffected;
    }
  }

  if (totalFixed === 0) {
    console.log("  No rows needed fixing (all dates already correct).");
  } else {
    console.log(`\n✅ Total rows fixed: ${totalFixed}`);
  }

  // Verify
  console.log("\n--- Verification ---");
  const check = await client.execute("SELECT COUNT(*) as cnt FROM orders WHERE created_at = 'CURRENT_TIMESTAMP'");
  console.log(`Orders still with CURRENT_TIMESTAMP: ${check.rows[0].cnt}`);
}

fixDates().catch((err) => {
  console.error("Fix failed:", err);
  process.exit(1);
});
