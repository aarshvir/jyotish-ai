/**
 * Dev-only chart preview page. Gated to NODE_ENV !== 'production'.
 * Visit /chart-preview to inspect both North and South Indian charts.
 */
import { redirect } from 'next/navigation';
import { ChartPreviewClient } from './_ChartPreviewClient';

export default function ChartPreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    redirect('/');
  }
  return <ChartPreviewClient />;
}
