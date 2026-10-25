/*
================================================================================
FILE: frontend/build/distributionNotices.check.mjs
SUMMARY
    Build-artifact notices follow the actual bundled package modules.
BASIC IDEA
    Drive the Rollup output hook with installed module identities, verify the
    emitted original bytes, and refuse unconfirmed or mismatched packages.
INPUTS / INPUT SOURCES
    Synthetic chunk records, installed package metadata and the notice inventory.
EXPECTED OUTPUT
    Runtime-only module evidence, complete original notices and fail-closed builds.
================================================================================
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { distributionNotices } from './distributionNotices.mjs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
function build(ids) {
  const emitted = new Map();
  const plugin = distributionNotices(ROOT);
  plugin.generateBundle.call({emitFile: asset => emitted.set(asset.fileName, asset.source)}, {}, {
    'app.js': {type:'chunk',modules:Object.fromEntries(ids.map(id => [id, {}]))},
  });
  return emitted;
}
test('ships original MIT and bundled runtime package notices without local absolute paths', () => {
  const files = build([join(ROOT,'frontend/node_modules/react/index.js'), join(ROOT,'frontend/src/main.tsx')]);
  assert.deepEqual(Buffer.from(files.get('LICENSE')), readFileSync(join(ROOT,'LICENSE')));
  const serialized = String(files.get('runtime-components.json'));
  assert.ok(!serialized.includes(ROOT));
  const inventory = JSON.parse(serialized);
  assert.deepEqual(inventory.components.map(component => component.name), ['react']);
  assert.ok(inventory.components[0].modules.includes('index.js'));
  for (const component of inventory.components) {
    for (const notice of component.notices) {
      assert.equal(createHash('sha256').update(files.get(notice.text)).digest('hex'), notice.sha256);
    }
  }
  assert.match(String(files.get('THIRD_PARTY_NOTICES.md')), /react/);
  assert.ok(!serialized.includes('stackback'));
});
test('refuses bundled dependencies with an unconfirmed main license', () => {
  assert.throws(() => build([join(ROOT,'frontend/node_modules/stackback/index.js')]), /stackback.*unconfirmed/i);
});
test('refuses a resolved version absent from the notice inventory', () => {
  const temp = mkdtempSync(join(tmpdir(),'p1-license-version-'));
  try {
    const packageDir = join(temp,'node_modules/react'); mkdirSync(packageDir,{recursive:true});
    writeFileSync(join(packageDir,'package.json'), JSON.stringify({name:'react',version:'0.0.0'}));
    assert.throws(() => build([join(packageDir,'index.js')]), /react.*0\.0\.0/);
  } finally { rmSync(temp,{recursive:true,force:true}); }
});

test('includes the tool notices for helper code inserted into runtime chunks', () => {
  const files = build(['\0vite/modulepreload-polyfill.js','\0commonjsHelpers.js']);
  const inventory = JSON.parse(String(files.get('runtime-components.json')));
  const helper = inventory.components.find(component=>component.name==='vite');
  assert.ok(helper, 'Vite-generated runtime code needs its original notices');
  assert.equal(helper.role,'generated runtime helpers');
  assert.ok(helper.modules.includes('vite/modulepreload-polyfill.js'));
  assert.ok(helper.notices.every(notice=>files.has(notice.text)));
});
test('refuses an unclassified generated runtime module', () => {
  assert.throws(()=>build(['\0future/generated-helper.js']),/unclassified generated/i);
});
