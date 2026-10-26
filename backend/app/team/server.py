"""
================================================================================
FILE: backend/app/team/server.py
SUMMARY
    Single-process team ASGI entry point with fatal-storage supervision.
BASIC IDEA
    Watch the runtime's fatal event independently of authenticated requests.
    Stop uvicorn after ownership loss and let Compose restart a fresh process.
INPUTS / INPUT SOURCES
    The configured FastAPI app and trusted listener settings.
EXPECTED OUTPUT
    Normal ASGI serving or a closed process; never reload/multiple writers.
================================================================================
"""
from __future__ import annotations

import asyncio
import os
import sys


async def serve_team(application=None, *, host='0.0.0.0', port=8000, ssl_keyfile=None, ssl_certfile=None):
    import uvicorn
    if application is None:
        from ..main import app
        application = app
    runtime = getattr(application.state, 'team', None)
    if runtime is None or os.environ.get('WEB_CONCURRENCY', '1') != '1':
        raise ValueError('single_team_process_required')
    server = uvicorn.Server(uvicorn.Config(application, host=host, port=port, workers=1,
                                         reload=False, timeout_graceful_shutdown=5,
                                         access_log=False, proxy_headers=False,
                                         ssl_keyfile=ssl_keyfile, ssl_certfile=ssl_certfile))
    serving = asyncio.create_task(server.serve())
    try:
        while not serving.done():
            if runtime.fatal.is_set():
                server.should_exit = True
                break
            await asyncio.wait({serving}, timeout=0.1)
        await serving
    finally:
        server.should_exit = True
        if not serving.done():
            await serving


def main():
    if len(sys.argv) != 1:
        raise SystemExit('team_server_arguments_invalid')
    asyncio.run(serve_team())


if __name__ == '__main__':
    main()
