#!/usr/bin/env node
import pg from "pg";

const { Pool } = pg;

const apply = process.argv.includes("--apply");
const tenantArgIndex = process.argv.indexOf("--tenant");
const tenantId = tenantArgIndex !== -1 ? process.argv[tenantArgIndex + 1] : undefined;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : false,
});

async function run() {
  const client = await pool.connect();
  try {
    const tenantFilterSql = tenantId ? "AND s.tenant_id = $1" : "";
    const params = tenantId ? [tenantId] : [];

    const unassignedSql = `
      SELECT s.tenant_id, COUNT(*)::int AS count
      FROM sequences s
      WHERE s.project_id IS NULL
      ${tenantFilterSql}
      GROUP BY s.tenant_id
      ORDER BY s.tenant_id
    `;
    const unassigned = await client.query(unassignedSql, params);

    const mappableSql = `
      SELECT s.tenant_id, COUNT(*)::int AS count
      FROM sequences s
      INNER JOIN tenant_projects tp
        ON tp.tenant_id = s.tenant_id
       AND tp.is_default = TRUE
      WHERE s.project_id IS NULL
      ${tenantFilterSql}
      GROUP BY s.tenant_id
      ORDER BY s.tenant_id
    `;
    const mappable = await client.query(mappableSql, params);

    const unmappedSql = `
      SELECT s.tenant_id, COUNT(*)::int AS count
      FROM sequences s
      WHERE s.project_id IS NULL
      ${tenantFilterSql}
      AND NOT EXISTS (
        SELECT 1
        FROM tenant_projects tp
        WHERE tp.tenant_id = s.tenant_id
          AND tp.is_default = TRUE
      )
      GROUP BY s.tenant_id
      ORDER BY s.tenant_id
    `;
    const unmapped = await client.query(unmappedSql, params);

    console.log("\nUnassigned sequences by tenant:");
    console.table(unassigned.rows);

    console.log("\nMappable via default project:");
    console.table(mappable.rows);

    console.log("\nUnmapped (no default project found):");
    console.table(unmapped.rows);

    if (!apply) {
      console.log("\nDry run complete. Re-run with --apply to perform backfill.");
      return;
    }

    const updateSql = `
      UPDATE sequences s
      SET project_id = tp.id,
          updated_at = NOW()
      FROM tenant_projects tp
      WHERE s.project_id IS NULL
        AND tp.tenant_id = s.tenant_id
        AND tp.is_default = TRUE
        ${tenantId ? "AND s.tenant_id = $1" : ""}
    `;
    const update = await client.query(updateSql, params);

    console.log(`\nApplied. Updated ${update.rowCount} sequence row(s).`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});

