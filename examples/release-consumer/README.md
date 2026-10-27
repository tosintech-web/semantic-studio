# Pinned dictionary consumer / 版を固定する利用サンプル

A minimal independent example for the local P3 distribution service. It verifies
all public files, preserves separate IRIs with the same name, and searches RDF
names without connecting to the editor or PostgreSQL.

`RELEASE_ORIGIN` is an operator-fixed HTTP(S) origin. Redirects, environment
proxies and arbitrary user-supplied URLs are disabled. `RELEASE_ID` is required;
the consumer never silently follows `current.json`.

Start it with `docker-compose.releases.yml`; see
[the local operations guide](../../docs/p3-local-operations.md).
The page supports Japanese and English. Read errors retain an already accepted
version; a fresh process must obtain the pinned files again from distribution.
The total acquisition deadline is 15 seconds with at most one outstanding worker.
An unfinished timed-out request prevents additional workers until it exits.

This example has its own narrowly bounded transport. The editor's broker and
private-address restrictions remain unchanged. Only synthetic data is used in
acceptance; this example does not authorize publishing business data.
