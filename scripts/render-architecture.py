"""Render a source-verified architecture figure for the Devpost write-up."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/images/architecture.png'
OUT.parent.mkdir(parents=True,exist_ok=True)
im=Image.new('RGB',(2040,1500),'#f6f5f1');d=ImageDraw.Draw(im)
INK='#171717';GRAY='#626366';PURPLE='#9146ff';LINE='#cbc9c4';WHITE='#ffffff'
def f(n,bold=False,mono=False):
    return ImageFont.truetype('C:/Windows/Fonts/'+('consola.ttf' if mono else 'arialbd.ttf' if bold else 'arial.ttf'),n)
def text(x,y,s,size=25,color=INK,bold=False,mono=False):d.text((x,y),s,font=f(size,bold,mono),fill=color)
def arrow(points,color=INK,dashed=False):
    for a,b in zip(points,points[1:]):
        if dashed:
            length=math.dist(a,b)
            for t in range(0,int(length),19):
                u=t/length;v=min(1,(t+10)/length)
                d.line((a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[0]+(b[0]-a[0])*v,a[1]+(b[1]-a[1])*v),fill=color,width=3)
        else:d.line((a,b),fill=color,width=3)
    a,b=points[-2:];angle=math.atan2(b[1]-a[1],b[0]-a[0]);p=[b]
    for da in [-.5,.5]:p.append((b[0]-15*math.cos(angle+da),b[1]-15*math.sin(angle+da)))
    d.polygon(p,fill=color)
def box(x,y,w,title,lines,accent=INK,tag=''):
    d.rounded_rectangle((x,y,x+w,y+190),radius=9,fill=WHITE,outline=LINE,width=2)
    d.rectangle((x,y,x+6,y+190),fill=accent)
    if tag:text(x+24,y+18,tag,18,accent,True,True)
    text(x+24,y+56,title,29,INK,True)
    for i,s in enumerate(lines):text(x+24,y+103+i*31,s,23,GRAY)

text(80,55,'CHAT SHIPS IT',22,INK,True,True)
text(80,105,'From community idea to playable rule.',56,INK,True)
text(80,178,'SYSTEM ARCHITECTURE  /  TYPESCRIPT + FASTIFY + CANVAS',21,GRAY,False,True)
text(80,242,'01  CREATE A STARTING GAME',23,INK,True,True)
xs=[80,550,1020,1490];w=420
# Connections are drawn first so ports terminate cleanly at the component boundary.
for y,col in [(390,INK),(770,PURPLE)]:
    for a,b in zip(xs,xs[1:]):arrow([(a+w,y),(b,y)],col)
box(80,295,w,'Creator brief',['Choose an engine + world','Describe the starting game'],tag='BROWSER / OWNER')
box(550,295,w,'Gemini screening',['Admit supported capabilities','Produce a neutral specification'],tag='AI / SPECIFICATION')
box(1020,295,w,'Codex SDK worker',['Generate TypeScript blueprint','Stream build activity'],tag='AI / GENERATION')
box(1490,295,w,'Checks + private preview',['Validate the blueprint','Owner plays, then publishes'],tag='APPLICATION / REVIEW')

text(80,586,'02  EVOLVE IT THROUGH TWITCH',23,PURPLE,True,True)
box(80,675,w,'Twitch chat',['!mod proposals + viewer votes','OAuth + EventSub'],PURPLE,'TWITCH / EVENTS')
box(550,675,w,'Gemini screening',['Screen proposal text','Normalize the capability spec'],PURPLE,'AI / SPECIFICATION')
box(1020,675,w,'Vote + owner approval',['One vote per viewer','Streamer approves the winner'],PURPLE,'APPLICATION / CONTROL')
box(1490,675,w,'Codex patch + checks',['Generate literal rule object','Validate before applying'],INK,'AI + APPLICATION')
arrow([(290,865),(290,920),(1230,920),(1230,865)],PURPLE,True)
text(500,886,'Vote events go directly to the ballot.',20,PURPLE,False,True)
# Creation and live changes converge on the existing published world.
arrow([(1910,390),(1970,390),(1970,987),(610,987),(610,1100)],INK)
arrow([(1910,770),(1970,770)],INK)
d.rectangle((720,963,1330,1008),fill='#f6f5f1')
text(750,971,'PUBLISH BLUEPRINT / APPLY RULE',20,INK,True,True)

text(80,1050,'03  PLAY IN THE SHARED WORLD',23,INK,True,True)
box(80,1100,550,'Fastify + state hub',['Published blueprint + active rules','Persisted world / rollback controls'],tag='SERVER / CONTROL STATE')
box(750,1100,550,'Authoritative shared room',['20 Hz movement, collisions + score','One team goal + one clock'],tag='SERVER / GARDEN EXAMPLE')
box(1420,1100,550,'Canvas player clients',['Render matching shared snapshots','Keyboard + touch steering'],tag='BROWSER / PLAYERS')
arrow([(630,1195),(750,1195)])
text(649,1150,'rules',18,GRAY,False,True)
arrow([(1300,1170),(1420,1170)])
text(1307,1118,'10 Hz',18,GRAY,False,True)
arrow([(1420,1253),(1300,1253)],PURPLE)
text(1310,1270,'inputs',18,PURPLE,False,True)

d.line((80,1340,1970,1340),fill=LINE,width=2)
text(80,1364,'FOUR CHECKS',18,INK,True,True)
text(300,1364,'Literal-only AST  /  schema + bounds  /  deterministic simulation  /  validation budget',21,INK)
text(80,1404,'A rejected artifact leaves current rules active. One repair attempt returns validation diagnostics to Codex.',21,GRAY)
text(80,1442,'Creator engines: shooter, survival, collector. Shared multiplayer: bee garden example. Other engines run solo.',20,GRAY)
im.save(OUT,optimize=True)
print(OUT)
