#!/bin/sh
# ==============================================================================
# FILE: docker/postgres/init-roles.sh
# SUMMARY
#     Initialize dedicated roles without passwords in argv or diagnostics.
# BASIC IDEA
#     PostgreSQL's entrypoint runs this as OS postgres over peer authentication.
#     psql reads secrets from its environment; all failure output is finite.
# INPUTS / INPUT SOURCES
#     Individual secret files and validated POSTGRES_DB from Compose.
# EXPECTED OUTPUT
#     Atomic fixed role/schema creation or a quiet failing initialization.
# ==============================================================================
set -eu
TEAM_APP_PASSWORD=$(cat /run/secrets/team_db_app)
TEAM_MAINTENANCE_PASSWORD=$(cat /run/secrets/team_db_maintenance)
TEAM_BACKUP_PASSWORD=$(cat /run/secrets/team_db_backup)
export TEAM_APP_PASSWORD TEAM_MAINTENANCE_PASSWORD TEAM_BACKUP_PASSWORD
if ! psql --no-psqlrc --set=ON_ERROR_STOP=1 --username=postgres --dbname="$POSTGRES_DB" --file=/opt/team-init-roles.sql >/dev/null 2>&1; then
    echo db_role_initialization_failed >&2
    exit 1
fi
unset TEAM_APP_PASSWORD TEAM_MAINTENANCE_PASSWORD TEAM_BACKUP_PASSWORD
