-- Run this in Supabase SQL Editor to export all custom database objects
-- Copy the full output and paste it into a file

-- =============================================
-- 1. ALL CUSTOM FUNCTIONS (with full source code)
-- =============================================
SELECT
    '== FUNCTION: ' || n.nspname || '.' || p.proname || ' ==' AS header,
    pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- =============================================
-- 2. ALL TRIGGERS
-- =============================================
SELECT
    '== TRIGGER: ' || trigger_name || ' ON ' || event_object_table || ' ==' AS header,
    trigger_name,
    event_object_table,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
   OR event_object_schema = 'auth'
ORDER BY event_object_table, trigger_name;

-- =============================================
-- 3. ALL TABLES WITH COLUMNS
-- =============================================
SELECT
    '== TABLE: ' || table_name || ' ==' AS header,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- =============================================
-- 4. ALL RLS POLICIES
-- =============================================
SELECT
    '== POLICY: ' || polname || ' ON ' || relname || ' ==' AS header,
    relname AS table_name,
    polname AS policy_name,
    polcmd AS command,
    pg_get_expr(polqual, polrelid) AS using_expr,
    pg_get_expr(polwithcheck, polrelid) AS with_check_expr
FROM pg_policy
JOIN pg_class ON pg_policy.polrelid = pg_class.oid
ORDER BY relname, polname;

-- =============================================
-- 5. AUTH SCHEMA TRIGGERS (for email restriction)
-- =============================================
SELECT
    '== AUTH TRIGGER: ' || t.tgname || ' ==' AS header,
    t.tgname AS trigger_name,
    c.relname AS table_name,
    pg_get_functiondef(t.tgfoid) AS function_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth'
  AND NOT t.tgisinternal;
