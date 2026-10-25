import 'dotenv/config';
import {appendFileSync, mkdirSync} from 'node:fs';
import {WebSocket} from 'ws';
mkdirSync('artifacts/film',{recursive:true});
const socket=new WebSocket('ws://127.0.0.1:4310/ws');
socket.on('open',()=>socket.send(JSON.stringify({type:'authenticate',token:process.env.ADMIN_TOKEN||''})));
socket.on('message',raw=>{const message=JSON.parse(raw.toString());if(message.type==='state')appendFileSync('artifacts/film/demo-evidence.jsonl',JSON.stringify({capturedAt:new Date().toISOString(),...message})+'\n');});
setTimeout(()=>socket.close(),15*60*1000);
console.log('Recording real demo state changes.');
