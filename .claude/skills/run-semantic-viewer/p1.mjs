/*
================================================================================
FILE: .claude/skills/run-semantic-viewer/p1.mjs
SUMMARY
    Real-browser acceptance for the Japanese dictionary workspace.
BASIC IDEA
    Use the harness's own scratch server and Chrome profile with generated data.
    Assert real IME/network behavior, keyboard/AX state, bounded pages, language
    independence, same-name identity and project edit/undo/save/reload through UI.
INPUTS / INPUT SOURCES
    Injected harness operations and independently generated synthetic RDF only.
EXPECTED OUTPUT
    Assertions, measured response-to-click time and screenshots; no publication.
================================================================================
*/
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { limitMs } from '../../../frontend/src/budget.ts';

export async function runP1({ROOT,DATA_DIR,BASE,Browser,api,uploadOntology,startServer,stopServer,waitForHealth,pythonExe,log,sleep}) {
  const server = startServer();
  let browser;
  try {
    assert.ok(await waitForHealth(), 'scratch backend health');
    const generated = spawnSync(pythonExe(),['-c','from tests.synthetic_dictionary import build_synthetic_organizations; print(build_synthetic_organizations().serialize(format="turtle"))'],
      {cwd:join(ROOT,'backend'),encoding:'utf8',maxBuffer:32*1024*1024,env:{...process.env,SEMANTIC_STUDIO_DATA_DIR:DATA_DIR}});
    assert.equal(generated.status,0,'synthetic generator');
    const file = join(DATA_DIR,'p1-synthetic.ttl'); writeFileSync(file,generated.stdout);
    const loaded = await uploadOntology(file);
    const dogs = await api('GET',`/api/ontologies/${loaded.id}/search?q=${encodeURIComponent('犬')}&lang=ja`);
    assert.equal(dogs.body.length,2,'two independently identifiable meanings');
    const projectName = 'P1 synthetic project';
    const created = await api('POST','/api/projects',{name:projectName,template:'empty',primaryLanguage:'ja',baseIri:'https://example.org/p1-browser/',prefix:'p1'});
    assert.ok(created.ok); const pid=created.body.id;
    assert.ok((await api('POST',`/api/projects/${pid}/open`)).ok);
    assert.ok((await api('PATCH',`/api/projects/${pid}`,{languages:['en']})).ok);
    const model = '@prefix ex: <https://example.org/p1-browser/> .\n@prefix owl: <http://www.w3.org/2002/07/owl#> .\n@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\nex:Dog a owl:Class; rdfs:label "犬"@ja, "Dog"@en .\n';
    assert.ok((await api('PUT',`/api/projects/${pid}/documents/model/source`,{text:model})).ok);
    assert.ok((await api('POST',`/api/projects/${pid}/documents/model/save`,{confirmRewrite:true})).ok);
    assert.ok((await api('POST',`/api/projects/${pid}/close`,{discard:false})).ok);
    browser=await Browser.launch(); await browser.send('Network.enable');
    let searchRequests=0,entityResponseAt=null;
    browser.on('Network.requestWillBeSent',event=>{if(new URL(event.request.url).pathname.endsWith('/search')) searchRequests++;});
    browser.on('Network.responseReceived',event=>{if(new URL(event.response.url).pathname.endsWith('/entities')) entityResponseAt=performance.now();});
    const key = async (name,code=name,modifiers=0) => {
      await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:name,code,modifiers,...(name==='Enter'?{text:'\r',windowsVirtualKeyCode:13}:{})});
      await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:name,code,modifiers});
    };
    const chooseCard = async (name,index) => {
      await browser.waitFor(`Array.from(document.querySelectorAll('.onto-card')).some(card=>card.textContent.includes(${JSON.stringify(name)}))`);
      await browser.eval(`Array.from(document.querySelectorAll('.onto-card')).find(card=>card.textContent.includes(${JSON.stringify(name)})).id='p1-target-card'`);
      await browser.click(`#p1-target-card .onto-verbs button:nth-child(${index})`);
    };
    const ui = async language => {
      await browser.select('.ui-language-select select',language);
      await browser.waitFor(`document.documentElement.lang===${JSON.stringify(language)}`);
    };
    const dictionary = async language => {
      await browser.type('.dictionary-language-select input',language);
      await browser.click('.dictionary-language-select button');
      await browser.waitFor(`document.querySelector('.dictionary-language-select input').value===${JSON.stringify(language)}`);
    };
    await browser.goto(BASE); await browser.waitFor('document.querySelector(".home-screen")');
    assert.equal(await browser.eval('document.documentElement.lang'),'ja','Japanese default');
    await chooseCard(loaded.name,1);
    await browser.waitFor('document.querySelector(".search-box input")');
    await browser.click('.search-box input'); const before=searchRequests;
    await browser.send('Input.imeSetComposition',{text:'犬',selectionStart:1,selectionEnd:1});
    await sleep(450); assert.equal(searchRequests,before,'no search during IME composition');
    await browser.send('Input.insertText',{text:'犬'});
    await browser.waitFor('document.querySelectorAll(".search-options [role=option]").length===2');
    assert.equal(searchRequests,before+1,'one debounced one-character search');
    await key('ArrowDown'); await key('ArrowDown');
    assert.equal(await browser.eval('document.querySelector(".search-box input").getAttribute("aria-activedescendant")'),'search-result-1');
    await key('Enter'); await browser.waitFor('document.querySelector(".detail-iri")');
    assert.ok((await browser.eval('document.querySelector(".detail-iri").textContent')).includes(dogs.body[1].id));
    log('p1-ime','real IME/one-character search and keyboard selection passed');
    entityResponseAt=null; await browser.clickNav('項目一覧');
    await browser.waitFor('document.querySelectorAll(".entity-list tbody tr").length===50',20000,'50 rows',20);
    const interactionSamples=[];
    for(let sample=0;sample<8;sample++) {
      if(sample) {
        const old=await browser.eval('document.querySelector(".entity-list tbody code").textContent');
        entityResponseAt=null;
        await browser.click(`.entity-list-pages button:${sample%2?'last':'first'}-child`);
        await browser.waitFor(`document.querySelector('.entity-list tbody code')?.textContent!==${JSON.stringify(old)} && document.querySelectorAll('.entity-list tbody tr').length===50`,20000,'fresh page',20);
      }
      assert.notEqual(entityResponseAt,null);
      const selected=await browser.eval('document.querySelector(".entity-list tbody code").textContent');
      await browser.click('.entity-open');
      await browser.waitFor(`document.querySelector('.entity-list tr[aria-selected=true] code')?.textContent===${JSON.stringify(selected)}`,10000,'row selection',20);
      const elapsed=performance.now()-entityResponseAt;
      if(sample) interactionSamples.push(elapsed);
    }
    interactionSamples.sort((a,b)=>a-b);
    const interactiveMs=interactionSamples[3];
    assert.ok(interactiveMs<=limitMs(500),`response-to-click median ${interactiveMs.toFixed(2)}ms exceeds budget`);
    await browser.eval('document.querySelector(".entity-list input").focus()'); await key('Tab');
    assert.ok(await browser.eval('document.activeElement===document.querySelector(".entity-list-controls select") && document.activeElement.matches(":focus-visible")'));
    await key('Tab'); assert.ok(await browser.eval('document.activeElement===document.querySelectorAll(".entity-list-controls select")[1]'));
    const ax=await browser.send('Accessibility.getFullAXTree');
    assert.ok(ax.nodes.some(node=>!node.ignored&&node.role?.value==='table'));
    assert.equal(await browser.eval('document.querySelectorAll(".main-nav [role=tab][aria-selected=true]").length'),1);
    log('p1-list',`50-row paging, real Tab/focus/AX passed; response-to-click median=${interactiveMs.toFixed(2)}ms`);
    await browser.type('.entity-list input','犬');
    await browser.waitFor('document.querySelectorAll(".entity-list tbody tr").length===2');
    await browser.click('.entity-list tbody tr:first-child .entity-open');
    await browser.waitFor(`document.querySelector('.detail-iri')?.textContent.includes(${JSON.stringify(dogs.body[0].id)})`);
    await browser.click('.entity-list tbody tr:last-child .entity-open');
    await browser.waitFor(`document.querySelector('.detail-iri')?.textContent.includes(${JSON.stringify(dogs.body[1].id)})`);
    assert.equal(await browser.eval('document.querySelector(".edit-section")'),null,'Library is read-only');
    await dictionary('ja'); await ui('en');
    await browser.waitFor('document.querySelector(".entity-open")?.textContent==="犬"');
    await dictionary('en'); await browser.waitFor('document.querySelector(".entity-open")?.textContent==="dog"');
    await ui('ja'); assert.equal(await browser.eval('document.querySelector(".entity-open").textContent'),'dog');
    const other=await browser.eval(`Array.from(document.querySelector('#ontology-select').options).find(option=>option.value!==${JSON.stringify(loaded.id)}).value`);
    await browser.select('#ontology-select',other);
    await browser.waitFor('document.querySelector(".detail-panel")===null');
    await browser.select('#ontology-select',loaded.id);
    await browser.waitFor('document.querySelector(".entity-list tbody tr")');
    await browser.goto(BASE); await browser.waitFor('document.querySelector(".home-screen")');
    await chooseCard(loaded.name,2); await browser.waitFor('document.querySelector(".entity-list tbody tr")');
    assert.equal(await browser.eval('document.querySelector(".dictionary-language-select input").value'),'en','explicit dictionary choice survives reload');
    await dictionary('ja'); await browser.type('.entity-list input','長い');
    await browser.waitFor('document.querySelectorAll(".entity-list tbody tr").length===1');
    assert.equal(await browser.eval('Array.from(document.querySelector(".entity-open").textContent).length'),200);
    const nameBox=await browser.eval('(() => {const button=document.querySelector(".entity-open");const box=button.getBoundingClientRect();const cell=button.closest("td").getBoundingClientRect();return {right:box.right,cellRight:cell.right,scrollHeight:button.scrollHeight,clientHeight:button.clientHeight};})()');
    assert.ok(nameBox.right<=nameBox.cellRight+1,`long name stays inside its table cell: ${JSON.stringify(nameBox)}`);
    assert.ok((await browser.eval('document.querySelector(".entity-list tbody code").textContent')).length>300,'full long IRI');
    await ui('en');
    for (const theme of ['light','dark']) {
      if(await browser.eval('document.documentElement.dataset.theme')!==theme) await browser.click('button[aria-label="Toggle colour theme"]');
      await browser.shot(`p1-${theme}`);
    }
    await browser.send('Emulation.setDeviceMetricsOverride',{width:1000,height:800,deviceScaleFactor:1,mobile:false});
    await browser.eval('document.documentElement.style.zoom="0.8"');
    const width=await browser.eval('({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,zoom:parseFloat(getComputedStyle(document.documentElement).zoom)})');
    await browser.shot('p1-small-80pct');
    const header=await browser.eval('(() => {const boxes=Array.from(document.querySelectorAll(".nav-row button, .nav-row input, .nav-row select")).filter(element=>element.getClientRects().length).map(element=>element.getBoundingClientRect());return {right:Math.max(...boxes.map(box=>box.right)),bottom:Math.max(...boxes.map(box=>box.bottom)),contextTop:document.querySelector(".context-row").getBoundingClientRect().top,viewport:innerWidth};})()');
    const layoutIssues=[];
    if(nameBox.scrollHeight>nameBox.clientHeight+1) layoutIssues.push(`long name text overflows button: ${JSON.stringify(nameBox)}`);
    if(header.right>header.viewport+1 || header.bottom>header.contextTop+1) layoutIssues.push(`header controls overflow: ${JSON.stringify(header)}`);
    assert.deepEqual(layoutIssues,[], 'long names and header controls fit their allocated space');
    // scrollWidth uses unzoomed CSS pixels; compare physical widths on both sides.
    assert.ok(width.scrollWidth*width.zoom<=width.viewport+2,`no page-wide overflow at 1000px/80% CSS zoom: ${JSON.stringify(width)}`);
    await browser.eval('document.documentElement.style.zoom=""');
    await browser.send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
    await browser.clickNav('Home'); await chooseCard(projectName,1);
    await browser.waitFor('document.querySelector(".project-header")');
    await browser.clickNav('Entities'); await browser.waitFor('document.querySelector(".entity-open")');
    await browser.click('.entity-open'); await browser.waitFor('document.querySelector(".edit-section")');
    await browser.click('.edit-section button[aria-label="Edit name in ja"]');
    await browser.type('.edit-section input[aria-label="name in ja"]','合成犬（編集）');
    await browser.click('.edit-section .editing .primary');
    await browser.waitFor('document.querySelector(".project-status-unsaved")');
    await browser.clickText('.project-header button','Undo');
    await browser.waitFor('document.querySelector(".entity-open")?.textContent==="犬"');
    await browser.clickText('.project-header button','Redo');
    await browser.waitFor('document.querySelector(".entity-open")?.textContent==="合成犬（編集）"');
    await browser.clickText('.project-header button','Save');
    await browser.waitFor('document.querySelector(".project-status-saved")');
    await browser.click('.project-header button[aria-label="More project actions"]');
    await browser.clickText('.project-menu button','Language:');
    await browser.clickText('.project-lang-display label','en');
    await browser.waitFor('document.querySelector(".entity-open")?.textContent==="Dog"');
    await ui('ja');
    assert.equal(await browser.eval('document.querySelector(".entity-open").textContent'),'Dog','Project display choice is independent of UI language');
    await key('Escape');
    await browser.goto(BASE); await browser.waitFor('document.querySelector(".home-screen")');
    await chooseCard(projectName,1); await browser.waitFor('document.querySelector(".project-header")');
    await browser.clickNav('項目一覧'); await browser.waitFor('document.querySelector(".entity-open")?.textContent==="合成犬（編集）"');
    const saved=await api('GET','/api/projects');
    assert.ok(saved.ok);
    assert.equal(saved.body.find(project=>project.id===pid).primaryLanguage,'ja','UI/display choices do not change primary language');
    await browser.shot('p1-project-saved');
    log('p1','ALL STEPS PASSED: synthetic-only IME, identities, paging, language independence/reload, AX/Tab/themes/long names/zoom, UI edit/Undo/Redo/Save/reload');
  } finally {
    if(browser) await browser.close();
    stopServer(server);
  }
}
