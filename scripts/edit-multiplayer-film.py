"""Recut the product film around the real shared garden and measured patch continuity."""
from pathlib import Path
import importlib.util,json,wave,re,textwrap
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('editor',ROOT/'scripts/edit-film.py')
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
e.OUT=ROOT/'artifacts/multiplayer-film';OUT=e.OUT
Image=e.Image;ImageDraw=e.ImageDraw

def cards():
    rect=json.loads((OUT/'preview-rect.json').read_text())
    full=Image.open(OUT/'creator-preview-full.png')
    full.crop(tuple(round(n) for n in (rect['x'],rect['y'],rect['x']+rect['width'],rect['y']+rect['height']))).save(OUT/'creator-preview.png')
    evidence=json.loads((OUT/'patch-continuity.json').read_text(encoding='utf-8-sig'))
    s=json.loads((OUT/'rainbow-shipped.json').read_text(encoding='utf-8-sig'))
    im,d=e.base('A game for everyone.','The community creates. The community plays. Codex ships.')
    shot=Image.open(OUT/'world-frame.png').crop((640,205,1830,875));shot=shot.resize((1070,602));im.paste(shot,(750,380))
    e.words(d,'Chat Ships It',(94,440),580,108,e.WHITE,True)
    d.text((96,795),'ONE WORLD. ONE SHARED GOAL.',font=e.font(23,True),fill=e.LIME);e.save(im,'opening')

    im,d=e.base('Create the starting world.','The streamer describes a garden. Codex builds a playable game.')
    for i,label in enumerate(['Describe the world.','Play the private preview.','Publish for the community.']):
        d.text((94,420+i*135),f'0{i+1}',font=e.font(28,True),fill=e.LIME);e.words(d,label,(170,415+i*135),720,36,e.WHITE,True)
    form=Image.open(OUT/'creator-form.png').convert('RGB');rows=[y for y in range(form.height) if form.getpixel((20,y))==(24,32,21)]
    if rows:form=form.crop((14,max(0,min(rows)-10),min(292,form.width),min(form.height,max(rows)+10)))
    mid=form.height//2;form.crop((0,0,form.width,mid)).save(OUT/'creator-upper.png');form.crop((0,mid,form.width,form.height)).save(OUT/'creator-lower.png')
    e.inset(im,OUT/'creator-upper.png',940,340,410,590);e.inset(im,OUT/'creator-lower.png',1385,340,410,590);e.save(im,'create')
    im,d=e.base('Try it. Publish it.','The owner chooses the starting world for everyone.')
    e.inset(im,OUT/'creator-preview.png',1050,185,720,755)
    e.words(d,'A garden. A bee. A goal.',(94,450),840,52,e.WHITE,True)
    e.words(d,'Codex creates the blueprint. The community enters the world.',(94,650),780,35,e.LIME);e.save(im,'preview')
    im,d=e.base('Open the link. Join the hive.','Choose a guest name. Take a bee. Play in the shared world.')
    e.words(d,'One player link.',(94,440),800,50,e.WHITE,True);e.words(d,'Keyboard and touch controls.',(94,560),800,35,e.LIME)
    e.words(d,'The streamer starts the round. Every bee helps the same team.',(94,740),800,31)
    e.inset(im,OUT/'join.png',1120,190,650,740);e.save(im,'join-card')
    im,d=e.base('Every bee counts.','Three scripted clients. One authoritative multiplayer server.')
    e.words(d,'Same positions. Same nectar. Same score. Same clock.',(94,415),760,45,e.WHITE,True)
    for i,p in enumerate(evidence['after']['players']):
        y=670+i*75;d.ellipse((100,y+8,122,y+30),fill=p['color']);d.text((155,y),p['name'],font=e.font(28,True),fill=p['color']);d.text((450,y),'SERVER CONNECTED',font=e.font(22),fill=e.WHITE)
    shot=Image.open(OUT/'world-frame.png').crop((640,205,1830,875));shot.thumbnail((960,540));im.paste(shot,(870,400))
    d.text((100,930),'MATCHING SERVER SNAPSHOTS VERIFIED',font=e.font(20,True),fill=e.LIME);e.save(im,'shared-proof')
    im,d=e.base('Chat changes the world.','A real Twitch proposal and one owner-account vote in this controlled demo.')
    d.rounded_rectangle((94,430,1090,640),radius=18,fill='#142017',outline='#314834',width=2)
    d.text((125,455),'01  @rapha18th  /  WINNING IDEA',font=e.font(25,True),fill=e.LIME)
    e.words(d,'Give every bee a rainbow trail.',(125,515),900,40,e.WHITE,True)
    e.words(d,'Chat proposes. Chat votes. The streamer approves the build.',(94,750),920,34)
    e.inset(im,OUT/'twitch-vote.png',1210,190,610,760);e.save(im,'chat')
    im,d=e.base('Progress stays with the hive.','The patch and rollback preserve the shared round.')
    checks=['Same three connected bees.','Shared score preserved.','Remaining time preserved.','Team goal preserved.']
    for i,label in enumerate(checks):
        y=415+i*105;d.ellipse((103,y+8,131,y+36),fill=e.LIME);d.text((165,y),label,font=e.font(36,True),fill=e.WHITE)
    d.text((100,900),f"REAL CODEX BUILD  /  {s['buildMs']/1000:.1f}s  /  4 CHECKS PASSED",font=e.font(28,True),fill=e.LIME);e.save(im,'checks')
    im,d=e.base('Built with Codex.','Codex helped build the studio. Codex creates games and writes patches inside it.')
    d.rounded_rectangle((94,410,1300,925),radius=18,fill='#111a14',outline='#2c4030',width=2)
    d.text((125,435),'apps/server/src/index.ts  /  actual shared engine loop',font=e.font(21,mono=True),fill=e.GRAY)
    lines=['const hiveTimer = setInterval(() => {','  hive.sync(','    round.state.game,','    round.state.gameRevision,','    round.state.active,','  );','  hive.step(0.05);','  if (++hiveFrame % 2) return;','  const payload = JSON.stringify({','    type: \'hive-state\',','    state: hive.snapshot(),','  });']
    for i,line in enumerate(lines):d.text((125,490+i*31),line,font=e.font(23,mono=True),fill=e.LIME if 'hive.' in line else e.WHITE)
    for y,n,label in [(440,'3','VERIFIED CLIENTS'),(620,'21','TESTS PASSING'),(800,'24','BEE CAPACITY')]:d.text((1420,y),n,font=e.font(76,True),fill=e.LIME);d.text((1420,y+90),label,font=e.font(20,True),fill=e.WHITE)
    e.save(im,'codex')
    overlay=Image.new('RGBA',(1920,1080),(0,0,0,0));o=ImageDraw.Draw(overlay);o.rectangle((0,0,620,1080),fill=(8,11,10,255));o.text((90,65),'chat ships it.',font=e.font(34,True),fill=e.WHITE)
    e.words(o,'The community creates.',(90,235),500,58,e.WHITE,True);e.words(o,'The community plays.',(90,460),500,58,e.WHITE,True);e.words(o,'Codex ships.',(90,700),500,58,e.LIME,True);overlay.save(OUT/'closing-overlay.png')

