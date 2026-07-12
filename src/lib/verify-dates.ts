import { createClient } from "@libsql/client";

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const r = await client.execute("SELECT id, created_at, updated_at FROM orders LIMIT 3");
  console.log("=== Orders ===");
  for (const row of r.rows) {
    const d = new Date(row.created_at as string);
    console.log("created_at:", row.created_at, "→", d.toString(), "→ Locale:", d.toLocaleDateString());
  }

  const r3 = await client.execute("SELECT id, created_at FROM users LIMIT 3");
  console.log("\n=== Users ===");
  for (const row of r3.rows) {
    const d = new Date(row.created_at as string);
    console.log("created_at:", row.created_at, "→", d.toLocaleDateString());
  }

  const r4 = await client.execute("SELECT id, created_at FROM customers LIMIT 3");
  console.log("\n=== Customers ===");
  for (const row of r4.rows) {
    const d = new Date(row.created_at as string);
    console.log("created_at:", row.created_at, "→", d.toLocaleDateString());
  }
}

main();
