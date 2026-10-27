/*
================================================================================
FILE: .claude/skills/run-semantic-viewer/p2.mjs
SUMMARY
    Real HTTPS acceptance for team sessions, concurrent editing and recovery.
BASIC IDEA
    Run the production app with a test-only synthetic signed Google provider;
    isolate two browser contexts and use real cookies, API boundaries and UI.
    Never serialize bearer credentials or publish generated keys/screenshots.
INPUTS / INPUT SOURCES
    Scratch storage, generated identities and the shared Chrome harness.
EXPECTED OUTPUT
    Assertions, localized screenshots and a nonzero exit on an unmet contract.
================================================================================
*/
import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {request} from 'node:https';
import {join} from 'node:path';
import {mkdirSync} from 'node:fs';

export async function runP2({ROOT,DATA_DIR,Browser,stopServer,pythonExe,log,sleep,acceptRelease}) {
  const port=Number(process.env.TEAM_PORT||8011), base=`https://127.0.0.1:${port}`;
  const directory=join(DATA_DIR,'team-acceptance');mkdirSync(directory,{recursive:true});
  const prepared=spawnSync(pythonExe(),['scripts/pg_compose_support.py','prepare-browser',directory,String(port)],{
    cwd:ROOT,encoding:'utf8',timeout:180000});
  assert.equal(prepared.status,0,'dedicated internal PostgreSQL browser preparation');
  const stack=JSON.parse(prepared.stdout);
  const fixtureEnvironment={...process.env,...stack.environment};
  const docker=(args)=>{
    const result=spawnSync(stack.arguments[0],[...stack.arguments.slice(1),...args],{cwd:ROOT,env:fixtureEnvironment,encoding:'utf8',timeout:90000});
    assert.equal(result.status,0,'owned browser Compose operation');
  };
  const start=()=>{
    const proc=spawn(stack.arguments[0],[...stack.arguments.slice(1),'up','--no-deps','--no-build','--force-recreate','semantic-studio-team'],{
      cwd:ROOT,env:fixtureEnvironment,stdio:['ignore','pipe','pipe']});
    proc.stderr.on('data',data=>process.stderr.write(data));return proc;
  };
  const stopFixture=async(proc,abrupt=false)=>{
    if(!proc)return;
    const stopped=proc.exitCode===null?new Promise(resolve=>proc.once('exit',resolve)):Promise.resolve();
    docker(['stop','--timeout',abrupt?'0':'5','semantic-studio-team']);
    await stopped;
  };
  const health=()=>new Promise(resolve=>{
    const req=request(base+'/api/health',{rejectUnauthorized:false},res=>{res.resume();resolve(res.statusCode===200);});
    req.on('error',()=>resolve(false));req.setTimeout(1000,()=>{req.destroy();resolve(false);});req.end();
  });
  const waitHealth=async()=>{for(let n=0;n<100;n++){if(await health())return;await sleep(200);}throw Error('team server unavailable');};
  const inApi=(browser,method,path,body,expected,requestId)=>browser.eval(`(async()=>{
    const status=await (await fetch('/api/auth/status')).json();
    const versions=${JSON.stringify(expected??null)}??(await (await fetch('/api/team/versions')).json()).resourceVersions;
    const response=await fetch(${JSON.stringify(path)},{method:${JSON.stringify(method)},headers:{
      'Content-Type':'application/json','X-Semantic-Studio':'1','X-Semantic-Studio-Csrf':status.csrf??'',
      'X-Semantic-Studio-Request-Id':${JSON.stringify(requestId??null)}??crypto.randomUUID(),
      'X-Semantic-Studio-Versions':JSON.stringify({workspace:null,...versions}).split('').map(char=>char.charCodeAt(0)>127?String.fromCharCode(92)+'u'+char.charCodeAt(0).toString(16).padStart(4,'0'):char).join('')},
      body:${body===undefined?'undefined':JSON.stringify(JSON.stringify(body))}});
    const text=await response.text();let value;try{value=JSON.parse(text);}catch{value={bytes:text.length};}
    return {status:response.status,body:value};
  })()`);
  let server=start(),browser,other,context;
  try{
    await waitHealth();browser=await Browser.launch();
    await browser.send('Security.setIgnoreCertificateErrors',{ignore:true});
    await browser.goto(base);
    await browser.waitFor('document.querySelector(".team-panel .ui-language-select select")');
    assert.match(await browser.eval('document.body.innerText'),/ログイン/);
    await browser.select('.team-panel .ui-language-select select','en');
    assert.match(await browser.eval('document.body.innerText'),/Sign in with Google/);
    await browser.goto(base+'/api/auth/callback?state=synthetic-invalid&code=synthetic-invalid');
    await browser.waitFor('document.querySelector(".team-panel [role=alert]")');
    assert.match(await browser.eval('document.querySelector(".team-panel [role=alert]").textContent'),/Sign-in failed/);
    assert.equal((await inApi(browser,'GET','/api/projects')).status,401);
    const login=async page=>{
      const before=(await browser.send('Target.getTargets',{},false)).targetInfos.map(t=>t.targetId);
      await page.click('.team-panel button:first-of-type');
      let signedIn=false;
      for(let attempt=0;attempt<50;attempt++){
        signedIn=await page.eval(`(async()=> (await (await fetch('/api/auth/status')).json()).authenticated)()`);
        if(signedIn)break;await sleep(200);
      }
      assert.equal(signedIn,true,'signed fixture callback');
      await page.click('.team-panel button:nth-of-type(2)');
      await page.waitFor('document.querySelector(".team-account")',10000,'authenticated account');
      for(const target of (await browser.send('Target.getTargets',{},false)).targetInfos)
        if(target.type==='page'&&!before.includes(target.targetId))await browser.send('Target.closeTarget',{targetId:target.targetId},false);
      await page.send('Page.bringToFront');
    };
    await login(browser);
    assert.match(await browser.eval('document.querySelector(".team-account").innerText'),/owner@example.org/);
    context=(await browser.send('Target.createBrowserContext',{},false)).browserContextId;
    const target=(await browser.send('Target.createTarget',{url:'about:blank',browserContextId:context},false)).targetId;
    const session=(await browser.send('Target.attachToTarget',{targetId:target,flatten:true},false)).sessionId;
    other=Object.create(browser);other.sessionId=session;
    other.send=(method,params={},useSession=true)=>browser.send(method,params,useSession,session);
    await other.send('Page.enable');await other.send('Runtime.enable');
    await other.send('Security.setIgnoreCertificateErrors',{ignore:true});await other.goto(base);
    await other.waitFor('document.querySelector(".team-panel")');await other.select('.ui-language-select select','en');
    await login(other);
    assert.match(await other.eval('document.querySelector(".team-account").innerText'),/editor@example.org/);
    const create=await inApi(browser,'POST','/api/projects',{name:'P2 synthetic dictionary',baseIri:'https://example.org/p2#',prefix:'p2',primaryLanguage:'ja',template:'empty'});
    assert.equal(create.status,200);const pid=create.body.id;
    const path=`/api/projects/${pid}/documents/model/commands`;
    const baseline=(await inApi(browser,'GET','/api/team/versions')).body.resourceVersions;
    const body={command:'CreateClass',args:{label:'合成の犬',iri:'https://example.org/p2#Dog'}};
    const first=await inApi(browser,'POST',path,body,baseline,'p2-browser-create-class');
    assert.equal(first.status,200,JSON.stringify(first.body));
    const repeat=await inApi(browser,'POST',path,body,baseline,'p2-browser-create-class');assert.deepEqual(repeat,first);
    const stale=await inApi(other,'POST',path,{command:'CreateClass',args:{label:'stale'}},baseline);
    assert.equal(stale.status,409);assert.equal(stale.body.code,'revision_conflict');
    const foreignUndo=await inApi(other,'POST',`/api/projects/${pid}/documents/model/undo`,{});
    assert.equal(foreignUndo.status,409);assert.equal(foreignUndo.body.code,'undo_forbidden');
    const source=(await inApi(browser,'GET',`/api/projects/${pid}/documents/model/source`)).body;
    assert.ok(JSON.stringify(source).includes('合成の犬'));
    const history=(await inApi(browser,'GET',`/api/team/history?key=${encodeURIComponent('graph:'+pid+'-model')}`)).body.history;
    assert.equal(history[0].actor,'owner');
    log('p2-concurrency','two cookie-isolated users, atomic replay, stale update and foreign Undo refusal passed');
    await browser.send('Page.bringToFront');await browser.goto(base);await browser.waitFor('document.querySelector(".home-controls button")');
    await browser.click('.home-controls button');await browser.waitFor('document.querySelector("#new-project-name")');
    await browser.send('Emulation.setFocusEmulationEnabled',{enabled:true});
    await browser.click('input[name="new-project-kind"][value="ontology"]');
    await browser.click('#new-project-name');
    log('p2-input-focus',await browser.eval('({focused:document.hasFocus(),active:document.activeElement?.id})'));
    await browser.send('Input.insertText',{text:'未送信の入力'});
    await browser.type('#new-project-baseIri','https://example.org/unsent#');
    await browser.type('#new-project-prefix','pending');
    assert.equal(await browser.eval('document.querySelector("#new-project-name").value'),'未送信の入力','native Unicode input before session expiry');
    assert.equal((await inApi(other,'PATCH',`/api/projects/${pid}`,{name:'P2 other member update'})).status,200);
    await browser.click('[role="dialog"] button[type="submit"]');
    await browser.waitFor('document.querySelector(".team-panel h2")?.textContent==="This item has changed"');
    assert.equal(await browser.eval('document.querySelector("#new-project-name").value'),'未送信の入力');
    await browser.clickText('.team-panel button','Load the latest version');
    await browser.waitFor('document.querySelector(".team-panel pre")?.textContent.includes("P2 other member update")');
    await browser.clickText('.team-panel button','Use reviewed version');
    await browser.waitFor('!document.querySelector(".team-app-host").hasAttribute("inert")');
    assert.equal(await browser.eval('document.querySelector("#new-project-name").value'),'未送信の入力');
    assert.equal((await inApi(browser,'GET','/api/projects')).body.length,1,'review never automatically resubmits creation');
    log('p2-conflict-ui','dirty form retained through latest-saved review and explicit baseline acceptance without replay');
    // A real PostgreSQL gate timeout reaches the shipped 503 path. This holds
    // no lease and adds no testing endpoint to the application.
    const gateCode=`import os,time,psycopg
from app.team.pg_config import load_pg_config
c=load_pg_config(os.environ,role='app')
with psycopg.connect(host='db',port=5432,dbname=c.dbname,user=c.user,password=c.password_file.read_text().strip()) as db:
 db.execute('SELECT pg_advisory_xact_lock(%s,%s)',(1397969989,2))
 print('gate-held',flush=True)
 time.sleep(12)
`;
    const gate=spawn(stack.arguments[0],[...stack.arguments.slice(1),'run','--rm','--no-deps','-T','--entrypoint','python','semantic-studio-team','-'],
      {cwd:ROOT,env:fixtureEnvironment,stdio:['pipe','pipe','pipe']});
    gate.stdin.end(gateCode);
    const gateDone=new Promise(resolve=>gate.once('exit',resolve));
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('database gate fixture unavailable')),15000);
      gate.stdout.on('data',data=>{if(String(data).includes('gate-held')){clearTimeout(timer);resolve();}});
      gate.once('exit',()=>{clearTimeout(timer);reject(Error('database gate fixture exited'));});
    });
    await browser.send('Network.enable');
    let sawUnavailable=false;
    const stopNetwork=browser.on('Network.responseReceived',event=>{
      if(event.response?.url===base+'/api/projects'&&event.response.status===503)sawUnavailable=true;
    });
    await browser.click('[role="dialog"] button[type="submit"]');
    await browser.waitFor('document.querySelector("[role=dialog] [role=alert]")?.textContent.includes("unavailable")',15000);
    stopNetwork();assert.equal(sawUnavailable,true,'real database timeout returned 503');
    assert.equal(await browser.eval('document.querySelector("#new-project-name").value'),'未送信の入力');
    assert.match(await browser.eval('document.querySelector(".team-account").innerText'),/owner@example.org/);
    await gateDone;
    assert.equal((await inApi(browser,'GET','/api/projects')).body.length,1,'503 never automatically resubmits creation');
    log('p2-storage-ui','real PostgreSQL 503 retained the unsent form and authenticated owner without replay');
    // Revoke the real session, then submit through the shipped frontend so its
    // centralized 401 boundary must preserve the already mounted dialog.
    assert.equal((await inApi(browser,'POST','/api/auth/logout',{})).status,200);
    await browser.click('[role="dialog"] button[type="submit"]');
    await browser.waitFor('document.querySelector(".team-panel") && document.querySelector(".team-app-host[inert]")');
    assert.equal(await browser.eval('document.querySelector("#new-project-name").value'),'未送信の入力');
    await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    assert.equal(await browser.eval('!!document.activeElement?.closest("[inert]")'),false,'retained modal cannot trap recovery Tab');
    await browser.select('.team-panel .ui-language-select select','ja');
    assert.match(await browser.eval('document.querySelector(".team-panel").innerText'),/有効期限/);
    await browser.shot('p2-ja-expired-retained');
    await browser.select('.team-panel .ui-language-select select','en');await login(browser);
    assert.equal(await browser.eval('document.querySelector("#new-project-name").value'),'未送信の入力');
    assert.equal(await browser.eval('document.querySelector(".team-app-host").hasAttribute("inert")'),false);
    log('p2-recovery','signed same-owner reauthentication retained unsent Japanese input and current UI locale');
    // Native Tab and the accessibility tree are browser checks, independent of
    // jsdom's focus/navigation approximation.
    await browser.eval('document.activeElement?.blur()');
    await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    assert.ok(await browser.eval('document.activeElement!==document.body'));
    const ax=(await browser.send('Accessibility.getFullAXTree')).nodes;
    assert.ok(ax.some(node=>node.role?.value==='button'&&node.name?.value));
    await browser.shot('p2-en-restored');
    assert.equal((await inApi(browser,'POST',`/api/projects/${pid}/documents/shapes/commands`,
      {command:'CreateShape',args:{target:'https://example.org/p2#Dog',name:'Synthetic dog rules'}})).status,200);
    assert.equal((await inApi(other,'POST','/api/auth/logout',{})).status,200);
    await other.send('Page.bringToFront');await other.goto(base);await other.waitFor('document.querySelector(".team-panel")');
    await login(other);
    assert.match(await other.eval('document.querySelector(".team-account").innerText'),/reader@example.org/);
    assert.equal((await inApi(other,'POST',path,{command:'CreateClass',args:{label:'Forbidden'}})).status,403);
    assert.equal((await inApi(other,'GET',`/api/projects/${pid}/export`)).status,200);
    assert.equal((await inApi(other,'GET','/LICENSE')).status,200);
    assert.equal(await other.eval('document.querySelector(".home-controls button").disabled'),true);
    await other.click('.project-card .onto-verbs button.primary');
    await other.waitFor('document.querySelector(".side-tabs")');
    await other.clickText('.side-tabs [role="tab"]','Reasoning');
    await other.waitFor('document.querySelector(".reason-button")');
    await other.click('.reason-button');
    let reasoned=false;
    for(let attempt=0;attempt<100;attempt++){
      const result=await inApi(other,'GET',`/api/projects/${pid}/reasoning`);
      if(result.status===200&&result.body.status==='done'){reasoned=true;break;}await sleep(200);
    }
    assert.equal(reasoned,true,'reader reasoning through the actual UI');
    await other.clickNav('Shapes');await other.waitFor('document.querySelector(".validate-btn")');
    assert.equal(await other.eval('document.querySelector(".shapes-add").disabled'),true);
    await other.click('.validate-btn');
    let validated=false;
    for(let attempt=0;attempt<50;attempt++){
      const result=await inApi(other,'GET',`/api/projects/${pid}/validate`);
      if(result.status===200&&result.body!==null){validated=true;break;}await sleep(200);
    }
    assert.equal(validated,true,'reader validation through the actual UI');
    // Account history belongs to the currently selected RDF document, including
    // Shapes. Switching documents must replace the visible audit owner.
    // Audit operation names use route templates; compare the actual stored
    // document diffs rather than looking for a literal document in that name.
    const historyText=entries=>entries.map(entry=>entry.operation+(entry.diff?'\n'+JSON.stringify(entry.diff,null,2):''));
    const shapeHistory=historyText((await inApi(other,'GET',`/api/team/history?key=${encodeURIComponent('graph:'+pid+'-shapes')}`)).body.history);
    const modelHistory=historyText((await inApi(other,'GET',`/api/team/history?key=${encodeURIComponent('graph:'+pid+'-model')}`)).body.history);
    assert.ok(shapeHistory.length>0&&modelHistory.length>0);assert.notDeepEqual(shapeHistory,modelHistory);
    await other.click('.team-account > button');
    await other.clickText('.team-account button','Change history');
    await other.waitFor(`JSON.stringify(Array.from(document.querySelectorAll(".team-account section pre")).map(node=>node.textContent))===${JSON.stringify(JSON.stringify(shapeHistory))}`);
    await other.clickNav('Edit');
    await other.waitFor(`JSON.stringify(Array.from(document.querySelectorAll(".team-account section pre")).map(node=>node.textContent))===${JSON.stringify(JSON.stringify(modelHistory))}`);
    log('p2-history','reader history follows Shapes and model in the actual UI');
    log('p2-viewer','reader can export and read legal notices while direct and UI edits are refused');
    // Reopen a clean page before process restart. Existing valid cookies and
    // durable graph/history must survive a completely new application process.
    // The retained unsent form must warn before navigation. Accept only this
    // intentional test reload; normal recovery above must retain its input.
    let warnedBeforeUnload=false;
    const removeUnloadListener=browser.on('Page.javascriptDialogOpening',event=>{
      if(event.type==='beforeunload'){
        warnedBeforeUnload=true;
        void browser.send('Page.handleJavaScriptDialog',{accept:true});
      }
    });
    await browser.goto(base);
    removeUnloadListener();
    assert.equal(warnedBeforeUnload,true,'retained unsent input warns before leaving');
    // Real audit pages, with only a transport failure/delay injected. The
    // accepted offset must not move until its page has actually arrived.
    for(let n=0;n<100;n++)assert.equal((await inApi(browser,'POST',path,
      {command:'SetLabel',args:{iri:'https://example.org/p2#Dog',value:`History page ${n}`,lang:'ja'}})).status,200);
    assert.equal((await inApi(browser,'POST',path,
      {command:'SetLabel',args:{iri:'https://example.org/p2#Dog',value:'合成の犬',lang:'ja'}})).status,200);
    const historyKey='graph:'+pid+'-model', completeHistory=[];
    for(let offset=0;;offset+=50){
      const result=await inApi(browser,'GET',`/api/team/history?key=${encodeURIComponent(historyKey)}&offset=${offset}`);
      assert.equal(result.status,200);completeHistory.push(...result.body.history);
      if(result.body.history.length<50)break;
    }
    assert.ok(completeHistory.length>100,'three real audit pages');
    let failPage=true,heldPage=null;const pageOffsets=[],interceptionErrors=[];
    const control=(method,params)=>void browser.send(method,params).catch(error=>interceptionErrors.push(error.message));
    const removeHistoryPause=browser.on('Fetch.requestPaused',event=>{
      const url=new URL(event.request.url),offset=Number(url.searchParams.get('offset')||0);
      if(url.searchParams.get('key')!==historyKey){control('Fetch.continueRequest',{requestId:event.requestId});return;}
      pageOffsets.push(offset);
      if(offset===50&&failPage){failPage=false;control('Fetch.failRequest',{requestId:event.requestId,errorReason:'Failed'});}
      else if(offset===50)heldPage=event.requestId;
      else control('Fetch.continueRequest',{requestId:event.requestId});
    });
    await browser.send('Fetch.enable',{patterns:[{urlPattern:base+'/api/team/history*',requestStage:'Request'}]});
    try{
      await browser.send('Page.bringToFront');
      await browser.waitFor('document.querySelector(".project-card .onto-verbs button.primary")');
      await browser.click('.project-card .onto-verbs button.primary');
      await browser.waitFor('document.querySelector(".side-tabs")');await browser.clickNav('Edit');
      await browser.click('.team-account > button');await browser.clickText('.team-account button','Change history');
      const region='.team-account section[aria-label="Change history"]',moreSelector=region+' > button';
      await browser.waitFor(`document.querySelectorAll(${JSON.stringify(region+' li')}).length===50&&document.querySelector(${JSON.stringify(region)})?.getAttribute('aria-busy')==='false'`);
      for(let n=0;n<80&&!await browser.eval(`document.activeElement===document.querySelector(${JSON.stringify(moreSelector)})`);n++){
        await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
        await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      }
      assert.equal(await browser.eval(`document.activeElement===document.querySelector(${JSON.stringify(moreSelector)})&&document.activeElement.matches(':focus-visible')&&parseFloat(getComputedStyle(document.activeElement).outlineWidth)>0`),true,'native Tab reaches visibly focused More');
      const enter=async()=>{
        await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
        await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
      };
      await enter();
      await browser.waitFor(`document.querySelector(${JSON.stringify(region+' [role=alert]')})&&document.querySelector(${JSON.stringify(region)})?.getAttribute('aria-busy')==='false'`);
      await enter();for(let n=0;n<100&&!heldPage;n++)await sleep(20);
      assert.ok(heldPage,'failed page retried at offset50');
      const busyTree=(await browser.send('Accessibility.getFullAXTree')).nodes;
      assert.ok(busyTree.some(node=>node.role?.value==='button'&&node.name?.value==='More changes'&&node.properties?.some(p=>p.name==='disabled'&&p.value?.value===true)),'AX exposes busy More as disabled');
      await enter();await browser.click(moreSelector);
      await browser.send('Fetch.continueRequest',{requestId:heldPage});heldPage=null;
      await browser.waitFor(`document.querySelectorAll(${JSON.stringify(region+' li')}).length===100&&document.querySelector(${JSON.stringify(region)})?.getAttribute('aria-busy')==='false'`);
      assert.equal(await browser.eval(`document.activeElement===document.querySelector(${JSON.stringify(moreSelector)})`),true,'busy activations preserve More focus');
      await enter();
      await browser.waitFor(`document.querySelectorAll(${JSON.stringify(region+' li')}).length===${completeHistory.length}`);
      assert.deepEqual(await browser.eval(`Array.from(document.querySelectorAll(${JSON.stringify(region+' pre')})).map(node=>node.textContent)`),historyText(completeHistory));
      assert.deepEqual(pageOffsets,[0,50,50,100]);assert.deepEqual(interceptionErrors,[]);
      log('p2-history-pages','real failed-page retry, busy mouse/Enter, native Tab/focus and AX preserve every audit row');
    }finally{await browser.send('Fetch.disable').catch(()=>{});removeHistoryPause();}
    // Terminate the owned fixture process completely before opening its locked
    // directory again. An abrupt stop also checks committed-data durability.
    await stopFixture(server,true);server=start();await waitHealth();
    // The history check opened the model containing committed draft edits.
    // Accept its normal leave warning only for this intentional test reload.
    const removeHistoryReload=browser.on('Page.javascriptDialogOpening',event=>{
      if(event.type==='beforeunload'){
        log('p2-history-reload','accepted the committed draft leave warning for intentional restart verification');
        void browser.send('Page.handleJavaScriptDialog',{accept:true});
      }
    });
    try{await browser.goto(base);}finally{removeHistoryReload();}
    await browser.waitFor('document.querySelector(".team-account")');
    const retained=(await inApi(browser,'GET',`/api/projects/${pid}/documents/model/source`)).body;
    assert.ok(JSON.stringify(retained).includes('合成の犬'));
    log('p2-restart','persisted sessions, RDF and audit survived process restart');
    if(acceptRelease)await acceptRelease({browser,other,inApi,docker,stopEditor:()=>stopFixture(server,true)});
    log('p2','ALL STEPS PASSED (synthetic Google provider; real Google login remains an operations check)');
  }catch(error){
    for(const [index,page] of [browser,other].entries()){
      if(!page)continue;
      console.error('[p2-ui-diagnostic]',await page.eval('document.body.innerText.slice(0,2000)').catch(()=>''));
      await page.shot('p2-failure-'+index).catch(()=>{});
    }
    throw error;
  }finally{
    if(context&&browser)await browser.send('Target.disposeBrowserContext',{browserContextId:context},false).catch(()=>{});
    if(browser)await browser.close();await stopFixture(server);
    docker(['down','--remove-orphans']);
  }
}
