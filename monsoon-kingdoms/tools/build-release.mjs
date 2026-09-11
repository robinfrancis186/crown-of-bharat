#!/usr/bin/env node
// Self-contained static release packaging. Node and Python standard libraries only.
import assert from 'node:assert/strict';
import { mkdir, readdir, readFile, rm, stat, writeFile, chmod } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(project, 'release', 'monsoon-kingdoms');
const three = path.resolve(project, '../node_modules/three');
const args = new Set(process.argv.slice(2));
for (const flag of args) assert.ok(['--verify', '--zip'].includes(flag), `Unknown option: ${flag}`);
const { CATALOG, UNITS, HEROES, MAX_BUILDING_LEVEL } = await import(pathToFileURL(path.join(project, 'src/rules.js')));
const models = [
  ...Object.keys(CATALOG).map(id => ['buildings', id]),
  ...Object.keys(CATALOG).flatMap(id => Array.from({ length: MAX_BUILDING_LEVEL - 1 }, (_, i) => [`buildings/levels/${id}`, String(i + 2)])),
  ...Object.keys(UNITS).map(id => ['units', id]),
  ...Object.keys(HEROES).map(id => ['heroes', id]),
  ...['banyan', 'palm', 'rocks', 'bush', 'cart', 'jars'].map(id => ['environment', id]),
];
const texturePaths = ['marble', 'sandstone', 'cloth', 'grass'].flatMap(material => ['basecolor', 'normal', 'roughness'].map(channel => `assets/textures/${material}/${channel}-1024.png`));
const hash = data => createHash('sha256').update(data).digest('hex');
const relative = file => path.relative(project, file).split(path.sep).join('/');
const inside = (base, file) => file === base || file.startsWith(base + path.sep);
async function filesIn(folder) {
  const result = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (entry.name.startsWith('._') || entry.name === '.DS_Store') continue;
    assert.ok(!entry.isSymbolicLink(), `Refusing symlink: ${path.join(folder, entry.name)}`);
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) result.push(...await filesIn(file)); else result.push(file);
  }
  return result.sort();
}
function importsOf(code) {
  const imports = [...code.matchAll(/\b(?:import|export)\s+(?:[^;'"`]*?\s+from\s*)?['"]([^'"]+)['"]/g)].map(m => m[1]);
  imports.push(...[...code.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]));
  return [...new Set(imports)];
}
function resolveModule(specifier, importer, root, vendor) {
  let file;
  if (specifier === 'three') file = path.join(vendor, 'build/three.module.js');
  else if (specifier.startsWith('three/addons/')) file = path.join(vendor, 'examples/jsm', specifier.slice('three/addons/'.length));
  else if (specifier.startsWith('./') || specifier.startsWith('../')) file = path.resolve(path.dirname(importer), specifier);
  else throw new Error(`Unmapped browser dependency ${specifier} in ${importer}`);
  assert.ok(inside(root, file) || inside(vendor, file), `Dependency escapes release roots: ${file}`);
  return file;
}
async function moduleClosure(root, vendor) {
  const seen = new Set(), pending = [path.join(root, 'src/main.js')];
  while (pending.length) {
    const file = pending.pop(); if (seen.has(file)) continue; seen.add(file);
    const code = await readFile(file, 'utf8');
    for (const specifier of importsOf(code)) pending.push(resolveModule(specifier, file, root, vendor));
  }
  return [...seen].sort();
}
const sources = {};
async function copy(source, destination) {
  assert.ok(inside(output, destination), `Output escapes release folder: ${destination}`);
  await mkdir(path.dirname(destination), { recursive: true });
  const data = await readFile(source);
  await writeFile(destination, data);
  if (inside(project, source)) sources[relative(source)] = hash(data);
}
const server = `#!/usr/bin/env python3
"""Serve only this release folder; optional same-network access, no dependencies."""
import argparse
import functools
import http.server
import pathlib
import socket
import threading
import webbrowser

parser = argparse.ArgumentParser(description="Play Monsoon Kingdoms locally")
parser.add_argument("--port", type=int, default=5192)
parser.add_argument("--no-browser", action="store_true")
parser.add_argument("--lan", action="store_true", help="Allow phones and other devices on the same network")
args = parser.parse_args()
if not 1 <= args.port <= 65535:
    parser.error("port must be between 1 and 65535")
root = pathlib.Path(__file__).resolve().parent
class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".js": "text/javascript", ".glb": "model/gltf-binary", ".ttf": "font/ttf"}
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()
try:
    server = http.server.ThreadingHTTPServer(("0.0.0.0" if args.lan else "127.0.0.1", args.port), functools.partial(Handler, directory=str(root)))
except OSError as error:
    parser.exit(1, "Could not start server: " + str(error) + "\\nTry another port: python3 server.py --port 5193\\n")
url = "http://127.0.0.1:" + str(args.port) + "/"
print("Monsoon Kingdoms: " + url + "\\nPress Ctrl+C to stop.", flush=True)
if args.lan:
    address = None
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
            probe.connect(("8.8.8.8", 80))
            address = probe.getsockname()[0]
    except OSError:
        try:
            address = next((item[4][0] for item in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET) if not item[4][0].startswith("127.")), None)
        except OSError:
            pass
    if address:
        print("Phone on the same Wi-Fi: http://" + address + ":" + str(args.port) + "/", flush=True)
    else:
        print("LAN mode is on. Open http://<this computer's local IP>:" + str(args.port) + "/ on your phone.", flush=True)
if not args.no_browser:
    timer = threading.Timer(0.3, lambda: webbrowser.open(url))
    timer.daemon = True
    timer.start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\\nServer stopped.")
finally:
    server.server_close()
`;
const readme = `# Monsoon Kingdoms — local release

An original Indian-inspired strategy game with fifteen building types and fifteen modeled levels per type, a Taj Mahal-inspired capital, ten troop types, two permanent heroes, four spells, six campaign destinations and local AI league play.

## Start

On macOS, double-click **Start.command**. Python 3 is required. The launcher starts a server bound only to your computer and opens http://127.0.0.1:5192/.

Alternatively, from this folder run **python3 server.py** (Windows: **python server.py**). Stop with Ctrl+C. If the port is occupied, use **python3 server.py --port 5193**. The browser must load the HTTP address; opening index.html directly cannot load JavaScript modules reliably.

To play on a phone on the same Wi-Fi, run **python3 server.py --lan** and open the printed phone URL in the phone's browser. Keep this computer and server running, and rotate the phone sideways. This optional mode serves only this release folder to your local network. The ordinary launcher remains computer-only.

All runtime assets and Three.js are included. No npm install, API key, Blender installation, account, internet connection or paid gem purchase is required to play. Python is the only launcher prerequisite. Any ordinary static HTTP server can serve this folder instead.

## Controls and play

Mobile play is landscape-only. Rotate your phone or tablet sideways to play; portrait orientation displays a rotation guide and pauses battlefield interaction. Desktop play uses the available window. Higher building tiers load on demand for the visible village and battles, rather than downloading all 225 building models at startup.

- Drag the village to pan; scroll or pinch to zoom. Camera buttons zoom, rotate and reset.
- Select buildings to inspect, collect, move or upgrade through level 15, with distinct building geometry and a level gallery. Hero and troop research levels remain capped at 3. Total army capacity is capped at 240 spaces. Build supports individual buildings and straight rampart lines. Arrow keys adjust placement; Enter confirms; Escape cancels or closes panels.
- Prepare/remove troops instantly for free within army capacity. Upgrade the Warrior Akhara to unlock ten troop types and the Royal Workshop to improve them.
- Attack from the outer edge: select a troop or hero and click the field. Heroes are permanent; activate their ability after deployment. Select targeted spells and click the ground. Each spell has one charge per battle when a Sacred Stepwell is built.
- Three stars reward the enemy capital, 50% destruction and full destruction. In Campaign and Royal League, deployed regular troops are consumed; undeployed reserves return. Free preparation replaces them.
- Test Defenses attacks a copy of your own completed village. All troops return after practice, including after refresh. Practice has no loot or league rewards.
- Settings provides graphics/audio preferences, a guide and save export/import. Export before switching browser or server address. Import replaces the current kingdom in that browser.

## Local scope and saves

Royal League contains clearly labeled, seeded AI opponents: six attacks per week, six original tiers and weekly gem rewards. It is not online matchmaking, a real-player leaderboard or multiplayer PvP. The game has no clan service, real-money shop or server-authoritative account system.

Progress is saved in browser local storage for the exact server address. Changing localhost to 127.0.0.1, changing port or changing browser creates a different save location. Use Settings export/import to transfer a kingdom. Production is bounded to eight offline hours. Refreshing a Campaign/League raid returns only undeployed troops; refreshing Practice restores the full army.

## Included files and licenses

This folder contains ${models.length} runtime GLB models and matching PNG portraits, twelve optimized 1024-pixel PBR maps, two local fonts, the application and its required Three.js module dependency closure. It includes all 225 building tiers plus ten troop, two hero and six environment models. Obsolete fort_2/fort_3/wall_2/wall_3/upgrade_ornament exports, native Blender files, 4096-pixel masters, authoring tools, tests, browser traces and unrelated projects are intentionally excluded.

Three.js copyright/license is in vendor/three/LICENSE. Font licenses are assets/fonts/Manrope-OFL.txt and assets/fonts/SpaceGrotesk-OFL.txt. The game's architecture and characters are original fictional Indian-inspired work; no Supercell game art is included.

release-manifest.json lists every packaged file with its SHA-256 checksum and the source hashes used for this build. The development workspace can rebuild and verify with **node tools/build-release.mjs** and **node tools/build-release.mjs --verify**.
`;

if (!args.has('--verify')) {
  execFileSync(process.execPath, [path.join(project, 'tools/build-firebase.mjs')], {stdio:'inherit'});
  // Replace only the generated package; never recurse through project/release.
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const file of await filesIn(path.join(project, 'src'))) {
    assert.ok(/\.(?:js|css)$/.test(file), `Review unexpected runtime source file: ${file}`);
    await copy(file, path.join(output, relative(file)));
  }
  const html = await readFile(path.join(project, 'index.html'), 'utf8');
  sources['index.html'] = hash(Buffer.from(html));
  assert.match(html, /<script type="importmap">[\s\S]*?<\/script>/);
  const importmap = { imports: { three: './vendor/three/build/three.module.js', 'three/addons/': './vendor/three/examples/jsm/' } };
  await writeFile(path.join(output, 'index.html'), html.replace(/<script type="importmap">[\s\S]*?<\/script>/, `<script type="importmap">${JSON.stringify(importmap)}</script>`));
  for (const file of await moduleClosure(project, three)) {
    if (inside(three, file)) await copy(file, path.join(output, 'vendor/three', path.relative(three, file)));
  }
  await copy(path.join(three, 'LICENSE'), path.join(output, 'vendor/three/LICENSE'));
  for (const [folder, id] of models) for (const extension of ['glb', 'png']) {
    const asset = `assets/${folder}/${id}.${extension}`; await copy(path.join(project, asset), path.join(output, asset));
  }
  for (const asset of texturePaths) await copy(path.join(project, asset), path.join(output, asset));
  for (const file of await filesIn(path.join(project, 'assets/fonts'))) {
    assert.ok(/\.(?:ttf|txt)$/.test(file), `Review unexpected font asset: ${file}`);
    await copy(file, path.join(output, relative(file)));
  }
  await writeFile(path.join(output, 'server.py'), server);
  await writeFile(path.join(output, 'Start.command'), '#!/bin/zsh\nset -eu\ncd -- "$(dirname -- "$0")"\nexec python3 server.py "$@"\n');
  await chmod(path.join(output, 'Start.command'), 0o755);
  await writeFile(path.join(output, 'README.md'), readme);
  const entries = [];
  for (const file of await filesIn(output)) { const data = await readFile(file); entries.push({ path: path.relative(output, file).split(path.sep).join('/'), bytes: data.length, sha256: hash(data) }); }
  await writeFile(path.join(output, 'release-manifest.json'), JSON.stringify({ name: 'Monsoon Kingdoms', builtAt: new Date().toISOString(), models: models.length, portraits: models.length, pbrMaps: texturePaths.length, sourceHashes: sources, files: entries }, null, 2) + '\n');
}

async function verify() {
  const manifest = JSON.parse(await readFile(path.join(output, 'release-manifest.json'), 'utf8'));
  const actual = (await filesIn(output)).map(file => path.relative(output, file).split(path.sep).join('/'));
  assert.deepEqual(actual.filter(file => file !== 'release-manifest.json').sort(), manifest.files.map(entry => entry.path).sort(), 'Manifest covers every shipped file');
  for (const entry of manifest.files) {
    assert.ok(!/(?:^|\/)(?:node_modules|blender|masters|output|tools|\.env)(?:\/|$)|4096|\.blend|\.DS_Store|\/\._/.test(entry.path), `Authoring or private file in release: ${entry.path}`);
    assert.equal(hash(await readFile(path.join(output, entry.path))), entry.sha256, `Package hash mismatch: ${entry.path}`);
  }
  for (const [source, expected] of Object.entries(manifest.sourceHashes)) assert.equal(hash(await readFile(path.join(project, source))), expected, `Source changed after build; rebuild: ${source}`);
  const html = await readFile(path.join(output, 'index.html'), 'utf8');
  assert.ok(!html.includes('node_modules'));
  const importmap = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
  assert.equal(importmap.imports.three, './vendor/three/build/three.module.js');
  assert.equal(importmap.imports['three/addons/'], './vendor/three/examples/jsm/');
  const closure = await moduleClosure(output, path.join(output, 'vendor/three'));
  for (const file of closure) assert.ok(inside(output, file));
  for (const file of actual.filter(file => file.endsWith('.css'))) {
    for (const match of (await readFile(path.join(output, file), 'utf8')).matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
      if (match[1].startsWith('data:')) continue;
      assert.ok(!/^(?:https?:|\/)/.test(match[1]), 'All CSS assets must be relative and local');
      const resolved = path.resolve(output, path.dirname(file), match[1]); assert.ok(inside(output, resolved)); assert.ok((await stat(resolved)).isFile());
    }
  }
  for (const [folder, id] of models) {
    const file = `assets/${folder}/${id}.glb`, glb = await readFile(path.join(output, file));
    assert.equal(glb.toString('ascii', 0, 4), 'glTF', file); assert.equal(glb.readUInt32LE(4), 2); assert.equal(glb.readUInt32LE(8), glb.length);
    assert.equal(glb.toString('ascii', 16, 20), 'JSON');
    const json = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)));
    assert.ok(json.meshes?.length > 0, `Empty GLB: ${file}`);
    for (const item of [...(json.buffers || []), ...(json.images || [])]) assert.ok(!item.uri || item.uri.startsWith('data:'), `Unpackaged external GLB resource: ${file}: ${item.uri}`);
    const png = await readFile(path.join(output, `assets/${folder}/${id}.png`));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), 512, `Portrait width: ${folder}/${id}`); assert.equal(png.readUInt32BE(20), 512, `Portrait height: ${folder}/${id}`);
  }
  for (const asset of texturePaths) { const png = await readFile(path.join(output, asset)); assert.equal(png.readUInt32BE(16), 1024); assert.equal(png.readUInt32BE(20), 1024); }
  assert.equal(actual.filter(file => file.endsWith('.glb')).length, models.length);
  assert.equal(actual.filter(file => file.startsWith('assets/buildings/') && file.endsWith('.glb')).length, Object.keys(CATALOG).length * MAX_BUILDING_LEVEL);
  for (const obsolete of ['fort_2', 'fort_3', 'wall_2', 'wall_3', 'upgrade_ornament']) assert.ok(!actual.includes(`assets/buildings/${obsolete}.glb`), `Obsolete runtime model shipped: ${obsolete}`);
  assert.equal(actual.filter(file => file.endsWith('.png')).length, models.length + texturePaths.length);
  assert.equal(actual.filter(file => file.endsWith('.ttf')).length, 2);
  const bytes = manifest.files.reduce((n, entry) => n + entry.bytes, 0);
  console.log(`Verified ${manifest.files.length} files · ${models.length} GLBs · ${models.length} portraits · ${texturePaths.length} PBR maps · ${closure.length} JS modules · ${(bytes / 1048576).toFixed(2)} MiB`);
  console.log(output);
}
await verify();
if (args.has('--zip')) {
  const base = path.join(project, 'release', 'monsoon-kingdoms');
  execFileSync('python3', ['-c', 'import pathlib,sys,zipfile\nfolder=pathlib.Path(sys.argv[1])\nwith zipfile.ZipFile(str(folder)+".zip", "w", zipfile.ZIP_DEFLATED) as archive:\n for p in sorted(folder.rglob("*")):\n  if p.is_file() and not p.name.startswith("._") and p.name != ".DS_Store": archive.write(p, p.relative_to(folder.parent))', base], { stdio: 'inherit' });
  console.log(`Archive: ${base}.zip`);
}
