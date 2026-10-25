"""Service map: platform icons, compact components, and protocol-labeled flows."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/images/architecture.png'
W,H=2000,1150
im=Image.new('RGB',(W,H),'#ffffff');d=ImageDraw.Draw(im)
INK='#151515';GRAY='#6a6870';PURPLE='#9146ff';EDGE='#38343e'
def font(n,b=False,mono=False):return ImageFont.truetype('C:/Windows/Fonts/'+('consola.ttf' if mono else 'arialbd.ttf' if b else 'arial.ttf'),n)
def label(x,y,s,n=25,c=INK,b=False,mono=False):d.text((x,y),s,font=font(n,b,mono),fill=c,anchor='mt')
def arrow(points,c=EDGE,both=False):
 d.line(points,fill=c,width=3,joint='curve')
 def tip(a,b):
  t=math.atan2(b[1]-a[1],b[0]-a[0]);d.polygon([b,(b[0]-13*math.cos(t-.45),b[1]-13*math.sin(t-.45)),(b[0]-13*math.cos(t+.45),b[1]-13*math.sin(t+.45))],fill=c)
 tip(points[-2],points[-1])
 if both:tip(points[1],points[0])
def logo(path,cx,cy,side):
 a=Image.open(ROOT/path).convert('RGBA');box=a.getbbox();a=a.crop(box) if box else a;a.thumbnail((side,side),Image.Resampling.LANCZOS);im.paste(a,(round(cx-a.width/2),round(cy-a.height/2)),a)
def card(rect,title,sub,icon=None):
 x,y,r,b=rect;d.rounded_rectangle(rect,radius=22,fill='white',outline='#403b49',width=2)
 cx=(x+r)//2
 if icon=='spark':
  px,py=cx,y+39;d.polygon([(px,py-20),(px+7,py-6),(px+20,py),(px+7,py+6),(px,py+20),(px-7,py+6),(px-20,py),(px-7,py-6)],fill='#8c7be5')
 elif icon=='shield':
  px,py=cx,y+35;d.line([(px-20,py-16),(px,py-23),(px+20,py-16),(px+17,py+8),(px,py+23),(px-17,py+8),(px-20,py-16)],fill=INK,width=3);d.line([(px-9,py),(px-2,py+7),(px+10,py-8)],fill=INK,width=3)
 elif icon=='server':
  px,py=cx,y+36
  for k in [-12,10]:d.rounded_rectangle((px-25,py+k-7,px+25,py+k+7),radius=4,outline=INK,width=3);d.ellipse((px+12,py+k-2,px+16,py+k+2),fill=INK)
 label(cx,y+72,title,28,INK,True);label(cx,y+111,sub,22,GRAY,False,True)
# Project identity remains distinct from service-provider marks.
d.text((90,50),'Chat Ships It',font=font(64,True),fill=INK)
d.text((92,129),'SYSTEM ARCHITECTURE',font=font(20,False,True),fill=GRAY)
# Sparse grouping and fine texture follow the technical reference figures.
d.rounded_rectangle((575,350,1445,1050),radius=40,fill='#f6f2ff',outline='#a291c6',width=2)
for x in range(595,1430,14):
 for y in range(371,1034,14):
  if (x-615)**2+(y-390)**2>300:d.point((x,y),fill='#d5caec')
label(1010,379,'APPLICATION SERVER',19,GRAY,False,True)
# Event and control paths.
arrow([(340,510),(680,510)],PURPLE);label(507,535,'EventSub',22,PURPLE,False,True)
arrow([(340,210),(510,210),(510,465),(680,465)])
label(507,165,'brief / approval',20,GRAY,False,True)
arrow([(860,280),(860,430)],both=True);label(960,321,'screen',20,GRAY,False,True)
arrow([(1050,500),(1570,500)]);label(1305,452,'approved spec',22,INK,False,True)
arrow([(1810,510),(1900,510),(1900,835),(1360,835)])
label(1700,792,'TypeScript',22,INK,False,True)
arrow([(1100,835),(970,835)]);label(1035,792,'rules',20,GRAY,False,True)
arrow([(650,807),(350,807)]);label(493,765,'10 Hz snapshots',20,INK,False,True)
arrow([(350,882),(650,882)],PURPLE);label(490,900,'inputs',20,PURPLE,False,True)
# Creator: a browser node, kept secondary to the two platforms.
d.rounded_rectangle((160,174,300,250),radius=8,fill='white',outline=INK,width=3);d.line((160,193,300,193),fill=INK,width=2)
for x in [173,184,195]:d.ellipse((x,181,x+4,185),fill=GRAY)
label(230,267,'Creator',30,INK,True)
# The official platform symbols remain unaltered.
logo(Path('assets/brand/vendor/twitch-glitch.png'),230,510,170)
label(230,625,'Twitch',36,INK,True);label(230,672,'Proposals + votes',23,GRAY)
logo(Path('assets/brand/vendor/openai-blossom.png'),1700,510,170)
label(1700,625,'OpenAI Codex',36,INK,True);label(1700,672,'Games + patches',23,GRAY)
card((730,130,990,280),'Gemini','Screen specs','spark')
card((680,430,1050,580),'Fastify','Vote + approval','server')
card((1100,760,1360,910),'Validation','4 checks','shield')
card((650,760,970,910),'Shared engine','20 Hz simulation','server')
label(810,953,'Garden example',20,GRAY,False,True)
# Player clients: three small screens signal fan-out without explaining it in prose.
for x,y in [(169,776),(207,799),(245,776)]:
 d.rounded_rectangle((x,y,x+70,y+48),radius=5,fill='white',outline=INK,width=3);d.line((x+35,y+48,x+35,y+59),fill=INK,width=3);d.line((x+19,y+60,x+51,y+60),fill=INK,width=3)
label(230,951,'Canvas clients',30,INK,True)
OUT.parent.mkdir(parents=True,exist_ok=True);im.save(OUT,optimize=True);print(OUT)
