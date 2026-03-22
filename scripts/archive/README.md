# Archived development tools (historical record)

These scripts powered **local** autonomous calibration / QA loops. They are **not** used by the production app.

| File | Role |
|------|------|
| `run-loop.ps1` | Main improvement loop (agents A–D, orchestrator) |
| `run-loop-infinite.ps1` | Re-runs the loop until `scripts/COMPLETE.txt` exists |
| `run-loop.bat` | Windows launcher for the loop |
| `auto-calibrate.py` | Ephemeris calibration helper |
| `agent-a-score-validator.py` … `agent-d-verify.py` | Loop validators |
| `orchestrator.js` | Playwright report generation for the loop |

**Optional re-run** (from repo root):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\archive\run-loop.ps1
```

Logs and outputs still go under `scripts/` (e.g. `agent-log.txt`).