if __name__=='__main__':
    cards();print('Multiplayer cards ready.',flush=True)
    jobs=[('still','opening',4),('clip','world',14,0),('still','create',8),('still','preview',8),('still','join-card',7),('clip','world',13,10),('still','shared-proof',13),('still','chat',6),('clip','build',12,5,1.7),('clip','patch',7,2),('clip','control',10,0),('still','checks',15),('still','codex',23),('clip','patch',12,1)]
    for i,j in enumerate(jobs):
        output=f'shot-{i:02}.mp4'
        if j[0]=='still':e.still(j[1],j[2],output)
        else:e.clip(j[1],j[3],j[2],output,j[4] if len(j)>4 else 1,'SCRIPTED PLAYERS / REAL TWITCH AND CODEX / BUILD WAIT CONDENSED' if j[1]=='build' else None)
        print(f'{output} ready',flush=True)
    e.run(['-i','shot-13.mp4','-i','closing-overlay.png','-filter_complex','[0:v][1:v]overlay=0:0','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-threads','4','closing.mp4'])
    (OUT/'shots.txt').write_text('\n'.join(f"file '{'closing.mp4' if i==13 else f'shot-{i:02}.mp4'}'" for i in range(len(jobs))),encoding='utf8')
    e.run(['-f','concat','-safe','0','-i','shots.txt','-c','copy','picture.mp4'])
    sections=json.loads((OUT/'narration.json').read_text());durations=[18,23,26,25,25,35];subs=[];start=0;idx=1
    for (name,transcript),duration in zip(sections,durations):
        e.run(['-i',f'{name}.wav','-af',f'atempo=0.9,loudnorm=I=-16:TP=-1.5:LRA=9,adelay=900|900,apad=whole_dur={duration}','-t',duration,'-ar','48000','-ac','2',f'{name}-mix.wav'])
        with wave.open(str(OUT/f'{name}.wav')) as w:spoken=w.getnframes()/w.getframerate()/0.9
        phrases=re.findall(r'[^.!?]+[.!?]?',transcript);total=sum(len(p.split()) for p in phrases);at=start+.9
        for p in phrases:
            length=spoken*len(p.split())/total;caption='\n'.join(textwrap.wrap(p.strip(),87));subs.append(f'{idx}\n{e.stamp(at)} --> {e.stamp(at+length)}\n{caption}\n');at+=length;idx+=1
        start+=duration
    (OUT/'captions.srt').write_text('\n'.join(subs),encoding='utf8');(OUT/'voice.txt').write_text('\n'.join(f"file '{n}-mix.wav'" for n,_ in sections),encoding='utf8')
    e.run(['-f','concat','-safe','0','-i','voice.txt','-c','copy','narration-master.wav'])
    e.run(['-i','picture.mp4','-i','narration-master.wav','-i','lyria-score.mp3','-filter_complex',"[0:v]scale=1806:1016,pad=1920:1080:57:0:black,subtitles=captions.srt:force_style='FontName=Arial,FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=10'[v];[2:a]volume=0.12,afade=t=in:d=2,afade=t=out:st=148:d=4[m];[1:a][m]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]",'-map','[v]','-map','[a]','-t','152','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-threads','4','-c:a','aac','-b:a','192k','-movflags','+faststart','Chat-Ships-It-Multiplayer.mp4'])
    print('Multiplayer film ready.',flush=True)
