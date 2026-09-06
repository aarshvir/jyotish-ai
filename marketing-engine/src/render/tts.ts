import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { envOn, envStr } from '../env';

export interface TtsResult {
  wav: string;
  provider: 'sapi' | 'piper' | 'elevenlabs';
  gender: 'male' | 'female' | 'unknown';
  voiceName: string;
  durationSec: number;
}

function durationOf(wav: string): number {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav], {
    encoding: 'utf8',
    windowsHide: true,
  });
  const n = Number.parseFloat(r.stdout.trim());
  return Number.isFinite(n) ? n : 0;
}

function pickSapiVoice(): { name: string; gender: 'male' | 'female' | 'unknown' } {
  const script = `
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name + '|' + $_.VoiceInfo.Gender }
`;
  const r = spawnSync('powershell', ['-NoProfile', '-Command', script], { encoding: 'utf8', windowsHide: true });
  const lines = (r.stdout || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const parsed = lines.map((l) => {
    const [name, gender] = l.split('|');
    return { name, gender: (gender || '').toLowerCase() };
  });
  const male = parsed.find((v) => v.gender === 'male' && /india|hindi|ravi|heera/i.test(v.name))
    ?? parsed.find((v) => v.gender === 'male');
  if (male?.name) return { name: male.name, gender: 'male' };
  const any = parsed[0];
  return { name: any?.name ?? 'default', gender: any?.gender === 'female' ? 'female' : 'unknown' };
}

export async function speak(text: string, dir: string): Promise<TtsResult> {
  mkdirSync(dir, { recursive: true });
  if (envOn('ELEVENLABS_ENABLED') && envStr('ELEVENLABS_API_KEY') && envStr('ELEVENLABS_VOICE_ID')) {
    throw new Error('ElevenLabs path is implemented as an explicit opt-in later; disable it for the $0 run.');
  }
  const wav = resolve(dir, 'voice.wav');
  const voice = pickSapiVoice();
  if (voice.gender === 'female') {
    throw new Error(`SAPI only offered a female voice (${voice.name}). Refusing. Install a male Windows voice or Piper.`);
  }
  const txt = resolve(tmpdir(), `vh-tts-${Date.now()}.txt`);
  writeFileSync(txt, text, 'utf8');
  const ps = `
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.Rate = -2
$s.Volume = 100
try { $s.SelectVoice('${voice.name.replace(/'/g, "''")}') } catch {}
$s.SetOutputToWaveFile('${wav.replace(/'/g, "''")}')
$s.Speak([System.IO.File]::ReadAllText('${txt.replace(/'/g, "''")}'))
$s.Dispose()
`;
  const r = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8', windowsHide: true, timeout: 60_000 });
  if (r.status !== 0 || !existsSync(wav)) {
    throw new Error(`SAPI TTS failed: ${(r.stderr || r.stdout || '').slice(0, 300)}`);
  }
  return { wav, provider: 'sapi', gender: 'male', voiceName: voice.name, durationSec: durationOf(wav) };
}
