/*
================================================================================
FILE: frontend/build/distributionNotices.mjs
SUMMARY
    Preserve licenses for packages actually included in production chunks.
BASIC IDEA
    Read Rollup's output module graph and the resolved package metadata. Fail
    closed on unknown versions or incomplete notices, emit original bytes and
    a runtime inventory without machine-local paths. Dev dependencies are not
    inferred from package.json: only emitted module identities select packages.
INPUTS / INPUT SOURCES
    Bundled modules, installed package metadata and the pinned notice inventory.
EXPECTED OUTPUT
    LICENSE, THIRD_PARTY_NOTICES.md, runtime-components.json and original texts.
================================================================================
*/
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const collected = new Set(['text-collected','project-text-collected','upstream-text-collected']);
function packageOwner(id) {
  const file = id.split('?')[0];
  if (file.startsWith('\0') || !file.replaceAll('\\','/').includes('/node_modules/')) return null;
  for (let folder=dirname(file);folder!==dirname(folder);folder=dirname(folder)) {
    const metadata = join(folder,'package.json');
    if (!existsSync(metadata)) continue;
    const pkg = JSON.parse(readFileSync(metadata,'utf8'));
    if (typeof pkg.name==='string' && typeof pkg.version==='string') {
      return {name:pkg.name,version:pkg.version,folder,module:relative(folder,file).replaceAll('\\','/')};
    }
  }
  throw new Error(`Bundled dependency has no package metadata: ${id}`);
}
function generatedName(id, root) {
  if (!id.startsWith('\0')) return null;
  const name = id.slice(1).replaceAll('\\','/');
  if (!(name.startsWith('vite/') || name.startsWith('__vite-browser-external') || name==='commonjsHelpers.js' || /\?commonjs-[a-z-]+$/.test(name))) {
    throw new Error('Unclassified generated runtime module');
  }
  // CommonJS wrapper ids can contain the developer's absolute module path.
  // Package-relative names retain evidence without publishing that local path.
  if (name.includes('/node_modules/')) return 'node_modules/'+name.split('/node_modules/').at(-1);
  if (name.startsWith('/') || /^[a-z]:\//i.test(name)) {
    const [file, query] = name.split('?');
    const local = relative(root,file).replaceAll('\\','/');
    if (local.startsWith('../')) throw new Error('Unclassified generated runtime module location');
    return local+(query?'?'+query:'');
  }
  return name;
}

export function distributionNotices(root) {
  root = resolve(root);
  return {
    name:'distribution-notices',
    generateBundle(_options, bundle) {
      const inventory = JSON.parse(readFileSync(join(root,'licenses/dependency-inventory.json'),'utf8'));
      const known = new Map(inventory.components.filter(c => c.ecosystem==='npm').map(c => [`${c.name}@${c.version}`,c]));
      const selected = new Map(), generated = new Set();
      const record = (pkg, modules=[pkg.module], role) => {
        const key = `${pkg.name}@${pkg.version}`, component = known.get(key);
        if (!component) throw new Error(`No collected notices for bundled ${key}`);
        if (!collected.has(component.status) || !component.notices?.length) {
          throw new Error(`Bundled ${key}: ${component.status} license notices`);
        }
        if (!selected.has(key)) selected.set(key,{...component,modules:new Set()});
        const held=selected.get(key);
        for (const module of modules) held.modules.add(module);
        if(role) held.role=role;
        for (const notice of component.notices) {
          const installed = join(pkg.folder,notice.original_path);
          if (existsSync(installed) && hash(readFileSync(installed))!==notice.sha256) {
            throw new Error(`Installed notice differs for bundled ${key}`);
          }
        }
      };
      for (const chunk of Object.values(bundle)) {
        if (chunk.type!=='chunk') continue;
        for (const id of Object.keys(chunk.modules)) {
          const helper=generatedName(id,root);
          if(helper!==null) {generated.add(helper);continue;}
          const pkg=packageOwner(id);
          if(pkg) record(pkg);
        }
      }
      if(generated.size) {
        // Vite inserts preload/polyfill code and its bundled CommonJS plugin's
        // bridges. Its original LICENSE includes those plugin notices too.
        const provider=packageOwner(join(root,'frontend/node_modules/vite/package.json'));
        record(provider,generated,'generated runtime helpers');
      }
      const components = [...selected.values()].sort((a,b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version))
        .map(component => ({...component,modules:[...component.modules].sort()}));
      const assets = new Map([['LICENSE',readFileSync(join(root,'LICENSE'))]]);
      for (const component of components) for (const notice of component.notices) {
        if (!/^licenses\/texts\/[a-f0-9]{64}\.txt$/.test(notice.text)) throw new Error('Invalid notice asset path');
        const bytes = readFileSync(join(root,notice.text));
        if (hash(bytes)!==notice.sha256) throw new Error(`Notice hash differs for ${component.name}@${component.version}`);
        assets.set(notice.text,bytes);
      }
      assets.set('runtime-components.json',JSON.stringify({basis:'Actual modules in emitted production chunks; original package notices retained.',components},null,2)+'\n');
      assets.set('THIRD_PARTY_NOTICES.md',[
        '# Semantic Studio production frontend notices',
        '', 'Semantic Studio is distributed under the original [MIT License](LICENSE).',
        'These third-party licenses apply independently. This inventory follows the actual bundled modules.', '',
        ...components.flatMap(component => [`## ${component.name} ${component.version}`, '',
          `License: ${component.license}. Source: ${component.source}`, '',
          ...component.notices.map(notice => `- [Original notice](${notice.text}) (SHA-256 ${notice.sha256})`), '']),
      ].join('\n'));
      for (const [fileName,source] of assets) this.emitFile({type:'asset',fileName,source});
    },
  };
}
