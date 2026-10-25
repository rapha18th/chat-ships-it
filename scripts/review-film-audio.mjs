import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
// Official inline audio input verified 2026-10-25: https://ai.google.dev/gemini-api/docs/audio
const data=(await readFile('artifacts/film/final-audio.mp3')).toString('base64');
const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify({model:'gemini-3.8-flash',input:[{type:'text',text:'Quality-check this product demo soundtrack. Transcribe all spoken words. Describe voice intelligibility, relative music loudness, clipping or artifacts, any vocals in the music, any unexpected words or stage directions. Identify any material audio issue. Be specific and concise.'},{type:'audio',data,mime_type:'audio/mp3'}]}),signal:AbortSignal.timeout(120000)});
if(!response.ok)throw new Error(`Audio review unavailable: ${response.status}`);
const result=await response.json();const text=(result.steps||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('\n');
await writeFile('artifacts/film/audio-review.md',text);console.log(text);
