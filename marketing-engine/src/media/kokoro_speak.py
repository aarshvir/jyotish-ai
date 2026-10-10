#!/usr/bin/env python3
"""Neural male voice for the reel. Kokoro only. No formant fallback."""

import json
import sys
from pathlib import Path

import soundfile as sf
from kokoro_onnx import Kokoro


def main() -> None:
    job = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    root = Path(job["model_dir"])
    model = root / "kokoro-v1.0.onnx"
    voices = root / "voices-v1.0.bin"
    if not model.is_file() or not voices.is_file():
        raise SystemExit(f"Kokoro weights missing in {root}")
    kokoro = Kokoro(str(model), str(voices))
    voice = job.get("voice", "am_michael")
    speed = float(job.get("speed", 1.0))
    lang = job.get("lang", "en-us")
    for item in job["lines"]:
        samples, sample_rate = kokoro.create(item["text"], voice=voice, speed=speed, lang=lang)
        sf.write(item["out"], samples, sample_rate)


if __name__ == "__main__":
    main()
