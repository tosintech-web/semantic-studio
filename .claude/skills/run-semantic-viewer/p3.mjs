/*
FILE: .claude/skills/run-semantic-viewer/p3.mjs
SUMMARY
    Real signed-HTTPS release review and independent Docker distribution.
BASIC IDEA
    Reuse P2's real auth/DB fixture; approve in the actual UI, then stop the
    editor and DB before starting a fresh consumer on the public volume.
INPUTS / INPUT SOURCES
    Built product image, synthetic RDF and disposable Compose projects.
EXPECTED OUTPUT
    Reviewed immutable versions, rollback, keyboard/AX and isolated reference.
*/
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {runP2} from './p2.mjs';

export async function runP3(options){
 await runP2({...options,acceptRelease:async({browser,other,inApi,docker,stopEditor})=>{
  const {ROOT,DATA_DIR,log,sleep}=options;
  const metadata={source:'Synthetic P3 fixture',license:'CC0 synthetic data only'};
  const created=await inApi(browser,'POST','/api/projects',{name:'P3 synthetic release',template:'empty'});
  assert.equal(created.status,200);const pid=created.body.id;
  const source=label=>`@prefix skos: <http://www.w3.org/2004/02/skos/core#> . @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> . <urn:p3:dog> skos:prefLabel "${label}"@ja ; rdfs:comment "P3_PRIVATE_DO_NOT_DISTRIBUTE" . <urn:p3:dog2> skos:prefLabel "犬"@ja .`;
  assert.equal((await inApi(browser,'PUT',`/api/projects/${pid}/documents/model/source`,{text:source('犬')})).status,200);
  const preview=await inApi(browser,'POST',`/api/projects/${pid}/release-preview`,metadata);assert.equal(preview.status,200);
  assert.equal((await inApi(other,'POST',`/api/projects/${pid}/release-preview`,metadata)).status,403);
  const remove=browser.on('Page.javascriptDialogOpening',event=>{if(event.type==='beforeunload')void browser.send('Page.handleJavaScriptDialog',{accept:true});});
  try{await browser.goto(`https://127.0.0.1:${process.env.TEAM_PORT||8011}`);}finally{remove();}
  await browser.waitFor('document.querySelector(".team-account")');
  await browser.waitFor('Array.from(document.querySelectorAll(".project-card")).some(card=>card.textContent.includes("P3 synthetic release"))');
  await browser.eval('Array.from(document.querySelectorAll(".project-card")).find(card=>card.textContent.includes("P3 synthetic release")).setAttribute("data-p3-card","true")');
  await browser.click('[data-p3-card] .onto-verbs button.primary');
  await browser.waitFor('document.querySelector(".project-header")');
  await browser.clickText('.project-header button','Reviewed versions');
  await browser.waitFor('document.querySelector(".release-panel")');
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.equal(await browser.eval('document.activeElement===document.querySelector(".release-panel input:not([type=checkbox])")&&document.activeElement.matches(":focus-visible")&&parseFloat(getComputedStyle(document.activeElement).outlineWidth)>0'),true,'native Tab and visible focus');
  await browser.type('.release-panel input:not([type="checkbox"])',metadata.source);
  await browser.type('.release-panel textarea',metadata.license);
  await browser.clickText('.release-panel button','Create preview');
  await browser.waitFor('document.querySelector(".release-panel section")?.querySelector("input[type=checkbox]")');
  await browser.select('.ui-language-select select','ja');
  assert.ok((await browser.eval('document.querySelector(".release-panel").textContent')).includes('2項目'));
  assert.equal(await browser.eval('document.querySelector(".release-panel input:not([type=checkbox])").value'),metadata.source);
  await browser.select('.ui-language-select select','en');
  assert.equal(await browser.eval('getComputedStyle(document.querySelector(".release-panel")).whiteSpace==="normal"&&document.querySelector(".release-panel").scrollWidth<=document.querySelector(".release-panel").clientWidth+1'),true,'review prose wraps without horizontal scrolling');
  const ax=(await browser.send('Accessibility.getFullAXTree')).nodes;
  assert.ok(ax.some(n=>n.role?.value==='dialog'&&n.name?.value==='Reviewed versions'));
  await browser.click('.release-panel input[type="checkbox"]');
  await browser.clickText('.release-panel button','Approve version');
  await browser.waitFor('document.querySelector(".release-panel [role=status]").textContent.includes("Version approved")');
  await browser.shot('p3-approved');
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await browser.waitFor('!document.querySelector(".release-panel")');
  assert.equal(await browser.eval('document.activeElement?.textContent==="Reviewed versions"'),true,'modal restores opener focus');
  log('p3-review-ui','Japanese/English preview, native Tab, focus, AX and actual UI approval passed');
  const listing=await inApi(browser,'GET',`/api/projects/${pid}/releases`);assert.equal(listing.body.total,1);const v1=listing.body.items[0].releaseId;
  const bytes=async rid=>browser.eval(`(async()=>{const r=await fetch('/api/projects/${pid}/releases/${rid}/package');if(!r.ok)throw Error('download');return btoa(Array.from(new Uint8Array(await r.arrayBuffer()),c=>String.fromCharCode(c)).join(''));})()`);
  const original=await bytes(v1);
  const stale=await inApi(browser,'POST',`/api/projects/${pid}/release-preview`,metadata);
  assert.equal((await inApi(browser,'PUT',`/api/projects/${pid}/documents/model/source`,{text:source('合成の犬')})).status,200);
  assert.equal((await inApi(browser,'POST',`/api/projects/${pid}/releases`,{...metadata,previewDigest:stale.body.previewDigest})).status,409);
  const fresh=await inApi(browser,'POST',`/api/projects/${pid}/release-preview`,metadata);
  const second=await inApi(browser,'POST',`/api/projects/${pid}/releases`,{...metadata,previewDigest:fresh.body.previewDigest},fresh.body.basis.resourceVersions,'p3-approve-v2');
  assert.equal(second.status,201);const v2=second.body.releaseId;assert.equal(await bytes(v1),original);
  const directory=join(DATA_DIR,'release-input');mkdirSync(directory,{recursive:true});
  writeFileSync(join(directory,'v1.zip'),Buffer.from(original,'base64'));writeFileSync(join(directory,'v2.zip'),Buffer.from(await bytes(v2),'base64'));
  const env={...process.env,COMPOSE_PROJECT_NAME:'ss-p3-public-'+Date.now(),RELEASE_INPUT_DIR:directory,RELEASE_ID:v1,RELEASE_PORT:'18080',RELEASE_CONSUMER_PORT:'18081'};
  const compose=args=>{const r=spawnSync('docker',['compose','-f','docker-compose.releases.yml',...args],{cwd:ROOT,env,encoding:'utf8',timeout:120000});assert.equal(r.status,0,'isolated P3 Compose: '+r.stderr.slice(-800));return r.stdout;};
  const cli=args=>JSON.parse(compose(['run','--rm','--no-deps','-T','release-import',...args]));
  const wait=async()=>{for(let n=0;n<100;n++){try{const r=await fetch('http://127.0.0.1:18081/api/search?q='+encodeURIComponent('犬'));if(r.ok)return await r.json();}catch{}await sleep(200);}throw Error('pinned consumer unavailable');};
  try{
   cli(['import-package','--package','/input/v1.zip']);cli(['import-package','--package','/input/v2.zip']);cli(['activate','--release-id',v2]);cli(['activate','--release-id',v1]);
   compose(['up','-d','--no-build','release-distribution','release-consumer']);
   let result=await wait();assert.equal(result.releaseId,v1);assert.equal(result.total,2);assert.ok(!JSON.stringify(result).includes('P3_PRIVATE'));
   assert.equal((await (await fetch('http://127.0.0.1:18080/current.json')).json()).releaseId,v1);
   const config=JSON.parse(compose(['config','--format','json']));
   assert.deepEqual(Object.keys(config.services['release-consumer'].networks).sort(),['release_host','release_internal']);
   assert.equal(config.services['release-consumer'].environment.RELEASE_ORIGIN,'http://release-files:8080');
   assert.equal(config.services['release-distribution'].volumes[0].read_only,true);assert.ok(!config.services['release-distribution'].secrets);
   await stopEditor();docker(['stop','db']);
   compose(['up','-d','--no-build','--force-recreate','release-consumer']);result=await wait();
   assert.equal(result.releaseId,v1);assert.equal(result.total,2);cli(['activate','--release-id',v2]);cli(['activate','--release-id',v1]);
   log('p3-independent','fresh consumer verified pinned files after editor and DB stopped; rollback retained both versions');
   const leave=browser.on('Page.javascriptDialogOpening',event=>{if(event.type==='beforeunload')void browser.send('Page.handleJavaScriptDialog',{accept:true});});
   try{await browser.goto('http://127.0.0.1:18081');}finally{leave();}
   await browser.waitFor('document.querySelectorAll("#results li").length===2');await browser.shot('p3-consumer');
  }catch(error){console.error('[p3-distribution-diagnostic]',compose(['logs','--no-color','release-distribution','release-consumer']).slice(-2500));throw error;}finally{compose(['down','--remove-orphans']);}
  log('p3','ALL STEPS PASSED (local Docker, synthetic data only)');
 }});
}
