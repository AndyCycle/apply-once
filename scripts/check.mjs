import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=new URL('../extension/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
assert.equal(manifest.manifest_version,3);assert.equal(manifest.host_permissions,undefined);
for(const file of readdirSync(root)){if(file.endsWith('.js'))execFileSync(process.execPath,['--check',fileURLToPath(new URL(file,root))]);}
const js=readdirSync(root).filter(x=>x.endsWith('.js')).map(f=>readFileSync(new URL(f,root),'utf8')).join('\n');
assert.ok(!/XMLHttpRequest|storage\.sync|\.submit\s*\(|\.requestSubmit\s*\(/.test(js));
assert.ok(!/\.innerHTML\s*=/.test(js));
console.log('Manifest, JavaScript syntax, network/submission boundaries passed.');
