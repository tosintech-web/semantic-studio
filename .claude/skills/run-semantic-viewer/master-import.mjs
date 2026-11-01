/*
FILE: .claude/skills/run-semantic-viewer/master-import.mjs
SUMMARY: Synthetic master imports through real Chrome controls.
BASIC IDEA: Import country, organization and relationship tables, then reimport.
INPUTS / INPUT SOURCES: Disposable server and generated fictional CSV files.
EXPECTED OUTPUT: Review, apply, no-op and Undo all preserve exact identities.
*/
import assert from 'node:assert/strict';
export async function runMasterImport({BASE,Browser,api,startServer,stopServer,waitForHealth,log}) {
 const server=startServer();let b;
 try {
  assert.ok(await waitForHealth());b=await Browser.launch();
  b.on("Page.javascriptDialogOpening",()=>void b.send("Page.handleJavaScriptDialog",{accept:true}));
  const create=async(name,template,domainProfile)=>{const r=await api('POST','/api/projects',{name,template,...(domainProfile?{domainProfile}:{})});assert.ok(r.ok,JSON.stringify(r));return r.body.id;};
  const country=await create('Import countries','countries');
  const importTable=async(pid,category,text,relations=false,noop=false)=>{
   await b.goto(BASE);await b.waitFor('document.querySelector(".home-screen")');await b.select('.ui-language-select select','en');
   await b.clickText('.government-group-buttons button',category);
   await b.eval(`(()=>{const row=Array.from(document.querySelectorAll('.government-master-panel li')).find(e=>e.querySelector('code')?.textContent===${JSON.stringify(pid)});Array.from(row.querySelectorAll('button')).find(e=>e.textContent==='Import data').click();})()`);
   await b.waitFor('document.querySelector(".master-import-dialog")');
   const ax=await b.send('Accessibility.getFullAXTree');assert.ok(ax.nodes.some(n=>n.role?.value==='dialog'&&n.name?.value==='Import master data'));
   if(relations)await b.select('.master-import-dialog select','relations');
   await b.eval(`(()=>{const el=document.querySelector('.master-import-dialog input[type=file]'),dt=new DataTransfer();dt.items.add(new File([${JSON.stringify(text)}],'synthetic.csv',{type:'text/csv'}));el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
   await b.clickText('.master-import-dialog button','Read source');
   await b.waitFor('document.querySelector(".master-import-dialog").textContent.includes("Source data rows:")');
   await b.clickText('.master-import-dialog button','Prepare and review');
   await b.waitFor('Array.from(document.querySelectorAll(".master-import-dialog button")).some(e=>e.textContent==="Confirm all selected rows"||e.textContent==="Finish without changes")');
   const confirm=noop?'Finish without changes':'Confirm all selected rows';
   assert.equal(await b.eval(`Array.from(document.querySelectorAll('.master-import-dialog button')).find(e=>e.textContent===${JSON.stringify(confirm)})?.disabled`),false,await b.eval('document.querySelector(".master-import-dialog").textContent'));
   await b.eval("document.querySelector('.master-import-dialog').scrollTop=document.querySelector('.master-import-dialog').scrollHeight");
   log('master-import-review',await b.shot('master-import-'+(relations?'relations':category==='Countries'?'countries':'organizations')+'-review'));
   await b.clickText('.master-import-dialog button',confirm);
   await b.waitFor(`document.querySelector('.master-import-dialog').textContent.includes(${JSON.stringify(noop?'No changes were needed.':'Import completed.')})`);
   await b.clickText('.master-import-dialog button','Close');await b.waitFor('!document.querySelector(".master-import-dialog")');
  };
  const countryCsv='code,names,sources\nAA,Synthetic Alpha,Gazette\n';
  await importTable(country,'Countries',countryCsv);
  const source=async(pid)=>(await api('GET',`/api/projects/${pid}/documents/model/source`)).body.text;
  const acceptedCountry=await source(country);
  await importTable(country,'Countries',countryCsv,false,true);assert.equal(await source(country),acceptedCountry);
  const org=await create('Import organizations','government-organizations',{id:'government-organizations-v1',version:1,countryProjectId:country});
  const orgCsv='code,names,countryCode,orgKind,sources,existenceStart,existenceEnd,affiliationStart,affiliationEnd\nM1,Synthetic ministry,AA,Organization,Gazette,open,open,open,open\nM2,Synthetic office,AA,OrganizationalUnit,Gazette,open,open,open,open\n';
  await importTable(org,'Government organizations',orgCsv);
  const before=await source(org);
  await importTable(org,'Government organizations','action,subjectCode,predicate,objectCode,relationStart,relationEnd,sources\nadd,M2,http://www.w3.org/ns/org#unitOf,M1,open,open,Gazette\n',true);
  const after=await source(org);assert.notEqual(after,before);
  const undo=await api('POST',`/api/projects/${org}/documents/model/undo`);assert.ok(undo.ok);assert.equal(await source(org),before);
  assert.equal(await source(country),acceptedCountry);
  log('master-import','ALL STEPS PASSED');
 }catch(error){if(b){log('master-import-failure',await b.eval('document.body.innerText'));log('master-import-failure',await b.shot('master-import-failure'));}throw error;}
 finally{if(b)await b.close();stopServer(server);}
}
