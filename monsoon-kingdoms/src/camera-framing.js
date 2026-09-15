// Keep the editable village close on wide phones; battles retain a tactical overview.
export function cameraLimits(mode, aspect) {
  const ratio=Math.max(1,Number(aspect)||1);
  return mode==='battle' ? {min:22,max:64,start:57,pan:20} :
    {min:16,max:Math.max(16,Math.min(40,80/ratio)),start:Math.max(16,Math.min(31,68/ratio)),pan:16};
}
export function villageFocus(buildings) {
  const live=buildings.filter(b=>b.hp!==0);
  if(!live.length)return {x:0,z:0};
  const minX=Math.min(...live.map(b=>b.x)),maxX=Math.max(...live.map(b=>b.x+b.w));
  const minZ=Math.min(...live.map(b=>b.z)),maxZ=Math.max(...live.map(b=>b.z+b.h));
  return {x:minX+maxX-24,z:minZ+maxZ-24};
}
