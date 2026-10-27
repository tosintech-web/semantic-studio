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
    log('government','G1 entry, language, AX and real Tab/focus passed');
  } catch(error) {if(b)log('government-failure',await b.shot('government-failure'));throw error;} finally {if(b)await b.close();stopServer(server);}
}
