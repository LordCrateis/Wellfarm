#!/usr/bin/env python3
"""Print a compact summary of a Wellfarm training run without importing Torch."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("run_name", nargs="?", default="efficientnetv2-s-v1")
    args = parser.parse_args()
    run_dir = REPO_ROOT / "models" / "artifacts" / "wellfarm-v1" / args.run_name
    progress_path = run_dir / "progress.json"
    if not progress_path.exists():
        raise SystemExit(f"No run found at {run_dir}")
    progress = json.loads(progress_path.read_text(encoding="utf-8"))
    print(json.dumps({"run_dir": str(run_dir), **progress}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
