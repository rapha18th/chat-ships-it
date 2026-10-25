"""Edit recorded product footage and original generated audio into the final film."""
from pathlib import Path
import json, subprocess, re, textwrap, sys
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/film'
FF=next((ROOT/'.local/media-tools').glob('**/ffmpeg.exe'))
FONT=Path('C:/Windows/Fonts')
BG='#080b0a'; WHITE='#f4f3ee'; LIME='#b9f879'; GRAY='#a0aaa3'

def font(size,bold=False,mono=False):
    return ImageFont.truetype(str(FONT/('consola.ttf' if mono else 'arialbd.ttf' if bold else 'arial.ttf')),size)
def words(draw,s,xy,width,size=30,color=GRAY,bold=False):
    x,y=xy;line=''
    for w in s.split():
        trial=f'{line} {w}'.strip()
        if draw.textlength(trial,font=font(size,bold))>width and line:
            draw.text((x,y),line,font=font(size,bold),fill=color);y+=int(size*1.45);line=w
        else:line=trial
    draw.text((x,y),line,font=font(size,bold),fill=color)
    return y+int(size*1.45)
def base(title,sub=''):
    im=Image.new('RGB',(1920,1080),BG);d=ImageDraw.Draw(im)
    d.text((90,58),'chat ships it.',font=font(34,True),fill=WHITE)
    d.text((1515,67),'CODEX × TWITCH',font=font(20,True),fill=GRAY)
    d.line((90,135,1830,135),fill=LIME,width=2)
    d.text((90,205),title,font=font(66,True),fill=WHITE)
    if sub:words(d,sub,(94,298),1050,29)
    d.text((94,990),'CONTROLLED DEMO  /  OWNER ACCOUNT',font=font(18),fill=GRAY)
    return im,d
