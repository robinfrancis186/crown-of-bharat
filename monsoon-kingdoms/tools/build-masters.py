"""Native 4096px asset portraits and periodic PBR texture masters.
python3 tools/build-masters.py --textures --portraits
Blender renders actual current GLBs at 4096; existing 512 previews remain untouched.
Only Python stdlib + installed Pillow/numpy + installed Blender are required.
"""
from pathlib import Path
import argparse, hashlib, json, math, os, subprocess, sys, time
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'assets'; MASTERS=ASSETS/'masters'; TEXTURES=ASSETS/'textures'
BLENDER='/Applications/Blender.app/Contents/MacOS/Blender'
GROUPS=('buildings','units','heroes','environment')

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def write_json(path,data):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(data,indent=2)+'\n')

def textures():
    import numpy as np
    from PIL import Image
    started=time.monotonic();n=4096
    x=np.arange(n,dtype=np.float32)[None,:]/n;y=np.arange(n,dtype=np.float32)[:,None]/n
    tau=np.float32(2*math.pi)
    records=[]
    for index,name in enumerate(('marble','sandstone','cloth','grass')):
        rng=np.random.default_rng(913+index);field=np.zeros((n,n),dtype=np.float32)
        for frequency,amplitude in ((2,.38),(5,.22),(13,.16),(31,.10),(97,.07),(257,.035),(701,.018)):
            a=int(rng.integers(1,frequency+1));b=frequency-a+1;phase=np.float32(rng.uniform(0,math.tau))
            field+=np.sin(tau*(a*x+b*y)+phase)*np.float32(amplitude)
        if name=='marble':
            vein=np.exp(-np.square(np.sin(tau*(3*x+2*y)+field*2.4)*7)).astype(np.float32)
            height=field*.016-vein*.018;base=.955+field*.024-vein*.075;rough=.38+field*.06+vein*.035;normal_strength=.08;tint=(1,.995,.98)
        elif name=='sandstone':
            bands=np.sin(tau*(2*x+19*y)+field*2)
            height=field*.04+bands*.008;base=.91+field*.055+bands*.014;rough=.77+field*.07;normal_strength=.06;tint=(1,.988,.965)
        elif name=='cloth':
            warp=np.sin(tau*256*x);weft=np.sin(tau*256*y)
            interlace=np.sin(tau*128*x)*np.sin(tau*128*y)
            weave=(warp+weft)*.34+interlace*.25
            height=weave*.038+field*.008;base=.93+weave*.03+field*.012;rough=.81+weave*.025+field*.025;normal_strength=.004;tint=(1,1,1)
        else:
            blades=np.sin(tau*(117*x+13*y)+np.sin(tau*7*y)*2)
            cross=np.sin(tau*(43*x-83*y)+field)
            height=field*.015+blades*.020+cross*.01;base=.87+field*.05+blades*.025+cross*.012;rough=.83+field*.055;normal_strength=.025;tint=(.99,1,.98)
        folder=TEXTURES/name;folder.mkdir(parents=True,exist_ok=True)
        rgb=np.stack([np.clip(base*t,0,1) for t in tint],axis=-1)
        base_image=Image.fromarray(np.rint(rgb*255).astype('uint8'));del rgb,base
        rough_image=Image.fromarray(np.rint(np.clip(rough,0,1)*255).astype('uint8'));del rough
        # Central differences wrap, preserving tile boundaries; encode OpenGL tangent-space +Y.
        dx=(np.roll(height,-1,axis=1)-np.roll(height,1,axis=1))*(n/2)*normal_strength
        dy=(np.roll(height,-1,axis=0)-np.roll(height,1,axis=0))*(n/2)*normal_strength
        inv=1/np.sqrt(dx*dx+dy*dy+1)
        normal=np.stack((-dx*inv,-dy*inv,inv),axis=-1)
        normal_image=Image.fromarray(np.rint((normal*.5+.5)*255).astype('uint8'));del normal,dx,dy,inv,height,field
        for channel,image in [('basecolor',base_image),('roughness',rough_image),('normal',normal_image)]:
            for size in (4096,1024):
                target=image if size==4096 else image.resize((size,size),Image.Resampling.LANCZOS)
                if channel=='normal' and size==1024:
                    v=np.asarray(target,dtype=np.float32)/127.5-1;v/=np.maximum(np.linalg.norm(v,axis=-1,keepdims=True),1e-6)
                    target=Image.fromarray(np.rint((v*.5+.5)*255).astype('uint8'))
                path=folder/f'{channel}-{size}.png';target.save(path,optimize=False)
                records.append({'material':name,'channel':channel,'path':str(path.relative_to(ROOT)),'width':size,'height':size,'bytes':path.stat().st_size,'sha256':digest(path),'colorSpace':'sRGB' if channel=='basecolor' else 'linear data','origin':'native periodic procedural field at4096' if size==4096 else 'Lanczos downsample of4096 master; normal vectors renormalized' })
        print('TEXTURE',name,'native4096 and runtime1024 complete',flush=True)
    write_json(TEXTURES/'manifest.json',{'resolution':4096,'runtimeResolution':1024,'method':'Deterministic periodic Fourier fields, modeled vein/weave/blade height; periodic central-difference tangent normals. No source bitmap upscaling.','tileable':True,'usage':'Neutral albedo multiply with vertex color; normal is OpenGL +Y; roughness and normal are linear data.','elapsedSeconds':round(time.monotonic()-started,3),'files':records})

