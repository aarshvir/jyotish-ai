# Music bed — source and licence

`media/` is gitignored, so **the audio file itself is not in the repo**. This file is, and it is the
record of what the bed is, where it legally came from, and how to reproduce it byte-for-byte.

## The bed in use

| | |
|---|---|
| **File** | `bed-above-the-clouds-cc0-john-bartmann.wav` (46.0s, 48 kHz stereo, −13.1 LUFS, LRA 1.7 LU) |
| **Track** | "Above the Clouds" (`above-the-clouds-master`) |
| **Artist** | John Bartmann |
| **Album** | *100 Ambient Atmospheric Soundtracks: Straylight Drones Collection* |
| **Licence** | **CC0 1.0 Universal (Public Domain Dedication)** — <https://creativecommons.org/publicdomain/zero/1.0/> |
| **Attribution** | **Not required.** CC0 waives all copyright; commercial use, modification and redistribution are unrestricted. Credited here anyway, as a courtesy and as provenance. |
| **Source page** | <https://freemusicarchive.org/music/John_Bartmann/100-ambient-atmospheric-soundtracks-straylight-drones-collection/above-the-clouds-master/> |
| **Collection** | <https://freemusicarchive.org/music/John_Bartmann/100-ambient-atmospheric-soundtracks-straylight-drones-collection> |
| **Artist site** | <https://johnbartmann.com> |
| **Cost** | $0 |

The CC0 dedication is stated on both the collection page and the track page (the track page carries
the `creativecommons.org/publicdomain/zero/1.0/` badge), and the downloaded file's own ID3 tags
carry `artist: John Bartmann` / `comment: https://johnbartmann.com`.

## Why this track, out of 101 in the collection

Chosen on **measurement**, not on vibes — the same way the ad voice was picked. Eight calm
candidates were downloaded and analysed over a 60s window for the two properties that decide
whether a bed fights a voice:

| track | 1–4 kHz energy vs full | loudness range |
|---|---|---|
| **above-the-clouds** | **−20.1 dB** | **4.5 LU** |
| sweet-embrace | −17.1 dB | 4.9 LU |
| innocent-jade | −15.7 dB | 6.1 LU |
| light-particles | −13.7 dB | 2.4 LU |
| riverside-retreat | −13.2 dB | 17.0 LU |
| ethereal-moments | −10.9 dB | 16.3 LU |
| healing-ground | −9.3 dB | 6.8 LU |
| memory-shores | −28.9 dB | 20.5 LU |

1–4 kHz is where speech consonants live, so a bed with little energy there stays out of the voice's
way *spectrally* rather than only by being quiet. A low loudness range means it sits steady instead
of swelling into a line. `above-the-clouds` is the only candidate that is near the top on both:
`memory-shores` is spectrally cleaner but swings 20.5 LU, `light-particles` is steadier but parks
its energy right in the consonant band. It is a sustained low pad — no melody, no percussion, no
vocals, nothing a listener would try to follow.

## Reproducing the file

Download the source MP3 from the track page above, then cut the seamless 46s loop. The loop is made
by crossfading the 3s that *follow* the segment back over its head, so the join is continuous in the
source and `-stream_loop -1` never clicks. Region 140s–189s was chosen because the track's level is
flat to ±0.6 dB there (it fades in over the first ~30s).

```
ffmpeg -y -i above-the-clouds-master.mp3 -vn -filter_complex "
[0:a]atrim=140:186,asetpts=N/SR/TB,aformat=sample_rates=48000:channel_layouts=stereo[a];
[0:a]atrim=186:189,asetpts=N/SR/TB,aformat=sample_rates=48000:channel_layouts=stereo[b];
[b][a]acrossfade=d=3:c1=tri:c2=tri[out]" -map "[out]" -c:a pcm_s16le -ar 48000 -ac 2 \
  media/music/bed-above-the-clouds-cc0-john-bartmann.wav
```

WAV, not MP3, so the trim does not stack a second lossy generation on the source.

## Replacing it

Drop any licence-clean instrumental into this folder and **record its licence and source URL here in
the same detail**. The renderer measures whatever it finds and derives the mix level from that
(`BED` in `src/render/assemble.ts`), so a different bed needs no code change — but an
undocumented one is not licence-clean, and an empty folder now **fails the render loudly**
(`MUSIC_MISSING_MESSAGE`) instead of quietly shipping a silent reel.
