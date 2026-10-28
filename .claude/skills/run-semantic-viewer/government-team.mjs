/*
================================================================================
FILE: .claude/skills/run-semantic-viewer/government-team.mjs
SUMMARY
    Real HTTPS/PostgreSQL country and government acceptance with signed sessions.
BASIC IDEA
    Reuse P2's isolated authenticated browsers and the local UI workflow, then
    verify replay, viewer refusal, one-step Undo and clean team refresh ownership.
INPUTS / INPUT SOURCES
    Synthetic P2 identities, disposable internal DB and generated government data.
EXPECTED OUTPUT
    Complete team behavior, without publishing database ports or real user data.
================================================================================
*/
import assert from 'node:assert/strict';
import {runP2} from './p2.mjs';
import {runGovernmentWorkflow} from './government.mjs';
export async function runGovernmentTeam(options) {
 await runP2({...options,acceptGovernment:async({browser,other,inApi})=>{
  const BASE=`https://127.0.0.1:${process.env.TEAM_PORT||8011}`;
  const api=async(method,path,body)=>{const response=await inApi(browser,method,path,body);return {...response,ok:response.status>=200&&response.status<300};};
  await runGovernmentWorkflow({BASE,b:browser,api,log:options.log,replayRegistration:async({government,countries,registration})=>{
   const path=`/api/projects/${government}/documents/model/commands`;
   const count=(await api('GET',`/api/projects/${government}/government/view?at=2030-04-01`)).body.organizations.total;
   const before=(await inApi(browser,'GET','/api/team/versions')).body.resourceVersions;
   const body={command:'CreateGovernmentOrganization',args:registration};
   const first=await inApi(browser,'POST',path,body,before,'government-team-replay');assert.equal(first.status,200,JSON.stringify(first.body));
   const replay=await inApi(browser,'POST',path,body,before,'government-team-replay');assert.deepEqual(replay,first);
   const refused=await inApi(other,'POST',path,body);assert.equal(refused.status,403);
   assert.equal((await api('GET',`/api/projects/${government}/government/view?at=2030-04-01`)).body.organizations.total,count+1);
   const source=(await api('GET',`/api/projects/${countries}/documents/model/source`)).body.text;
   assert.equal((await api('POST',`/api/projects/${government}/documents/model/undo`)).status,200);
   assert.equal((await api('GET',`/api/projects/${government}/government/view?at=2030-04-01`)).body.organizations.total,count);
   assert.equal((await api('GET',`/api/projects/${countries}/documents/model/source`)).body.text,source);
   await other.goto(BASE);await other.waitFor('document.querySelector(".team-account")');await other.select('.ui-language-select select','en');
   await other.clickText('.government-group-buttons button','Government organizations');
   assert.equal(await other.eval(`Array.from(document.querySelectorAll('.government-group-navigation section button')).find(b=>b.textContent==='Create government organization group').getAttribute('aria-disabled')`),'true');
   await other.click('.government-group-navigation section li button');await other.waitFor('document.querySelector(".government-dated-view > ul:not(.government-entry-list) button")');
   await other.click('.government-dated-view > ul:not(.government-entry-list) button');await other.waitFor('document.querySelector(".government-form")');
   assert.equal(await other.eval(`Array.from(document.querySelectorAll('.government-form button')).find(b=>b.textContent==='Cancel').getAttribute('aria-disabled')`),'false');
   await other.clickText('.government-form button','Cancel');await other.waitFor('document.querySelector(".government-dated-view")');
   const metadata={source:'Synthetic government fixture',license:'Synthetic data only'};
   const preview=await api('POST',`/api/projects/${government}/release-preview`,metadata);
   assert.equal(preview.status,422);assert.equal(preview.body.code,'government_release_profile_unsupported');
   await browser.send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
   await browser.goto(BASE);await browser.waitFor('document.querySelector(".home-screen")');
   await browser.clickText('.government-group-buttons button','Government organizations');
   await browser.clickText('.government-group-navigation section li button','Synthetic government');
   await browser.waitFor('document.querySelector(".government-entry-list")?.textContent.includes("Synthetic Ministry")');
   await browser.clickText('.government-entry-list button','Synthetic Ministry');
   await browser.waitFor('document.querySelector("input[data-name-value]")?.value==="Synthetic Ministry"');
   const current=(await api('GET',`/api/projects/${government}/government/view?at=2030-04-01`)).body;
   const ministry=current.organizations.items.find(row=>row.label==='Synthetic Ministry');assert.ok(ministry);
   const external=await api('POST',path,{command:'CreateGovernmentOrganization',args:{iri:ministry.iri,
    names:[{value:'Externally renamed ministry',language:'en'}],kind:ministry.kind,identifier:ministry.identifier,
    countryIri:ministry.formCountryIri,countryPeriod:ministry.countryPeriod,existencePeriod:ministry.existencePeriod,
    sources:ministry.sources,referenceBasis:current.referenceBasis}});assert.equal(external.status,200,JSON.stringify(external.body));
   // Exercise the real ten-second clean poll, rather than accepting versions in
   // test code: the still-untouched form must hydrate the new accepted fields.
   await browser.waitFor('document.querySelector("input[data-name-value]")?.value==="Externally renamed ministry"',30000);
   await browser.type('.government-form input[id$="-identifier"]','edited-after-refresh');
   await browser.clickText('.government-form button','Save government organization');await browser.waitFor('document.querySelector(".government-dated-view")');
   const accepted=(await api('GET',`/api/projects/${government}/government/view?at=2030-04-01`)).body.organizations.items.find(row=>row.iri===ministry.iri);
   assert.equal(accepted.label,'Externally renamed ministry');assert.equal(accepted.identifier,'edited-after-refresh');
   options.log('government-team-clean-refresh','real team poll rehydrated the pristine form; an identifier edit preserved the external rename');
  }});
  options.log('government-team','signed HTTPS sessions, real PostgreSQL, full UI workflow, replay, viewer refusal and country-preserving Undo passed');
 }});
}
