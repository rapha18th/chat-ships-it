import 'dotenv/config';
import {mkdir, writeFile} from 'node:fs/promises';
const multiplayer=process.argv.includes('multiplayer');
const root = multiplayer?'artifacts/multiplayer-film':'artifacts/film';
await mkdir(root, {recursive:true});
const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error('Gemini key missing');
const endpoint = 'https://generativelanguage.googleapis.com/v1beta';
const sections = multiplayer ? [
  ['01-intro','This garden belongs to everyone. Three bees. One world. One shared goal. A community that creates the rules and plays the game together. This is Chat Ships It.'],
  ['02-create','The streamer describes a garden. Codex creates a playable starting game. The owner previews it and publishes it. Viewers open the player link, choose a guest name, and join the same world.'],
  ['03-chat','Here we are using three scripted demo players connected to the real multiplayer server. Each bee moves independently. Nectar collected by any bee counts toward the same team goal. Every client receives the same positions, score, and clock.'],
  ['04-build','Now the community changes its world. A proposal arrives through real Twitch chat. We send a vote from the owner account for this controlled demo. Codex writes the winning patch. The checks pass. Every bee gets the rainbow trail. The shared round continues.'],
  ['05-control','The streamer can roll back the patch for everyone. Player positions, the shared score, and the remaining time stay together. The community keeps its progress. The streamer starts the next round when the hive is ready.'],
  ['06-codex','We built the studio with Codex. It helped implement Twitch EventSub, the authoritative multiplayer engine, the interface, and the tests. Inside the product, Codex creates games and writes live patches. Gemini screens ideas before they reach the coding worker. The community creates. The community plays. Codex ships. Every stream gets a game of its own.'],
] : [
  ['01-intro', 'A game begins with an idea. A tiny bee. A glowing garden. One minute to gather the nectar. Now give that world to your community. This is Chat Ships It.'],
  ['02-create', 'The channel owner describes a world and chooses a challenge. Codex creates a playable game. The owner tries it, then publishes it. Three engines. Four worlds. One place to begin.'],
  ['03-chat', 'Now chat gets a turn. We are using a controlled demonstration on our own Twitch channel. The messages travel through Twitch and arrive in the studio. A proposal becomes a choice. The community votes. The streamer approves the build.'],
  ['04-build', 'Codex writes the winning rule as a TypeScript artifact. You can see the work happen. The engine checks the syntax, the capabilities, and the simulation. The patch passes. The bee gets its rainbow trail. The garden keeps running.'],
  ['05-control', 'The streamer stays in control. Roll back the last patch. Restore the starting rules. Every accepted change has a visible author and a clear result. Gemini screens each idea before it reaches Codex. Generated artifacts stay inside the capabilities of the game engine.'],
  ['06-codex', 'We built the studio with Codex. We used it to implement Twitch chat, create the game engines, refine the interface, and test the rules. Codex also works inside the finished product. It creates the starting world. It writes the next patch. The streamer creates. The community decides. Codex ships. Chat Ships It. Every stream gets a game of its own.'],
];
await writeFile(`${root}/narration.json`, JSON.stringify(sections,null,2));
const style = 'Original male product presenter. Warm, articulate, composed, quietly excited. Neutral international English. Clear diction. Deliberate product-launch delivery at 132 words per minute. Short pauses after sentences. Confident falling cadence. No impersonation. No music or sound effects.';
async function generate(body, path) {
  const r = await fetch(`${endpoint}/interactions`, {method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':key}, body:JSON.stringify(body), signal:AbortSignal.timeout(480000)});
  if (!r.ok) { const err=await r.json().catch(()=>({})); throw new Error(`Generation ${r.status}: ${err.error?.message || 'unavailable'}`); }
  const data = await r.json();
  const blocks=(data.steps||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='audio'&&x.data);
  if(!blocks.length) throw new Error(`No audio returned; fields ${Object.keys(data)}`);
  await writeFile(path,Buffer.concat(blocks.map(x=>Buffer.from(x.data,'base64'))));
  console.log(`Saved ${path}`);
}
if(process.argv[2]==='music') {
 await generate({model:'lyria-3.5', input:'An original instrumental electronic ambient composition, 160 seconds, 100 BPM. Felt piano, warm pads, soft synth pulse, delicate arpeggios, restrained strings. Quietly optimistic mood. Sparse arrangement with a gentle build and a spacious piano ending. Instrumental throughout. Stereo studio recording.'},`${root}/lyria-score.mp3`);
} else {
 const list=await(await fetch(`${endpoint}/models`,{headers:{'x-goog-api-key':key}})).json();
 console.log('Available audio models:',(list.models||[]).map(x=>x.name).filter(x=>/3.8.*tts|lyria-3.5/.test(x)));
 for(const [name,text] of sections) await generate({model:'gemini-3.8-flash-tts', input:[{type:'user_input',content:[{type:'text',text,annotations:[{type:'speech_metadata',style}]}]}],response_format:{type:'audio'}, generation_config:{speech_config:[{voice:'Charon'}]}},`${root}/${name}.wav`);
}
