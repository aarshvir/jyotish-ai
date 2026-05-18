/**
 * During `next build`, Next sets `NEXT_PHASE=phase-production-build` while loading route
 * modules — even though `NODE_ENV` is `production`. Skip runtime-only env warnings then
 * so Vercel/CI build logs are not flooded with false "CRITICAL" / config noise.
 */
export function isNextProductionBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}
