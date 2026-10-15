import {mkdir,cp} from 'node:fs/promises';
const output=new URL('../dist/apply-once/',import.meta.url);
await mkdir(output,{recursive:true});
await cp(new URL('../extension/',import.meta.url),output,{recursive:true});
await cp(new URL('../README.md',import.meta.url),new URL('../dist/README.md',import.meta.url));
await cp(new URL('../LICENSE',import.meta.url),new URL('../dist/LICENSE',import.meta.url));
await cp(new URL('../docs/',import.meta.url),new URL('../dist/docs/',import.meta.url),{recursive:true});
console.log('Packaged extension into dist/apply-once. Load this directory in Chrome.');
