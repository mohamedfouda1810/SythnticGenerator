#!/usr/bin/env python3
"""
Database migration helper.
Usage:
  python migrate.py upgrade     # Apply all pending migrations
  python migrate.py downgrade   # Rollback last migration
  python migrate.py revision    # Create new migration
  python migrate.py current     # Show current migration
  python migrate.py history     # Show migration history
"""

import sys
import subprocess
import os

commands = {
    "upgrade": ["alembic", "upgrade", "head"],
    "downgrade": ["alembic", "downgrade", "-1"],
    "revision": ["alembic", "revision", "--autogenerate", "-m", "auto_migration"],
    "current": ["alembic", "current"],
    "history": ["alembic", "history"],
}

if len(sys.argv) < 2:
    print("Usage: python migrate.py <command>")
    print(f"Available: {list(commands.keys())}")
    sys.exit(1)

cmd = sys.argv[1]
if cmd not in commands:
    print(f"Unknown command: {cmd}")
    print(f"Available: {list(commands.keys())}")
    sys.exit(1)

print(f"Running: {' '.join(commands[cmd])}")
# Ensure we are in the backend directory or run from it
backend_dir = os.path.dirname(os.path.abspath(__file__))
result = subprocess.run(commands[cmd], cwd=backend_dir)
sys.exit(result.returncode)
