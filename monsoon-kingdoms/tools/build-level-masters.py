"""Render native 4096px building-level portraits; resume only unchanged GLB hashes.

python3 tools/build-level-masters.py --render --types farm lumber
python3 tools/build-level-masters.py --render --verify
The 15 existing level-one masters are referenced, never replaced. Levels 2–15
are rendered directly from their GLB geometry, never enlarged from thumbnails.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/masters/building-levels'
SOURCES = ROOT / 'assets/buildings/levels'
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'
TYPES = ('fort', 'farm', 'lumber', 'mine', 'granary', 'stepwell', 'barracks',
         'camp', 'archer_tower', 'cannon', 'wall', 'market', 'laboratory',
         'hero_hall', 'gem_mine')
REVISION = 1


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.json.tmp')
    tmp.write_text(json.dumps(value, indent=2) + '\n')
    tmp.replace(path)


def manifest():
    path = OUT / 'manifest.json'
    return json.loads(path.read_text()) if path.exists() else {
        'resolution': 4096, 'renderPercentage': 100,
        'method': 'Direct native Blender EEVEE rendering of GLB geometry; no bitmap upscaling.',
        'expectedAssets': 225, 'assets': []}


def save_manifest(records):
    data = manifest()
    data['assets'] = sorted(records.values(), key=lambda e: (TYPES.index(e['type']), e['level']))
    data['assetCount'] = len(records)
    data['totalBytes'] = sum(e['bytes'] for e in records.values())
    data['newRenderSeconds'] = round(sum(e.get('seconds', 0) for e in records.values() if not e.get('reused')), 3)
    write_json(OUT / 'manifest.json', data)


def source_paths(types):
    return [SOURCES / name / f'{level}.glb' for name in types for level in range(2, 16)
            if (SOURCES / name / f'{level}.glb').exists()]


def reuse_level_one():
    previous = json.loads((ROOT / 'assets/masters/manifest.json').read_text())
    existing = {e['source']: e for e in previous['assets']}
    records = {(e['type'], e['level']): e for e in manifest()['assets']}
    for name in TYPES:
        source = f'assets/buildings/{name}.glb'
        entry = existing[source]
        assert digest(ROOT / source) == entry['sourceSha256'], f'Level 1 source changed: {name}'
        assert digest(ROOT / entry['path']) == entry['sha256'], f'Level 1 master changed: {name}'
        assert entry['width'] == entry['height'] == 4096 and entry['nativeRender']
        records[(name, 1)] = {**entry, 'type': name, 'level': 1, 'reused': True,
                              'provenance': 'Existing verified native 4096 master; original file retained.'}
    save_manifest(records)


def worker(options):
    import bpy
    from mathutils import Vector

    OUT.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    engines = bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items.keys()
    scene.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in engines else 'BLENDER_EEVEE_NEXT'
    if hasattr(scene, 'eevee'):
        scene.eevee.taa_render_samples = options['samples']
    scene.render.resolution_x = scene.render.resolution_y = 4096
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '8'
    scene.render.image_settings.compression = 15
    scene.render.film_transparent = True
    scene.view_settings.view_transform = 'AgX'
    scene.world = bpy.data.worlds.new('Neutral portrait studio')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.19, .22, .27, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .35
    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.data.type = 'ORTHO'
    scene.camera = camera
    lights = []
    for name, offset, power, size, color, shadow in (
        ('Warm key', (-1.1, -1.5, 2), 280, 1.5, (1, .89, .75), True),
        ('Cool fill', (1.5, -.6, 1.1), 130, 1.6, (.74, .85, 1), False),
        ('Sky rim', (.5, 1, 1.5), 320, 1.3, (.90, .96, 1), False)):
        data = bpy.data.lights.new(name, 'AREA')
        data.shape = 'DISK'
        data.color = color
        data.use_shadow = shadow
        ob = bpy.data.objects.new(name, data)
        scene.collection.objects.link(ob)
        lights.append((ob, offset, power, size))
    persistent = {camera, *(entry[0] for entry in lights)}
    records = {(e['type'], e['level']): e for e in manifest()['assets']}
    completed = 0
    for path in source_paths(options['types']):
        name, level = path.parent.name, int(path.stem)
        source = str(path.relative_to(ROOT))
        source_hash = digest(path)
        target = OUT / name / f'{level}.png'
        old = records.get((name, level))
        if old and old.get('renderRevision') == REVISION and old.get('renderSamples') == options['samples'] and old['sourceSha256'] == source_hash and target.exists() and digest(target) == old['sha256']:
            print('CACHED', name, level, flush=True)
            continue
        if options['limit'] and completed >= options['limit']:
            break
        started = time.monotonic()
        for ob in list(scene.objects):
            if ob not in persistent:
                bpy.data.objects.remove(ob, do_unlink=True)
        for database in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
            for data in list(database):
                if data.users == 0:
                    database.remove(data)
        bpy.ops.import_scene.gltf(filepath=str(path))
        meshes = [ob for ob in scene.objects if ob.type == 'MESH']
        assert meshes, f'No geometry: {path}'
        bpy.context.view_layer.update()
        bounds = [ob.matrix_world @ vertex.co for ob in meshes for vertex in ob.data.vertices]
        lo = Vector([min(v[i] for v in bounds) for i in range(3)])
        hi = Vector([max(v[i] for v in bounds) for i in range(3)])
        center, extent = (lo + hi) * .5, max(hi - lo)
        camera.location = center + Vector((1.15, -1.55, 1.08)).normalized() * extent * 3
        camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
        camera.data.clip_end = max(100, extent * 20)
        inv = camera.rotation_euler.to_matrix().transposed()
        projected = [inv @ (v - center) for v in bounds]
        span = max(max(v[i] for v in projected) - min(v[i] for v in projected) for i in (0, 1))
        camera.data.ortho_scale = span * 1.13
        mid = Vector(((max(v.x for v in projected) + min(v.x for v in projected)) * .5,
                      (max(v.y for v in projected) + min(v.y for v in projected)) * .5, 0))
        camera.location += camera.rotation_euler.to_matrix() @ mid
        for ob, offset, power, size in lights:
            ob.location = center + Vector(offset) * extent
            ob.rotation_euler = (center - ob.location).to_track_quat('-Z', 'Y').to_euler()
            ob.data.energy = power * extent * extent
            ob.data.size = size * extent
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_name(f'{level}.render.png')
        scene.render.filepath = str(temporary)
        bpy.ops.render.render(write_still=True)
        assert digest(path) == source_hash, f'Source changed during render: {path}'
        temporary.replace(target)
        seconds = round(time.monotonic() - started, 3)
        records[(name, level)] = {
            'type': name, 'level': level, 'source': source, 'sourceSha256': source_hash,
            'path': str(target.relative_to(ROOT)), 'sha256': digest(target),
            'width': scene.render.resolution_x, 'height': scene.render.resolution_y,
            'nativeRender': True, 'renderPercentage': scene.render.resolution_percentage,
            'engine': scene.render.engine, 'blenderVersion': bpy.app.version_string,
            'renderRevision': REVISION, 'renderSamples': options['samples'],
            'pngCompression': scene.render.image_settings.compression,
            'seconds': seconds, 'bytes': target.stat().st_size, 'meshCount': len(meshes),
            'sourceBoundsBlender': {'min': list(lo), 'max': list(hi)}, 'reused': False,
            'lighting': 'Three physically sized area lights, key shadows, AgX, neutral world, geometry-fitted orthographic camera.'}
        save_manifest(records)
        completed += 1
        print('MASTER', name, level, 'native 4096x4096', seconds, 'seconds', flush=True)
    print('BATCH COMPLETE', completed, 'new renders', flush=True)


def verify(allow_partial=False):
    from PIL import Image, ImageDraw, ImageFont
    data = manifest()
    expected = {(name, level) for name in TYPES for level in range(1, 16)}
    actual = {(e['type'], e['level']) for e in data['assets']}
    assert len(actual) == len(data['assets']), 'Duplicate coverage records'
    missing = expected - actual
    assert allow_partial or not missing, f'Missing {len(missing)} masters: {sorted(missing)[:12]}'
    sheet = Image.new('RGB', (3000, 3450), '#20252e')
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype(str(ROOT / 'assets/fonts/Manrope-Variable.ttf'), 13)
    checks = []
    for entry in data['assets']:
        path = ROOT / entry['path']
        assert digest(ROOT / entry['source']) == entry['sourceSha256'], f'Stale GLB: {entry["source"]}'
        assert digest(path) == entry['sha256'], f'Changed master: {path}'
        with Image.open(path) as im:
            assert im.size == (4096, 4096) and im.mode == 'RGBA', str(path)
            assert entry['nativeRender'] and entry['renderPercentage'] == 100
            alpha = im.getchannel('A')
            box = alpha.getbbox()
            assert alpha.getextrema() == (0, 255) and box, f'Blank or opaque image: {path}'
            assert min(box[:2]) > 8 and max(box[2:]) < 4088, f'Clipped framing: {path}, {box}'
            checks.append({'type': entry['type'], 'level': entry['level'], 'native4096': True,
                           'sourceHashMatches': True, 'outputHashMatches': True, 'alphaBounds': list(box)})
            im.thumbnail((194, 194), Image.Resampling.LANCZOS)
            x, y = (entry['level'] - 1) * 200, TYPES.index(entry['type']) * 230
            sheet.paste(im, (x + (200 - im.width) // 2, y), im)
            draw.text((x + 5, y + 197), f'{entry["type"]} / {entry["level"]}', font=font, fill='#f0e7d5')
    sheet.save(OUT / 'contact-sheet.jpg', quality=92)
    report = {'status': 'PARTIAL' if missing else 'PASS', 'coverage': len(actual), 'expected': 225,
              'existingLevelOne': sum(e.get('reused', False) for e in data['assets']),
              'newNative4096': sum(not e.get('reused', False) for e in data['assets']),
              'missing': [f'{name}/{level}' for name, level in sorted(missing)], 'checks': checks}
    write_json(OUT / 'verification.json', report)
    print(report['status'], f'{len(actual)}/225 native 4096 masters; all available hashes, alpha and framing valid.')


if '--' in sys.argv and 'bpy' in sys.modules:
    worker(json.loads(sys.argv[sys.argv.index('--') + 1]))
else:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--render', action='store_true')
    parser.add_argument('--verify', action='store_true')
    parser.add_argument('--allow-partial', action='store_true')
    parser.add_argument('--types', nargs='+', choices=TYPES, default=list(TYPES))
    parser.add_argument('--samples', type=int, choices=(8, 16, 32), default=16)
    parser.add_argument('--limit', type=int, default=0)
    args = parser.parse_args()
    if args.render:
        reuse_level_one()
        with (OUT / 'build.log').open('a') as log:
            result = subprocess.run([BLENDER, '--background', '--factory-startup', '--python-exit-code', '1',
                                     '--python', str(Path(__file__).resolve()), '--', json.dumps(vars(args))], stdout=log, stderr=subprocess.STDOUT)
        if result.returncode:
            raise SystemExit(f'Blender failed ({result.returncode}); see {OUT / "build.log"}')
    if args.verify:
        verify(args.allow_partial)
    if not args.render and not args.verify:
        parser.error('Choose --render and/or --verify')
