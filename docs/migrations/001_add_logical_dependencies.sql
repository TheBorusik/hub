-- Migration: Add logical_dependencies JSONB column for structured dependency search
-- Date: 2026-04-27

ALTER TABLE process_assemblies
    ADD COLUMN IF NOT EXISTS logical_dependencies JSONB;

-- GIN index for fast JSONB containment queries (@>)
CREATE INDEX IF NOT EXISTS idx_process_assemblies_logical_deps_gin
    ON process_assemblies USING GIN (logical_dependencies);

-- Example queries:
-- Find processes that use CRUD model "PromoModel":
--   SELECT * FROM process_assemblies
--   WHERE logical_dependencies @> '{"crud":[{"model":"PromoModel"}]}';
--
-- Find processes that call command "SendEmail":
--   SELECT * FROM process_assemblies
--   WHERE logical_dependencies @> '{"commands":[{"name":"SendEmail"}]}';
