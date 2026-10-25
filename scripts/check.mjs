import {readFile, readdir} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const manifest=JSON.parse(await readFile(resolve(root,'extension/manifest.json'),'utf8'));
const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
assert.equal(manifest.manifest_version,3);
assert.equal(manifest.version,pkg.version);
assert.deepEqual(manifest.permissions.sort(),['activeTab','clipboardWrite','downloads','scripting'].sort());
assert.equal(manifest.host_permissions,undefined);
assert.equal(manifest.background,undefined);
const html=await readFile(resolve(root,'extension',manifest.action.default_popup),'utf8');
assert.ok(html.includes('id="status"') && html.includes('id="items"') && html.includes('id="scan"'));
for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
 assert.ok(!/^(?:https?:)?\/\//.test(match[1]),'Runtime references must be local');
 await readFile(resolve(root,'extension',match[1]));
}
for(const dir of ['extension','scripts','qa','tests']) {
 for(const file of await readdir(resolve(root,dir))) {
  if(!/\.(m?js)$/.test(file))continue;
  const absolute=resolve(root,dir,file);
  const result=spawnSync(process.execPath,['--check',absolute],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  if(dir==='extension') {
   const source=await readFile(absolute,'utf8');
   for(const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    assert.ok(match[1].startsWith('./'),'Runtime imports must be bundled');
    await readFile(resolve(dirname(absolute),match[1]));
   }
   assert.ok(!/\b(?:eval|new Function)\s*\(/.test(source),'No dynamic code execution');
  }
 }
}
console.log('PASS: MV3 manifest, version, permissions, HTML/module references and all JavaScript syntax.');
