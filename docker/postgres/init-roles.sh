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
invalid_secret() {
    echo db_secret_invalid >&2
    exit 1
}
read_secret() {
    [ -f "$1" ] || invalid_secret
    size=$(wc -c < "$1" 2>/dev/null) || invalid_secret
    [ "$size" -gt 0 ] && [ "$size" -le 16384 ] || invalid_secret
    # File input keeps values out of argv. A single optional final LF is
    # accepted; blank/extra lines, control bytes and invalid UTF-8 fail closed.
    iconv -f UTF-8 -t UTF-8 "$1" >/dev/null 2>&1 || invalid_secret
    LC_ALL=C awk 'NR!=1 || !length($0) || /[[:cntrl:]]/ {bad=1} END {exit (NR!=1 || bad)}' "$1" >/dev/null 2>&1 || invalid_secret
    cat "$1" 2>/dev/null || invalid_secret
}
TEAM_ADMIN_PASSWORD=$(read_secret /run/secrets/team_db_admin)
TEAM_APP_PASSWORD=$(read_secret /run/secrets/team_db_app)
TEAM_MAINTENANCE_PASSWORD=$(read_secret /run/secrets/team_db_maintenance)
TEAM_BACKUP_PASSWORD=$(read_secret /run/secrets/team_db_backup)
[ "$TEAM_ADMIN_PASSWORD" != "$TEAM_APP_PASSWORD" ] &&
[ "$TEAM_ADMIN_PASSWORD" != "$TEAM_MAINTENANCE_PASSWORD" ] &&
[ "$TEAM_ADMIN_PASSWORD" != "$TEAM_BACKUP_PASSWORD" ] &&
[ "$TEAM_APP_PASSWORD" != "$TEAM_MAINTENANCE_PASSWORD" ] &&
[ "$TEAM_APP_PASSWORD" != "$TEAM_BACKUP_PASSWORD" ] &&
[ "$TEAM_MAINTENANCE_PASSWORD" != "$TEAM_BACKUP_PASSWORD" ] || invalid_secret
unset TEAM_ADMIN_PASSWORD
export TEAM_APP_PASSWORD TEAM_MAINTENANCE_PASSWORD TEAM_BACKUP_PASSWORD
if ! psql --no-psqlrc --set=ON_ERROR_STOP=1 --username=postgres --dbname="$POSTGRES_DB" --file=/opt/team-init-roles.sql >/dev/null 2>&1; then
    echo db_role_initialization_failed >&2
    exit 1
fi
unset TEAM_APP_PASSWORD TEAM_MAINTENANCE_PASSWORD TEAM_BACKUP_PASSWORD
