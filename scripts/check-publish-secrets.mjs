import {execFileSync} from 'node:child_process';
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const forbidden=files.filter(p=>/(^|\/)\.local\/|(^|\/)artifacts\/|(^|\/)\.env($|\.)/.test(p)&&p!=='.env.example');
const history=execFileSync('git',['log','--all','-p','--no-ext-diff'],{encoding:'utf8',maxBuffer:32*1024*1024});
const patterns=[['Google API key',/AIza[0-9A-Za-z_-]{30,}/],['GitHub token',/gh[pousr]_[A-Za-z0-9]{25,}/],['OpenAI key',/sk-(?:proj-)?[A-Za-z0-9_-]{30,}/],['Private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/]];
const hits=patterns.filter(([,r])=>r.test(history)).map(([name])=>name);
if(forbidden.length||hits.length){console.error(JSON.stringify({forbiddenFiles:forbidden,secretTypes:hits}));process.exit(1);}
console.log(`PASS: ${files.length} tracked files and all commit patches checked. No credential files or recognized secret patterns found.`);
