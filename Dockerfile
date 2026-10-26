# ==============================================================================
# FILE: Dockerfile
# SUMMARY
#     Build the frontend and serve it with Python, preserving distribution notices.
# BASIC IDEA
#     Verify notices against actual bundled modules and installed Python versions.
#     Keep application/data originals with their licenses in the runtime image.
# INPUTS / INPUT SOURCES
#     Locked npm modules, Python requirements and reviewed license originals.
# EXPECTED OUTPUT
#     Runtime app with /app/LICENSE, README-LICENSES.md and artifact inventories.
# ==============================================================================
# ---- Stage 1: build the React frontend ------------------------------------
FROM node:22-alpine AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-fund --no-audit
COPY frontend/ ./
COPY LICENSE /build/LICENSE
COPY licenses /build/licenses
RUN node build/distributionNotices.check.mjs && npm run build

# ---- Stage 2: Python runtime serving API + static frontend -----------------
# Native notices are reviewed against this base's actual library versions.
FROM python:3.12-slim@sha256:a0f57064cbdcd6285fa45f51237ab0b35ea8ebaed06a1f5973e89e19dfb86704
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libpq5=17.11-0+deb13u1 && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
COPY backend/constraints-distribution.txt ./
RUN pip install --no-cache-dir -r requirements.txt -c constraints-distribution.txt

COPY LICENSE THIRD_PARTY_NOTICES.md ./
COPY licenses ./licenses
COPY docs/distribution-notices.md ./README-LICENSES.md
COPY scripts/distribution_notices.py ./distribution_notices.py
RUN python distribution_notices.py --inventory licenses/dependency-inventory.json --output notices/python --native-inventory licenses/dependency-inventory.json

COPY backend/app ./app
COPY examples ./examples
COPY --from=frontend /build/frontend/dist ./static

ENV STATIC_DIR=/app/static
# Persisted ontologies live here — mount a volume to keep them across
# container recreations (docker-compose.yml does this automatically).
ENV SEMANTIC_STUDIO_DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
