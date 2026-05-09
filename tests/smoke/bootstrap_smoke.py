"""Phase 0 smoke gate, Python edition."""

import asyncio
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env.local")
load_dotenv(ROOT / ".env")

from server.agent.bootstrap import run_bootstrap  # noqa: E402

PROMPTS = [
    "I'm training for the Boston marathon in October, I run 4 times a week",
    "Plan my Japan honeymoon, two weeks, Tokyo and Kyoto",
    "Track my software engineering job applications",
]


async def main() -> int:
    if "GEMINI_API_KEY" not in os.environ:
        print("GEMINI_API_KEY missing")
        return 1

    model = os.environ.get("GEMINI_MODEL", "gemini-3-flash-preview")
    print(f"Using model: {model}")

    passed = 0
    for p in PROMPTS:
        print(f'\n→ Prompt: "{p}"')
        t0 = time.time()
        try:
            r = await run_bootstrap(p)
        except Exception as e:
            print(f"❌ Threw: {type(e).__name__}: {e}")
            continue
        dt = int((time.time() - t0) * 1000)
        tools = ", ".join(t.name for t in r.tools)
        print(f"  ✅ name={r.name} icon={r.icon} appType={r.appType} ({dt}ms)")
        print(
            f"     root widget={r.tree.type} tools=[{tools}] data keys=[{', '.join(r.data.keys())}]"
        )
        passed += 1

    print(f"\n{passed}/{len(PROMPTS)} prompts passed")
    return 0 if passed == len(PROMPTS) else 2


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
