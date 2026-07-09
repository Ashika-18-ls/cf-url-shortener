-- schema.sql
-- Run this once against your D1 database to create the links table.
-- Command: wrangler d1 execute url-shortener-db --file=./schema.sql

CREATE TABLE IF NOT EXISTS links (
    short_code   TEXT PRIMARY KEY,
    original_url TEXT NOT NULL,
    clicks       INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at);
