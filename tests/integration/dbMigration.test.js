import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { auditAndMigrateJsonData } from "../../frontend/lib/db/migrateJsonToDb.js";

test("Database Migration - Validates flat JSON datasets and generates valid SQL", () => {
  const report = auditAndMigrateJsonData();

  // Verify non-empty data read
  assert.ok(report.bots.read >= 1, "Must read at least 1 bot from data store");
  assert.equal(report.bots.valid, report.bots.read, "All bots must be valid");
  
  assert.ok(report.leads.read >= 1, "Must read at least 1 lead");
  assert.equal(report.leads.valid, report.leads.read, "All leads must be valid");

  assert.ok(report.documents.read >= 1, "Must read at least 1 document");
  assert.equal(report.documents.valid, report.documents.read, "All documents must be valid");

  assert.ok(report.conversations.read >= 1, "Must read at least 1 conversation");

  // Verify SQL statements generation
  assert.ok(report.sqlStatements.length > 5, "Must generate SQL migration statements");
  const fullSql = report.sqlStatements.join("\n");
  
  // Ensure idempotent keywords are present
  assert.ok(fullSql.includes("ON CONFLICT"), "SQL must use ON CONFLICT for idempotency");
  assert.ok(fullSql.includes("INSERT INTO \"Bot\""), "Must contain Bot insert");
  assert.ok(fullSql.includes("INSERT INTO \"Lead\""), "Must contain Lead insert");
  assert.ok(fullSql.includes("INSERT INTO \"KnowledgeDocument\""), "Must contain KnowledgeDocument insert");
});
