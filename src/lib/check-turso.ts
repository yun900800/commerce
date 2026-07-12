import { createClient } from "@libsql/client";

async function main() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  console.log("TURSO_DATABASE_URL:", tursoUrl ? "SET" : "NOT SET");
  console.log("TURSO_AUTH_TOKEN:", tursoToken ? "SET (" + tursoToken.slice(0, 20) + "..." : "NOT SET");

  if (!tursoUrl) {
    console.log("Falling back to local sqlite.db");
    return;
  }

  const client = createClient({ url: tursoUrl, authToken: tursoToken });

  try {
    const result = await client.execute("SELECT COUNT(*) as cnt FROM orders WHERE created_at = 'CURRENT_TIMESTAMP'");
    console.log("Orders with CURRENT_TIMESTAMP in created_at:", result.rows[0].cnt);

    const result2 = await client.execute("SELECT id, created_at FROM orders LIMIT 5");
    console.log("Sample data:");
    for (const row of result2.rows) {
      console.log(`  id=${row.id}, created_at="${row.created_at}"`);
    }
  } catch (err) {
    console.error("Turso connection error:", err);
  }
}

main();
