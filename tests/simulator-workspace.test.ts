import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readWorkspace } from '../src/flight/workspace';

test('simulator workspace restores code and selected block mode from account data', () => {
  const saved = readWorkspace({
    slug: 'grid-hoops', style: 'parduino', editorMode: 'blocks',
    drafts: { 'grid-hoops': 'void setup() { drone.onKey1(fly); }' },
    blockPrograms: { 'grid-hoops': { selectedKey: 1, scripts: { 1: [{ kind: 'command', command: 'move_forward', args: [420] }] } } },
  });
  assert.equal(saved?.editorMode, 'blocks');
  assert.equal(saved?.style, 'parduino');
  assert.equal(saved?.drafts['grid-hoops'], 'void setup() { drone.onKey1(fly); }');
  assert.deepEqual(saved?.blockPrograms['grid-hoops'].scripts[1]?.[0].args, [420]);
});
