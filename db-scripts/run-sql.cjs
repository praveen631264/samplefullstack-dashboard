const { Client } = require("pg");
const fs = require("fs");

const dbUrl = process.env.DATABASE_URL;
const sqlFile = process.argv[2];

if (!sqlFile) {
  console.error("Usage: node run-sql.cjs <sql-file>");
  process.exit(1);
}

if (!dbUrl) {
  console.error("ERROR: DATABASE_URL environment variable is not set");
  process.exit(1);
}

function splitStatements(sql) {
  const statements = [];
  let current = "";
  let inParens = 0;
  let inSingleQuote = false;
  let inLineComment = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1] || "";

    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
      }
      current += ch;
      continue;
    }

    if (ch === "-" && next === "-" && !inSingleQuote) {
      inLineComment = true;
      current += ch;
      continue;
    }

    if (ch === "'" && !inLineComment) {
      inSingleQuote = !inSingleQuote;
      current += ch;
      continue;
    }

    if (!inSingleQuote) {
      if (ch === "(") inParens++;
      if (ch === ")") inParens--;
    }

    if (ch === ";" && inParens === 0 && !inSingleQuote) {
      const trimmed = current.trim();
      const noComments = trimmed.replace(/--.*$/gm, "").trim();
      if (noComments.length > 0) {
        statements.push(trimmed);
      }
      current = "";
    } else {
      current += ch;
    }
  }

  const trimmed = current.trim();
  const noComments = trimmed.replace(/--.*$/gm, "").trim();
  if (noComments.length > 0) {
    statements.push(trimmed);
  }

  return statements;
}

async function run() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    console.log("Connected to database successfully.\n");

    const sql = fs.readFileSync(sqlFile, "utf8");
    const statements = splitStatements(sql);

    for (const stmt of statements) {
      const preview = stmt.replace(/--.*$/gm, "").replace(/\s+/g, " ").trim().substring(0, 80);
      try {
        const result = await client.query(stmt);
        if (result.rows && result.rows.length > 0) {
          console.log("---");
          console.table(result.rows);
        } else if (result.command) {
          console.log(`${result.command}: ${result.rowCount !== null ? result.rowCount + " row(s) affected" : "OK"}`);
        }
      } catch (err) {
        console.error(`ERROR: ${preview}...`);
        console.error(`  ${err.message}\n`);
      }
    }
  } catch (err) {
    console.error("Connection failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log("\nDone.");
  }
}

run();
