-- =============================================================================
-- FILE: docker/postgres/init-roles.sql
-- SUMMARY
--     Dedicated non-admin login roles and a private application schema.
-- BASIC IDEA
--     Quote credentials as SQL literals using psql, with statement/error SQL
--     logging disabled by the server before this initialization is entered.
-- INPUTS / INPUT SOURCES
--     Role passwords from environment; the dedicated database name.
-- EXPECTED OUTPUT
--     Fixed roles, no PUBLIC database/schema capability, maintenance ownership.
-- =============================================================================
\getenv app_password TEAM_APP_PASSWORD
\getenv maintenance_password TEAM_MAINTENANCE_PASSWORD
\getenv backup_password TEAM_BACKUP_PASSWORD
\getenv db_name POSTGRES_DB
BEGIN;
CREATE ROLE team_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD :'app_password';
CREATE ROLE team_maintenance LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD :'maintenance_password';
CREATE ROLE team_backup LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD :'backup_password';
REVOKE ALL ON DATABASE :"db_name" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db_name" TO team_app, team_maintenance, team_backup;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA semantic_studio AUTHORIZATION team_maintenance;
GRANT USAGE ON SCHEMA semantic_studio TO team_app, team_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE team_maintenance IN SCHEMA semantic_studio GRANT SELECT ON TABLES TO team_backup;
ALTER ROLE team_app IN DATABASE :"db_name" SET search_path = semantic_studio, pg_catalog;
ALTER ROLE team_maintenance IN DATABASE :"db_name" SET search_path = semantic_studio, pg_catalog;
ALTER ROLE team_backup IN DATABASE :"db_name" SET search_path = semantic_studio, pg_catalog;
COMMIT;
