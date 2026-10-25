// @vitest-environment jsdom
/*
================================================================================
FILE: frontend/src/components/EntityList.budget.test.tsx
SUMMARY
    Dictionary response-to-interaction budgets with bounded visible rows.
BASIC IDEA
    Resolve controlled pages for three true totals, then click a real rendered
    row. Use seven timed samples after warm-up; data generation and waiting for
    the response are outside the interval. Real layout is checked by the driver.
INPUTS / INPUT SOURCES
    Fifty synthetic long names, actual EntityList and a deferred API response.
EXPECTED OUTPUT
    Honest totals, at most fifty data rows and an interactive page within 500ms.
================================================================================
*/
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { limitMs } from '../budget';
import type { EntityPage } from '../entities/types';
import EntityList from './EntityList';
const { getEntities } = vi.hoisted(() => ({getEntities:vi.fn()}));
vi.mock('../api', () => ({getEntities}));
afterEach(() => { cleanup(); getEntities.mockReset(); });

it.each([1000,10000,40000])('[budget] makes a 50-row page interactive within 500ms for %i entries', async total => {
  const samples:number[] = [];
  const data:EntityPage = {total,offset:0,limit:50,revision:'synthetic',items:Array.from({length:50},(_,number) => ({
    iri:`https://example.org/budget/${number}`,label:`${number}`+'合成辞書項目'.repeat(40).slice(0,190),kind:'class',
    description:'合成説明'.repeat(30),match:null,label_language:'ja',label_fallback:false,label_truncated:false,reference_only:false,
  }))};
  for (let sample=0;sample<8;sample++) {
    let resolve!:(page:EntityPage) => void;
    getEntities.mockReturnValueOnce(new Promise<EntityPage>(done => {resolve=done;}));
    const onSelect = vi.fn();
    render(<EntityList ontologyId={`synthetic-${total}-${sample}`} language="ja" imports={false} revision={1}
      viewGeneration="0" initialQuery="" onSelect={onSelect} />);
    const started = performance.now();
    await act(async () => { resolve(data); });
    const rows = document.querySelectorAll('.entity-list tbody tr');
    expect(rows).toHaveLength(50);
    const button = rows[0].querySelector('button')!;
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith(data.items[0].iri);
    const elapsed = performance.now()-started;
    expect(screen.getByRole('status').textContent).toContain(total.toLocaleString('en'));
    if (sample) samples.push(elapsed);
    cleanup();
  }
  samples.sort((a,b) => a-b);
  console.log(`P1 entries=${total}: response-to-click median=${samples[3].toFixed(2)}ms, data rows=50`);
  expect(samples[3]).toBeLessThanOrEqual(limitMs(500));
});
