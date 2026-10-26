/*
================================================================================
FILE: frontend/src/team/client.test.ts
SUMMARY
    Team requests preserve version baselines and announce refusal without retry.
BASIC IDEA
    Exercise the shared transport through existing API reads and mutations.
INPUTS / INPUT SOURCES
    Synthetic responses with distinct current and expected versions.
EXPECTED OUTPUT
    Stable request identity and retained input baseline across polling.
================================================================================
*/
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureTeam, teamRequest, observeTeamResponse, subscribeTeam, acceptTeamVersions, isSharedTeamWrite, teamAuthEpoch, expectedTeamVersions } from './client';

describe('team client boundary', () => {
  beforeEach(() => configureTeam({mode:'local',authenticated:false,user:null,csrf:null}));
  it('keeps local calls identical and adds csrf, unique identity and versions only in team', () => {
    const input = {method:'POST',headers:{'X-Semantic-Studio':'1'}};
    expect(teamRequest(input)).toBe(input);
    configureTeam({mode:'team',authenticated:true,user:{sub:'a',email:'a@example.test',role:'editor',disabled:false,version:1},csrf:'secret'});
    acceptTeamVersions({'workspace':null,'graph:x':3});
    const first = teamRequest(input)!;
    expect(new Headers(first.headers).get('X-Semantic-Studio-Versions')).toBe('{"workspace":null,"graph:x":3}');
    expect(new Headers(first.headers).get('X-Semantic-Studio-Csrf')).toBe('secret');
    expect(new Headers(first.headers).get('X-Semantic-Studio-Request-Id')).not.toBe(new Headers(teamRequest(input)!.headers).get('X-Semantic-Studio-Request-Id'));
  });
  it('announces auth expiry and conflict without replacing the expected baseline', async () => {
    configureTeam({mode:'team',authenticated:true,user:null,csrf:'x'});
    acceptTeamVersions({workspace:1});
    const listener = vi.fn(); const stop = subscribeTeam(listener);
    await observeTeamResponse(new Response(JSON.stringify({code:'revision_conflict',currentVersions:{workspace:2}}),{status:409}));
    expect(listener).toHaveBeenCalledWith({kind:'conflict',versions:{workspace:2}});
    expect(new Headers(teamRequest({method:'POST'})!.headers).get('X-Semantic-Studio-Versions')).toBe('{"workspace":1}');
    await observeTeamResponse(new Response('{}',{status:401}));
    expect(listener).toHaveBeenCalledWith({kind:'expired'});
    stop();
  });
  it('keeps background versions and computations separate from mutation acknowledgements', async () => {
    configureTeam({mode:'team',authenticated:true,user:null,csrf:'x'});
    acceptTeamVersions({workspace:1});
    await observeTeamResponse(new Response('{}',{headers:{'X-Semantic-Studio-Versions':'{"workspace":2}'}}),false);
    expect(new Headers(teamRequest({method:'POST'})!.headers).get('X-Semantic-Studio-Versions')).toBe('{"workspace":1}');
    expect(isSharedTeamWrite('/api/projects/p/open',{method:'POST'})).toBe(false);
    expect(isSharedTeamWrite('/api/ontologies/o/sparql',{method:'POST'})).toBe(false);
    expect(isSharedTeamWrite('/api/projects/p/documents/model/commands',{method:'POST'})).toBe(true);
  });
  it('does not turn network approval into an editing conflict', async () => {
    configureTeam({mode:'team',authenticated:true,user:null,csrf:'x'});
    const listener=vi.fn(); const stop=subscribeTeam(listener);
    await observeTeamResponse(new Response(JSON.stringify({detail:{code:'approval_required',requests:[]}}),{status:409}));
    expect(listener).not.toHaveBeenCalled(); stop();
  });
  it('does not advance graph baselines or retain user keys after administration success', async()=>{
    configureTeam({mode:'team',authenticated:true,user:null,csrf:'x'});
    acceptTeamVersions({workspace:1,'graph:x':2});
    expect(isSharedTeamWrite('/api/team/users',{method:'PATCH'})).toBe(false);
    await observeTeamResponse(new Response('{}',{headers:{'X-Semantic-Studio-Versions':'{"workspace":9,"graph:x":9,"user:a":2}'}}),isSharedTeamWrite('/api/team/users',{method:'PATCH'}));
    const basis=JSON.parse(new Headers(teamRequest({method:'POST'})!.headers).get('X-Semantic-Studio-Versions')!);
    expect(basis).toEqual({workspace:1,'graph:x':2});
  });

  it('encodes Japanese, Latin1 and emoji resource keys as ASCII header JSON without changing keys',()=>{
    configureTeam({mode:'team',authenticated:true,user:null,csrf:'x'});
    const basis={workspace:1,'file:原本.bin':2,'file:😀.bin':3,'file:été.bin':4};
    acceptTeamVersions(basis);
    const request=teamRequest({method:'POST'})!;
    const raw=new Headers(request.headers).get('X-Semantic-Studio-Versions')!;
    expect(/^[\x20-\x7e]+$/.test(raw)).toBe(true);
    expect(JSON.parse(raw)).toEqual(basis);
  });

});

it('ignores stale-session responses but retains same-session expiry',async()=>{
 configureTeam({mode:'team',authenticated:true,user:null,csrf:'first'});const old=teamAuthEpoch();
 configureTeam({mode:'team',authenticated:true,user:null,csrf:'second'});acceptTeamVersions({workspace:3});
 const listener=vi.fn(),stop=subscribeTeam(listener);
 await observeTeamResponse(new Response('{}',{status:401}),true,old);
 await observeTeamResponse(new Response(JSON.stringify({code:'revision_conflict',currentVersions:{workspace:8}}),{status:409}),true,old);
 await observeTeamResponse(new Response('{}',{headers:{'X-Semantic-Studio-Versions':'{"workspace":9}'}}),true,old);
 expect(listener).not.toHaveBeenCalled();expect(expectedTeamVersions()).toEqual({workspace:3});
 await observeTeamResponse(new Response('{}',{status:401}),true,teamAuthEpoch());expect(listener).toHaveBeenCalledWith({kind:'expired'});stop();
});
it('keeps newer workspace acknowledgements after a slow older success',async()=>{
 configureTeam({mode:'team',authenticated:true,user:null,csrf:'same'});acceptTeamVersions({workspace:1});
 await observeTeamResponse(new Response('{}',{headers:{'X-Semantic-Studio-Versions':'{"workspace":3,"graph:x":3}'}}));
 await observeTeamResponse(new Response('{}',{headers:{'X-Semantic-Studio-Versions':'{"workspace":2,"graph:x":2}'}}));
 expect(expectedTeamVersions()).toEqual({workspace:3,'graph:x':3});
});
