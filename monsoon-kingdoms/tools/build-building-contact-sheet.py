from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
assets=json.loads((root/'assets/buildings/manifest.json').read_text())['assets']
w=1600;h=1080
sheet=Image.new('RGB',(w,h),'#eee6d5');d=ImageDraw.Draw(sheet)
fontpath='/System/Library/Fonts/Supplemental/Arial.ttf'
title=ImageFont.truetype(fontpath,30);label=ImageFont.truetype(fontpath,20);small=ImageFont.truetype(fontpath,14)
d.text((30,18),'MONSOON KINGDOMS  /  ORIGINAL ARCHITECTURAL KIT',font=title,fill='#223c3c')
d.text((30,57),'Editable Blender source  ·  game-ready GLB  ·  two material batches per building  ·  meters / Y-up',font=small,fill='#49605a')
for i,a in enumerate(assets):
 x=(i%5)*320;y=94+(i//5)*320
 im=Image.open(root/a['preview']).convert('RGBA');im.thumbnail((294,274));sheet.paste(im,(x+(320-im.width)//2,y),im)
 d.text((x+20,y+274),a['id'].replace('_',' ').upper(),font=label,fill='#203b3b')
 d.text((x+20,y+298),f"{a['triangles']:,} tris  /  {a['meshes']} materials  /  {a['size'][0]:.1f} × {a['size'][2]:.1f} m",font=small,fill='#6d695b')
out=root/'output/buildings/contact-sheet.jpg';sheet.save(out,quality=92);print(out)
