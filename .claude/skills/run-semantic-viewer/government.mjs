/*
================================================================================
FILE: .claude/skills/run-semantic-viewer/government.mjs
SUMMARY
    Synthetic real-Chrome country and government entry acceptance.
BASIC IDEA
    Own a scratch server and browser; register entities through native controls,
    check language-independent drafts, keyboard focus and accessible names.
INPUTS / INPUT SOURCES
    Injected harness operations and generated, fictional groups only.
EXPECTED OUTPUT
    Assertions and screenshots; no real user library changes.
================================================================================
*/
import assert from 'node:assert/strict';
export async function runGovernment({BASE,Browser,api,startServer,stopServer,waitForHealth,log}) {
  const server=startServer(); let b;
  try {
    assert.ok(await waitForHealth());
    const create=async(template,name)=>{const r=await api('POST','/api/projects',{name,template,primaryLanguage:'en'});assert.ok(r.ok,JSON.stringify(r.body));return r.body.id;};
    const countries=await create('countries','Synthetic countries');
    const government=await create('government-organizations','Synthetic government');
    b=await Browser.launch(); await b.goto(BASE);
    await b.waitFor('document.querySelector(".home-screen")');
    await b.select('.ui-language-select select','en');
    const open=async name=>{
      await b.waitFor(`Array.from(document.querySelectorAll('.project-card')).some(c=>c.textContent.includes(${JSON.stringify(name)}))`);
      await b.eval(`Array.from(document.querySelectorAll('.project-card')).find(c=>c.textContent.includes(${JSON.stringify(name)})).id='government-test-card'`);
      await b.click('#government-test-card .onto-verbs button.primary');
      await b.waitFor('document.querySelector(".government-workspace")');
    };
    await open('Synthetic countries');
    await b.click(`#government-new-${countries}`);
    await b.waitFor('document.querySelector(".government-form input[data-name-value]")');
    await b.type('.government-form input[data-name-value]','Synthetic Republic');
    await b.select('.ui-language-select select','ja');
    assert.equal(await b.eval('document.querySelector("input[data-name-value]").value'),'Synthetic Republic');
    await b.select('.ui-language-select select','en');
    const ax=await b.send('Accessibility.getFullAXTree');
    assert.ok(ax.nodes.some(n=>n.role?.value==='textbox'&&n.name?.value==='Preferred name 1'));
    await b.click('.government-form input[data-name-value]');
    await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    assert.ok(await b.eval('document.activeElement.id.endsWith("-language")'));
    await b.click('.government-form button[type=submit]');
    await b.waitFor('document.querySelector(".government-entry-list")?.textContent.includes("Synthetic Republic")');
    assert.equal(await b.eval('document.activeElement.id'),`government-new-${countries}`);
    log('government-country',await b.shot('government-country'));
    await b.clickText('.project-header button','Save');
    await b.waitFor("document.querySelector('[role=dialog]')");
    await b.clickText('[role=dialog] button','Save and keep a backup');
    await b.waitFor("!document.querySelector('.project-header')?.textContent.includes('Unsaved changes')");
    await b.clickNav('Home'); await open('Synthetic government');
    await b.select(`#government-source-${government}`,countries);
    await b.click('.government-source-form button[type=submit]');
    await b.waitFor('document.querySelector(".government-source-form section button")');
    await b.click('.government-source-form section button');
    await b.waitFor(`document.querySelector('#government-new-${government}').getAttribute('aria-disabled')==='false'`);
    await b.click(`#government-new-${government}`);
    await b.waitFor('document.querySelector(".government-country-picker select option:nth-child(2)")');
    await b.type('.government-form input[data-name-value]','Synthetic Ministry');
    const country=await b.eval('document.querySelector(".government-country-picker select option:nth-child(2)").value');
    await b.select('.government-country-picker select',country);
    await b.type('.government-form fieldset:last-of-type input','Synthetic gazette');
    await b.click('.government-form button[type=submit]');
    await b.waitFor('document.querySelector(".government-entry-list")?.textContent.includes("Synthetic Ministry")');
    log('government-organization',await b.shot('government-organization'));
    const choose=async(label,value,scope='.government-form')=>{
      await b.eval(`(() => {document.querySelector('[data-gov-target]')?.removeAttribute('data-gov-target');const root=document.querySelector(${JSON.stringify(scope)});const label=[...root.querySelectorAll('label')].find(l=>l.textContent.trim()===${JSON.stringify(label)});if(!label)throw new Error('Missing label: '+${JSON.stringify(label)});document.getElementById(label.htmlFor).setAttribute('data-gov-target','true');})()`);
      await b.waitFor(`document.querySelector('[data-gov-target]').getAttribute('aria-disabled')!=='true'`);
      await b.waitFor(`Array.from(document.querySelector('[data-gov-target]').options).some(o=>o.value===${JSON.stringify(value)})`);
      await b.select('[data-gov-target]',value);
    };
    const fill=async(label,value,scope='.government-form')=>{
      await b.eval(`(() => {document.querySelector('[data-gov-target]')?.removeAttribute('data-gov-target');const root=document.querySelector(${JSON.stringify(scope)});const label=[...root.querySelectorAll('label')].find(l=>l.textContent.trim()===${JSON.stringify(label)});if(!label)throw new Error('Missing label: '+${JSON.stringify(label)});const element=document.getElementById(label.htmlFor);element.setAttribute('data-gov-target','true');if(element.type==='date'){Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(element,${JSON.stringify(value)});element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));}})()`);
      if(!await b.eval(`document.querySelector('[data-gov-target]').type==='date'`))await b.type('[data-gov-target]',value);
    };
    const apply=async()=>{
      assert.equal(await b.eval(`Array.from(document.querySelectorAll('.government-form button')).find(b=>b.textContent==='Review changes').getAttribute('aria-disabled')`),'false',await b.eval(`document.querySelector('.government-form').textContent`));
      await b.clickText('.government-form button','Review changes');
      await b.waitFor('document.querySelector(".government-review input[type=checkbox]")');
      const ax=await b.send('Accessibility.getFullAXTree');
      assert.ok(ax.nodes.some(n=>n.role?.value==='checkbox'&&n.name?.value==='I reviewed all changes'));
      await b.click('.government-review input[type=checkbox]');
      await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      assert.equal(await b.eval('document.activeElement.textContent'),'Apply reviewed changes');
      assert.ok(await b.eval(`document.activeElement.matches(':focus-visible') && getComputedStyle(document.activeElement).outlineStyle!=='none'`));
      await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',windowsVirtualKeyCode:13});
      await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
      await b.waitFor('document.querySelector(".government-dated-view")');
    };
    const view=async at=>{const r=await api('GET',`/api/projects/${government}/government/view?at=${at}`);assert.ok(r.ok);return r.body;};
    let data=await view('2029-03-31');const ministry=data.organizations.items[0].iri;
    const openPeriod={start:{date:null,open:true},end:{date:null,open:true}};
    const add=async name=>{const r=await api('POST',`/api/projects/${government}/documents/model/commands`,{command:'CreateGovernmentOrganization',args:{names:[{value:name,language:'en'}],kind:'Organization',countryIri:country,countryPeriod:openPeriod,existencePeriod:openPeriod,sources:[{kind:'text',value:'Synthetic gazette'}],referenceBasis:data.referenceBasis}});assert.ok(r.ok,JSON.stringify(r.body));return r.body.created;};
    const parentA=await add('Synthetic Agency A'),parentB=await add('Synthetic Agency B');
    await b.clickText('.government-workspace button','New relationship');
    await b.waitFor('document.querySelectorAll(".government-form select option").length>5');
    await choose('Subject organization',ministry);await choose('Related organization',parentA);
    await choose('Relationship period — start','open');await choose('Relationship period — end','open');
    await fill('Source 1','Synthetic relationship Act');await apply();
    data=await view('2029-03-31');const old=data.relations.items.find(r=>r.subject===ministry&&r.predicate==='http://www.w3.org/ns/org#unitOf');assert.ok(old);
    log('government-relation','native pickers, full review and atomic relationship registration passed');
    await b.clickText('.government-workspace button','New reorganization');
    await b.waitFor('document.querySelector(".government-form")');
    await choose('Change type','transfer');await fill('Effective date','2030-04-01');
    await choose('Original organizations',ministry);await choose('Resulting organizations',ministry);
    await fill('Source 1','Synthetic transfer Act');
    for(let index=1;index<=2;index++) {
      await b.clickText('.government-form button','Add relationship edit');
      await b.eval(`Array.from(document.querySelectorAll('.government-form > fieldset')).find(f=>f.querySelector(':scope > legend')?.textContent==='Relationship edit ${index}').setAttribute('data-edit','${index}')`);
    }
    await choose('Existing record',old.iri,'[data-edit="1"]');
    await choose('Relationship period — end','date','[data-edit="1"]');
    await fill('Relationship period — end date','2030-04-01','[data-edit="1"]');
    await choose('Subject organization',ministry,'[data-edit="2"]');await choose('Related organization',parentB,'[data-edit="2"]');
    await choose('Relationship period — start','date','[data-edit="2"]');await fill('Relationship period — start date','2030-04-01','[data-edit="2"]');
    await choose('Relationship period — end','open','[data-edit="2"]');await fill('Source 1','Synthetic transfer Act','[data-edit="2"]');
    await apply();
    for(const [at,parent]of [['2030-03-31',parentA],['2030-04-01',parentB]]){
      const r=await api('GET',`/api/projects/${government}/government/view?at=${at}`);assert.ok(r.ok);assert.equal(r.body.activeRelations.items.find(v=>v.subject===ministry&&v.predicate==='http://www.w3.org/ns/org#unitOf').object,parent);
    }
    await fill('View date','2030-04-01','.government-dated-view');
    await b.waitFor(`document.querySelector('.government-dated-view')?.textContent.includes('As of 2030-04-01')`);
    await b.select('.ui-language-select select','ja');await b.waitFor(`document.querySelector('.government-dated-view .government-entry-list button')`);await b.eval(`Array.from(document.querySelectorAll('.government-dated-view h2')).find(h=>h.textContent.includes('基準日に有効')).scrollIntoView({block:'start',behavior:'instant'})`);log('government-transfer',await b.shot('government-transfer-ja'));
    await b.select('.ui-language-select select','en');
    await b.clickText('.project-header button','Undo');
    await b.waitFor('document.querySelector(".government-dated-view")');
    data=await view('2030-04-01');assert.equal(data.changes.total,0);assert.equal(data.activeRelations.items.find(v=>v.subject===ministry&&v.predicate==='http://www.w3.org/ns/org#unitOf').object,parentA);
    await b.clickText('.government-workspace button','New reorganization');await b.waitFor('document.querySelector(".government-form")');
    for(const iri of[parentA,parentB])await choose('Original organizations',iri);
    await choose('Resulting organizations',parentA);await fill('Source 1','Synthetic absorption Act');await apply();
    data=await view('2030-04-01');assert.equal(data.changes.total,1);assert.equal(data.changes.items[0].kind,'merge');assert.equal(data.changes.items[0].originalIris.length,2);
    await b.send('Emulation.setDeviceMetricsOverride',{width:720,height:1000,deviceScaleFactor:1,mobile:false});
    await b.waitFor(`document.querySelector('.government-dated-view .government-entry-list button')`);
    assert.ok(await b.eval(`document.documentElement.scrollWidth<=window.innerWidth`),'no document horizontal overflow');
    await b.eval(`Array.from(document.querySelectorAll('.government-dated-view h3')).find(h=>h.textContent==='Reorganization events').scrollIntoView({block:'center',behavior:'instant'})`);
    log('government-history',await b.shot('government-history-narrow'));
    log('government','G1/G2 native entry, reviewed transfer, dates, absorption, Undo, Japanese and narrow view passed');
  } catch(error) {if(b){log('government-inputs',await b.eval(`Array.from(document.querySelectorAll('.government-form input,.government-form select')).map(e=>({id:e.id,type:e.type,value:e.value,disabled:e.getAttribute('aria-disabled')}))`));log('government-failure',await b.shot('government-failure'));}throw error;} finally {if(b)await b.close();stopServer(server);}
}