def save(im,name):im.save(OUT/f'{name}.png')
def inset(im,path,x,y,w,maxh):
    shot=Image.open(path).convert('RGB');ratio=min(w/shot.width,maxh/shot.height)
    shot=shot.resize((round(shot.width*ratio),round(shot.height*ratio)),Image.Resampling.LANCZOS)
    im.paste(shot,(x+(w-shot.width)//2,y))

def cards():
    s=json.loads((OUT/'rainbow-shipped.json').read_text(encoding='utf-8-sig'))
    im,d=base('Every stream gets a game.','The streamer creates. The community decides. Codex ships.')
    frame=Image.open(OUT/'patch-frame.png').crop((640,205,1830,875));frame.thumbnail((1070,602))
    im.paste(frame,(750,380))
    words(d,'Chat\nShips It'.replace('\n',' '),(94,460),580,110,WHITE,True)
    d.text((96,795),'A WORLD BUILT TOGETHER.',font=font(23,True),fill=LIME)
    save(im,'opening')

    im,d=base('Start with an idea.','The owner chooses a challenge and describes the world.')
    y=420
    for a,b in [('01','Choose an engine.'),('02','Describe the world.'),('03','Let Codex build it.')]:
        d.text((100,y),a,font=font(29,True),fill=LIME);d.text((175,y-4),b,font=font(37,True),fill=WHITE);y+=125
    form=Image.open(OUT/'creator-form.png').convert('RGB')
    rows=[y for y in range(form.height) if form.getpixel((20,y))==(24,32,21)]
    if rows:
        form=form.crop((14,max(0,min(rows)-10),min(292,form.width),min(form.height,max(rows)+10)))
    middle=form.height//2
    form.crop((0,0,form.width,middle)).save(OUT/'creator-upper.png')
    form.crop((0,middle,form.width,form.height)).save(OUT/'creator-lower.png')
    inset(im,OUT/'creator-upper.png',940,340,410,590)
    inset(im,OUT/'creator-lower.png',1385,340,410,590)
    save(im,'create')

    im,d=base('Try it. Publish it.','A playable preview gives the owner the final decision.')
    inset(im,OUT/'creator-preview.png',1050,185,720,755)
    words(d,'Shooter. Survival. Collection.',(94,440),830,50,WHITE,True)
    words(d,'Space. Ocean. Garden. Neon.',(94,620),830,38,LIME)
    words(d,'Each published world becomes the baseline for the next chat patch.',(94,790),790,28)
    save(im,'preview')

    for vote,name in [(False,'chat'),(True,'vote')]:
        im,d=base('The community decides.' if vote else 'Chat gets a turn.','Real Twitch messages. A controlled demonstration on @rapha18th.')
        d.rounded_rectangle((94,420,1080,625),radius=20,fill='#142017',outline='#314834',width=2)
        d.text((125,445),'01  @rapha18th',font=font(26,True),fill=LIME)
        words(d,'Set player trail to rainbow.',(125,500),880,40,WHITE,True)
        d.rounded_rectangle((94,655,1080,845),radius=20,fill='#101613',outline='#26332b',width=2)
        d.text((125,680),'02  @rapha18th',font=font(26,True),fill=GRAY)
        words(d,'Set asteroid speed to 0.9.',(125,735),880,36,WHITE)
        if vote:
            d.text((94,900),'1 REAL VOTE  /  RAINBOW WINS',font=font(25,True),fill=LIME)
        inset(im,OUT/('twitch-vote.png' if vote else 'twitch-chat.png'),1210,190,610,760)
        save(im,name)

    im,d=base('Every patch earns its place.','The accepted artifact passed all four checks.')
    for i,g in enumerate(s['gates']):
        y=425+i*115
        d.ellipse((103,y+8,131,y+36),fill=LIME)
        d.text((165,y),g['name'],font=font(33,True),fill=WHITE)
        words(d,g['detail'],(165,y+48),1540,23)
    d.text((1200,900),f"{s['buildMs']/1000:.1f}s REAL CODEX BUILD",font=font(29,True),fill=LIME)
    save(im,'checks')

    im,d=base('Built with Codex.','Codex helped build the studio. Codex powers the finished product.')
    lines=["import { Codex } from '@openai/codex-sdk';",'', 'const thread = codex.startThread({', "  sandboxMode: 'read-only',",'  networkAccessEnabled: false,', "  approvalPolicy: 'never',",'});','', 'const { events } = await thread.runStreamed(prompt, {','  outputSchema: schema,','  signal: AbortSignal.any([signal, timeout]),','});']
    d.rounded_rectangle((94,415,1280,920),radius=18,fill='#111a14',outline='#2c4030',width=2)
    d.text((124,438),'apps/server/src/worker.ts  /  actual project source',font=font(21,mono=True),fill=GRAY)
    for i,line in enumerate(lines):d.text((125,490+i*32),line,font=font(23,mono=True),fill=LIME if 'Codex' in line or 'runStreamed' in line else WHITE)
    for y,n,label in [(445,'3','GAME ENGINES'),(620,'17','TESTS PASSING'),(795,'2','CODEX ROLES')]:
        d.text((1400,y),n,font=font(80,True),fill=LIME);d.text((1400,y+91),label,font=font(21,True),fill=WHITE)
    save(im,'codex')
    overlay=Image.new('RGBA',(1920,1080),(0,0,0,0));o=ImageDraw.Draw(overlay)
    o.rectangle((0,0,620,1080),fill=(8,11,10,255));o.text((90,65),'chat ships it.',font=font(34,True),fill=WHITE)
    words(o,'The streamer creates.',(90,235),500,58,WHITE,True)
    words(o,'The community decides.',(90,420),500,58,WHITE,True)
    words(o,'Codex ships.',(90,665),500,58,LIME,True)
    overlay.save(OUT/'closing-overlay.png')

def run(args):
    p=subprocess.run([str(FF),'-y','-hide_banner','-loglevel','error',*map(str,args)],cwd=OUT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    if p.returncode:raise RuntimeError(p.stderr[-2500:])
def still(name,duration,output):
    run(['-loop','1','-framerate','30','-i',f'{name}.png','-t',duration,'-vf','scale=1920:1080,setsar=1,fade=t=in:st=0:d=0.3','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-threads','4',output])
def clip(name,start,duration,output,speed=1,label=None):
    vf=f'setpts=(PTS-STARTPTS)/{speed},fps=30,scale=1920:1080,setsar=1'
    if label:
        (OUT/'wait-label.txt').write_text(label,encoding='utf8')
        vf+=",drawbox=x=650:y=155:w=1170:h=44:color=black@0.85:t=fill,drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':textfile=wait-label.txt:fontcolor=white:fontsize=21:x=672:y=166"
    run(['-ss',start,'-i',f'{name}.webm','-t',duration,'-an','-vf',vf,'-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-threads','4',output])
def stamp(t):
    ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'

if __name__=='__main__':
    rect=json.loads((OUT/'preview-rect.json').read_text())
    preview=Image.open(OUT/'creator-preview-full.png')
    preview.crop((round(rect['x']),round(rect['y']),round(rect['x']+rect['width']),round(rect['y']+rect['height']))).save(OUT/'creator-preview.png')
    cards();print('Cards rendered.',flush=True)
    jobs=[('still','opening',4),('clip','world',14,0),('still','create',11),('still','preview',12),('still','chat',13),('still','vote',13),('clip','build',18,5,1.5),('clip','patch',7,2),('clip','control',10,15),('still','checks',15),('still','codex',23),('clip','patch',12,0)]
    for i,j in enumerate(jobs):
        output=f'shot-{i:02}.mp4'
        refresh=[9] if '--checks-only' in sys.argv else [0,2,3,4,5,9,10]
        if ('--resume' in sys.argv or '--checks-only' in sys.argv) and i not in refresh and (OUT/output).exists():continue
        if j[0]=='still':still(j[1],j[2],output)
        else:clip(j[1],j[3],j[2],output,j[4] if len(j)>4 else 1,'CONTROLLED TWITCH DEMO  /  BUILD WAIT CONDENSED' if j[1]=='build' else None)
        print(f'{output} ready',flush=True)
    # Resolve the final product promise over real recorded gameplay.
    run(['-i','shot-11.mp4','-i','closing-overlay.png','-filter_complex','[0:v][1:v]overlay=0:0','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-threads','4','closing.mp4'])
    paths=[f"file '{'closing.mp4' if i==11 else f'shot-{i:02}.mp4'}'" for i in range(len(jobs))]
    (OUT/'shots.txt').write_text('\n'.join(paths),encoding='utf8')
    run(['-f','concat','-safe','0','-i','shots.txt','-c','copy','picture.mp4'])
    sections=json.loads((OUT/'narration.json').read_text())
    durations=[18,23,26,25,25,35];start=0;subs=[];idx=1
    for (name,transcript),duration in zip(sections,durations):
        run(['-i',f'{name}.wav','-af',f'atempo=0.9,loudnorm=I=-16:TP=-1.5:LRA=9,adelay=900|900,apad=whole_dur={duration}','-t',duration,'-ar','48000','-ac','2',f'{name}-mix.wav'])
        # Phrase captions follow the measured source duration and narration pace.
        import wave
        with wave.open(str(OUT/f'{name}.wav')) as w: spoken=w.getnframes()/w.getframerate()/0.9
        phrases=re.findall(r'[^.!?]+[.!?]?',transcript)
        total=sum(len(p.split()) for p in phrases);at=start+0.9
        for phrase in phrases:
            length=spoken*len(phrase.split())/total
            caption='\n'.join(textwrap.wrap(phrase.strip(),width=87))
            subs.append(f'{idx}\n{stamp(at)} --> {stamp(at+length)}\n{caption}\n');at+=length;idx+=1
        start+=duration
    (OUT/'captions.srt').write_text('\n'.join(subs),encoding='utf8')
    (OUT/'voice.txt').write_text('\n'.join(f"file '{name}-mix.wav'" for name,_ in sections),encoding='utf8')
    run(['-f','concat','-safe','0','-i','voice.txt','-c','copy','narration-master.wav'])
    run(['-i','picture.mp4','-i','narration-master.wav','-i','lyria-score.mp3','-filter_complex',"[0:v]scale=1806:1016,pad=1920:1080:57:0:black,subtitles=captions.srt:force_style='FontName=Arial,FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=10'[v];[2:a]volume=0.12,afade=t=in:d=2,afade=t=out:st=148:d=4[m];[1:a][m]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]",'-map','[v]','-map','[a]','-t','152','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-threads','4','-c:a','aac','-b:a','192k','-movflags','+faststart','Chat-Ships-It-Final.mp4'])
    print('Final film ready: artifacts/film/Chat-Ships-It-Final.mp4',flush=True)