def verify():
    from PIL import Image,ImageDraw,ImageFont
    portrait_manifest=json.loads((MASTERS/'manifest.json').read_text())
    sources={str(p.relative_to(ROOT)) for g in GROUPS for p in (ASSETS/g).glob('*.glb') if not p.name.startswith('._')}
    delivered={x['source'] for x in portrait_manifest['assets']}
    assert delivered==sources, f'Missing or stale masters: {sources^delivered}'
    report=[]
    board=Image.new('RGB',(1380,260*math.ceil(len(sources)/6)), '#18212c');draw=ImageDraw.Draw(board);font=ImageFont.truetype(str(ASSETS/'fonts/Manrope-Variable.ttf'),14)
    for index,entry in enumerate(portrait_manifest['assets']):
        path=ROOT/entry['path'];im=Image.open(path)
        assert im.size==(4096,4096) and im.mode=='RGBA', str(path)
        assert entry['nativeRender'] and entry['renderPercentage']==100, 'Native full-resolution render required'
        assert digest(ROOT/entry['source'])==entry['sourceSha256'], 'GLB changed after master rendering'
        assert digest(path)==entry['sha256'], 'Portrait changed after rendering'
        alpha=im.getchannel('A');assert alpha.getextrema()==(0,255)
        box=alpha.getbbox();assert box and min(box[:2])>8 and max(box[2:])<4088, f'Portrait touches canvas edge: {path} {box}'
        report.append({'source':entry['source'],'size':list(im.size),'alphaBounds':box,'sourceHashMatches':True,'nativeRender':entry['nativeRender']})
        im.thumbnail((212,212),Image.Resampling.LANCZOS);x=(index%6)*230;y=(index//6)*260;board.paste(im,(x+(230-im.width)//2,y+(220-im.height)//2),im);draw.text((x+8,y+224),entry['group']+'/'+entry['id'],font=font,fill='#e1e9ee')
    board.save(MASTERS/'contact-sheet.jpg',quality=92)
    texture_manifest=json.loads((TEXTURES/'manifest.json').read_text())
    for entry in texture_manifest['files']:
        im=Image.open(ROOT/entry['path']);assert im.size==(entry['width'],entry['height']);assert digest(ROOT/entry['path'])==entry['sha256']
        assert im.getextrema()!=(0,0), 'Black material map'
    write_json(MASTERS/'verification.json',{'status':'PASS','portraits':report,'textureFiles':len(texture_manifest['files']),'sourceCoverage':len(sources),'verification':'PNG dimensions, RGBA framing, exact GLB and output hashes, native render metadata, all current GLBs covered, texture dimensions and hashes'})
    print('VERIFY PASS',len(report),'native4096 portraits;',len(texture_manifest['files']),'PBR textures')

def worker():
    import bpy
    from mathutils import Vector
    args=sys.argv[sys.argv.index('--')+1:];selected=json.loads(args[0]);engine=args[1]
    if engine.startswith('BLENDER_EEVEE'):
        available=bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items.keys();engine='BLENDER_EEVEE' if 'BLENDER_EEVEE' in available else 'BLENDER_EEVEE_NEXT'
    MASTERS.mkdir(parents=True,exist_ok=True);manifest_path=MASTERS/'manifest.json'
    manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {'resolution':4096,'method':'Native Blender render of current GLB geometry at4096x4096; never an upscale','assets':[]}
    by_path={x['source']:x for x in manifest['assets']}
    for relative in selected:
        path=ROOT/relative;group=path.parent.name;out=MASTERS/group/(path.stem+'.png');out.parent.mkdir(parents=True,exist_ok=True)
        sha=digest(path);previous=by_path.get(relative)
        if previous and previous.get('sourceSha256')==sha and previous.get('renderRevision',0)>=4 and out.exists() and digest(out)==previous.get('sha256'):print('CACHED',relative,flush=True);continue
        started=time.monotonic();bpy.ops.wm.read_factory_settings(use_empty=True)
        scene=bpy.context.scene;scene.render.engine=engine
        if engine=='CYCLES':scene.cycles.samples=24;scene.cycles.device='CPU';scene.cycles.use_denoising=True
        elif hasattr(scene,'eevee'):scene.eevee.taa_render_samples=16
        scene.render.resolution_x=scene.render.resolution_y=4096;scene.render.resolution_percentage=100
        scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.image_settings.color_depth='8';scene.render.image_settings.compression=20
        scene.render.film_transparent=True;scene.view_settings.view_transform='AgX'
        scene.world=bpy.data.worlds.new('Soft neutral studio');scene.world.use_nodes=True
        scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.19,.22,.27,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
        bpy.ops.import_scene.gltf(filepath=str(path))
        meshes=[o for o in scene.objects if o.type=='MESH'];assert meshes,'No imported geometry'
        bpy.context.view_layer.update();bounds=[o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
        lo=Vector([min(p[i] for p in bounds) for i in range(3)]);hi=Vector([max(p[i] for p in bounds) for i in range(3)]);center=(lo+hi)*.5;extent=max(hi-lo)
        bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO'
        direction=Vector((1.15,-1.55,1.08) if group in ('buildings','environment') else (.65,-1.7,.72)).normalized()
        camera.location=center+direction*extent*3;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.clip_end=max(100,extent*20)
        # Fit projected geometry to the square frame instead of guessing from model width.
        inv=camera.rotation_euler.to_matrix().transposed();projected=[inv@(p-center) for p in bounds]
        span=max(max(p[i] for p in projected)-min(p[i] for p in projected) for i in (0,1));camera.data.ortho_scale=span*1.13
        mid=Vector(((max(p.x for p in projected)+min(p.x for p in projected))*.5,(max(p.y for p in projected)+min(p.y for p in projected))*.5,0));camera.location+=camera.rotation_euler.to_matrix()@mid
        def area(name,offset,power,size,color):
            data=bpy.data.lights.new(name,'AREA');data.energy=power*extent*extent;data.shape='DISK';data.size=size*extent;data.color=color;data.use_shadow=(name=='Large warm key')
            ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);ob.location=center+Vector(offset)*extent;ob.rotation_euler=(center-ob.location).to_track_quat('-Z','Y').to_euler()
        area('Large warm key',(-1.1,-1.5,2.0),280,1.5,(1,.89,.75));area('Broad cool fill',(1.5,-.6,1.1),130,1.6,(.74,.85,1));area('Rim skylight',(.5,1.0,1.5),320,1.3,(.90,.96,1))
        scene.render.filepath=str(out);bpy.ops.render.render(write_still=True)
        seconds=time.monotonic()-started
        if manifest_path.exists():by_path.update({x['source']:x for x in json.loads(manifest_path.read_text())['assets']})
        by_path[relative]={'id':path.stem,'group':group,'source':relative,'sourceSha256':sha,'path':str(out.relative_to(ROOT)),'width':4096,'height':4096,'nativeRender':True,'renderPercentage':100,'engine':engine,'blenderVersion':bpy.app.version_string,'renderRevision':4,'renderSamples':24 if engine=='CYCLES' else 16,'seconds':round(seconds,3),'bytes':out.stat().st_size,'sha256':digest(out),'meshCount':len(meshes),'sourceBoundsBlender':{'min':list(lo),'max':list(hi)},'lighting':'Three physically sized area lights + neutral studio world; orthographic geometry-fitted framing; transparent background'}
        manifest['assets']=sorted(by_path.values(),key=lambda x:x['source']);manifest['assetCount']=len(manifest['assets']);manifest['totalBytes']=sum(x['bytes'] for x in manifest['assets']);manifest['totalRenderSeconds']=round(sum(x['seconds'] for x in manifest['assets']),3);write_json(manifest_path,manifest)
        print('MASTER',relative,'4096x4096',round(seconds,2),'seconds',out.stat().st_size,'bytes',flush=True)

if '--' in sys.argv and 'bpy' in sys.modules:
    worker()
else:
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--verify',action='store_true');parser.add_argument('--textures',action='store_true');parser.add_argument('--portraits',action='store_true');parser.add_argument('--only',nargs='*',default=[]);parser.add_argument('--exclude',nargs='*',default=[]);parser.add_argument('--engine',default='BLENDER_EEVEE',choices=['BLENDER_EEVEE','BLENDER_EEVEE_NEXT','CYCLES']);args=parser.parse_args()
    if args.textures:textures()
    if args.portraits:
        paths=sorted(p for group in GROUPS for p in (ASSETS/group).glob('*.glb') if not p.name.startswith('._') and (not args.only or p.stem in args.only) and p.stem not in args.exclude)
        MASTERS.mkdir(parents=True,exist_ok=True)
        log=MASTERS/'build.log'
        with log.open('a') as output:
            result=subprocess.run([BLENDER,'--background','--factory-startup','--python-exit-code','1','--python',str(Path(__file__).resolve()),'--',json.dumps([str(p.relative_to(ROOT)) for p in paths]),args.engine],stdout=output,stderr=subprocess.STDOUT)
        if result.returncode:raise SystemExit(f'Blender failed ({result.returncode}); see {log}')
        print('MASTER BATCH COMPLETE',len(paths),'sources; details:',log)
    if args.verify:verify()
    if not args.textures and not args.portraits and not args.verify:parser.error('Choose --textures, --portraits and/or --verify')
