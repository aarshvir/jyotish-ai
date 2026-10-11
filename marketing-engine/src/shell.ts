import { spawn } from 'node:child_process';

export function run(cmd: string, args: string[], opts: { cwd?: string } = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: opts.cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => {
      err += d.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exit ${code}: ${err.slice(-500)}`));
    });
  });
}

/** ffmpeg often prints the useful line on stderr and exits 0. Never throws. */
export function runCapture(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let blob = '';
    child.stdout.on('data', (d) => {
      blob += d.toString();
    });
    child.stderr.on('data', (d) => {
      blob += d.toString();
    });
    child.on('error', () => resolve(blob));
    child.on('close', () => resolve(blob));
  });
}

export function capture(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => {
      out += d.toString();
    });
    child.stderr.on('data', (d) => {
      err += d.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(out + err);
      else reject(new Error(`${cmd} exit ${code}: ${err.slice(-400)}`));
    });
  });
}
