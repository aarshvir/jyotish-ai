import { describe, expect, it } from 'vitest';
import { decideFreeReportClaim } from './freeReportGate';

describe('decideFreeReportClaim', () => {
  it('allows when this is the only free report', () => {
    expect(
      decideFreeReportClaim({
        reportId: 'r1',
        freeReportIdsOldestFirst: ['r1'],
      }),
    ).toBe('allow');
  });

  it('allows when there are no free rows yet (pre-upsert / empty read)', () => {
    expect(
      decideFreeReportClaim({
        reportId: 'r1',
        freeReportIdsOldestFirst: [],
      }),
    ).toBe('allow');
  });

  it('allows the oldest report when two free rows race', () => {
    expect(
      decideFreeReportClaim({
        reportId: 'older',
        freeReportIdsOldestFirst: ['older', 'newer'],
      }),
    ).toBe('allow');
  });

  it('blocks the newer report when two free rows race', () => {
    expect(
      decideFreeReportClaim({
        reportId: 'newer',
        freeReportIdsOldestFirst: ['older', 'newer'],
      }),
    ).toBe('limit_reached');
  });

  it('blocks a third concurrent free report', () => {
    expect(
      decideFreeReportClaim({
        reportId: 'r3',
        freeReportIdsOldestFirst: ['r1', 'r2', 'r3'],
      }),
    ).toBe('limit_reached');
  });
});
