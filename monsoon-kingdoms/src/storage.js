import { hydrate, newGame, CATALOG, canPlace, MAX_BUILDING_LEVEL } from './rules.js';
export const SAVE='monsoon.kingdoms.v1';
export function decodeSave(raw){
  if(typeof raw!=='string'||raw.length>2_000_000)throw new Error('Choose a kingdom JSON backup smaller than 2 MB.');
  const data=JSON.parse(raw),value=data?.format==='monsoon-kingdoms-backup'?data.kingdom:data;
  if(!value||value.version!==1||!Array.isArray(value.buildings)||!value.buildings.length||value.buildings.length>150||!value.resources||!value.army)throw new Error('This file is not a supported kingdom save.');
  const layout={...newGame(),buildings:[]};
  for(const b of value.buildings){if(!b||!Object.hasOwn(CATALOG,b.type)||!canPlace(layout,b.type,b.x,b.z).ok||!Number.isInteger(b.level)||b.level<0||b.level>MAX_BUILDING_LEVEL)throw new Error('The backup contains an invalid village layout.');layout.buildings.push({...b,w:CATALOG[b.type].w,h:CATALOG[b.type].h});}
  if(!value.buildings.some(b=>b.type==='fort'&&b.level>0))throw new Error('The backup has no completed capital.');
  return hydrate(value);
}
export function loadSave(storage){
  try{const raw=storage.getItem(SAVE);if(raw)try{return {state:decodeSave(raw),available:true};}catch{const backup=storage.getItem(SAVE+'.backup');if(backup)return {state:decodeSave(backup),available:true,recovered:true};return {state:newGame(),available:true,corrupt:true};}return {state:newGame(),available:true};}catch{return {state:newGame(),available:false};}
}
export function storeSave(storage,state){const raw=JSON.stringify(state),old=storage.getItem(SAVE);if(old)try{decodeSave(old);storage.setItem(SAVE+'.backup',old);}catch{/* Preserve the last valid backup when the primary is damaged. */}storage.setItem(SAVE,raw);}
export const encodeSave=state=>JSON.stringify({format:'monsoon-kingdoms-backup',exportedAt:new Date().toISOString(),kingdom:state},null,2);
