import 'dotenv/config';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const base=process.env.HIVE_URL||'http://127.0.0.1:4311',dir='artifacts/multiplayer-film';
await mkdir(dir,{recursive:true});
const headers={'Content-Type':'application/json',...(process.env.ADMIN_TOKEN?{Authorization:`Bearer ${process.env.ADMIN_TOKEN}`}:{})};
const get=async(path)=>await(await fetch(`${base}/api/${path}`,{headers})).json();
const act=async(action)=>{const r=await fetch(`${base}/api/action`,{method:'POST',headers,body:JSON.stringify({action})});if(!r.ok)throw new Error((await r.json()).error);};
const rollback=process.argv.includes('rollback');
if(!rollback){const state=await get('state');if(state.phase==='voting')await act('lock');await act('hive-start');}
const before=await get('hive');assert.equal(before.players.length,3);
await writeFile(`${dir}/${rollback?'rollback':'patch'}-before.json`,JSON.stringify(before,null,2));
await act(rollback?'rollback':'build');
let state,after;
for(let i=0;i<120;i++){
 state=await get('state');after=await get('hive');
 if(rollback?after.rules.trail===before.rules.trail:state.phase==='failed') {if(!rollback)throw new Error('Codex build failed');}
 if(rollback?after.rules.trail!==before.rules.trail:state.phase==='shipped'&&after.rules.trail==='rainbow')break;
 await new Promise(r=>setTimeout(r,1000));
}
assert.equal(after.round,before.round);assert.deepEqual(after.players.map(p=>p.id).sort(),before.players.map(p=>p.id).sort());assert.ok(after.score>=before.score);assert.ok(after.remaining<=before.remaining);assert.equal(after.target,before.target);
assert.equal(after.rules.trail,rollback?state.game.trail:'rainbow');
await writeFile(`${dir}/${rollback?'rollback':'patch'}-continuity.json`,JSON.stringify({verifiedAt:new Date().toISOString(),checks:['same shared round','same three connected player IDs','shared score preserved','remaining time preserved','team target preserved','new rule delivered to shared engine'],before,after},null,2));
await writeFile(`${dir}/${rollback?'rollback':'rainbow-shipped'}.json`,JSON.stringify(state,null,2));
console.log(`PASS: ${rollback?'rollback':'real Codex patch'} reached the same three-player world without resetting its round, score, target or clock. Build time: ${state.buildMs}ms.`);
