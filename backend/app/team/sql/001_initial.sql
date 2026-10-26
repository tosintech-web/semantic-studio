-- =============================================================================
-- FILE: backend/app/team/sql/001_initial.sql
-- SUMMARY
--     PostgreSQL version 1 resources, replay, authentication and schema metadata.
-- BASIC IDEA
--     Maintenance owns DDL; the app has scoped DML and append-only audit/replay.
-- INPUTS / INPUT SOURCES
--     Trusted static schema executed only with the maintenance writer lease.
-- EXPECTED OUTPUT
--     Nine tables with canonical JSON TEXT, BIGINT revisions and typed auth.
-- =============================================================================
CREATE TABLE semantic_studio.team_schema (
    id smallint PRIMARY KEY CHECK (id=1), version integer NOT NULL CHECK (version>0),
    fingerprint text NOT NULL
);
CREATE TABLE semantic_studio.resources (
    key text PRIMARY KEY, version bigint NOT NULL CHECK (version>0), payload text
);
CREATE TABLE semantic_studio.audit (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key text NOT NULL, actor text NOT NULL, timestamp text NOT NULL,
    operation text NOT NULL, request_id text NOT NULL,
    before_version bigint CHECK (before_version>0), after_version bigint NOT NULL CHECK (after_version>0),
    before_payload text, after_payload text
);
CREATE INDEX audit_key_id ON semantic_studio.audit(key,id DESC);
CREATE TABLE semantic_studio.requests (
    actor text NOT NULL, request_id text NOT NULL, body_hash text NOT NULL,
    result text NOT NULL, PRIMARY KEY(actor,request_id)
);
CREATE TABLE semantic_studio.team_users (
    sub text PRIMARY KEY, email text NOT NULL, domain text NOT NULL,
    role text NOT NULL CHECK (role IN ('viewer','editor','admin')),
    disabled boolean NOT NULL, version bigint NOT NULL CHECK (version>0)
);
CREATE TABLE semantic_studio.team_sessions (
    token_hash text PRIMARY KEY, sub text NOT NULL REFERENCES semantic_studio.team_users(sub),
    created double precision NOT NULL CHECK (created>=0 AND created<'Infinity'::double precision),
    last_seen double precision NOT NULL CHECK (last_seen>=created AND last_seen<'Infinity'::double precision)
);
CREATE TABLE semantic_studio.team_login_attempts (
    state_hash text PRIMARY KEY, browser_hash text NOT NULL, nonce text NOT NULL,
    verifier text NOT NULL,
    created double precision NOT NULL CHECK (created>=0 AND created<'Infinity'::double precision)
);
CREATE TABLE semantic_studio.team_auth_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor text, target text,
    operation text NOT NULL,
    timestamp double precision NOT NULL CHECK (timestamp>=0 AND timestamp<'Infinity'::double precision),
    before_payload text, after_payload text
);
CREATE TABLE semantic_studio.team_access_requests (
    actor text NOT NULL, request_id text NOT NULL, body_hash text NOT NULL,
    result text NOT NULL, PRIMARY KEY(actor,request_id)
);
GRANT SELECT ON ALL TABLES IN SCHEMA semantic_studio TO team_backup;
GRANT SELECT ON semantic_studio.team_schema TO team_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON semantic_studio.resources, semantic_studio.team_users,
    semantic_studio.team_sessions, semantic_studio.team_login_attempts TO team_app;
GRANT SELECT, INSERT ON semantic_studio.audit, semantic_studio.requests,
    semantic_studio.team_auth_events, semantic_studio.team_access_requests TO team_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA semantic_studio TO team_app;
