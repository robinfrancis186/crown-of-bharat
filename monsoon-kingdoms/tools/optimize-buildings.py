"""Compact normal/color buffers with glTF Transform; positions remain exact.
Run after build-buildings.py, then node tools/verify-buildings.mjs.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import subprocess,json
root=Path(__file__).resolve().parents[1];folder=root/'assets/buildings'
def optimize(item):
 src=root/item['file'];tmp=src.with_suffix('.optimized.glb')
 subprocess.run(['npx','--yes','@gltf-transform/cli@4.5.0','quantize',str(src),str(tmp),'--pattern','{NORMAL,COLOR_*}'],check=True,capture_output=True)
 tmp.replace(src);item['bytes']=src.stat().st_size
 print(item['id'],item['bytes'],flush=True)
manifest=json.loads((folder/'manifest.json').read_text())
with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(optimize,manifest['assets']))
manifest['optimization']='glTF Transform 4.5.0: quantized normals and vertex colors, exact float32 positions; no decoder dependency'
(folder/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
