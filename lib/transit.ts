export const networkModes = ['metro','tram','bus','rail'] as const;
export type NetworkMode = typeof networkModes[number];
export type Networks = Record<NetworkMode,boolean>;
export const defaultNetworks:Networks={metro:true,tram:false,bus:false,rail:false};
export const networkInfo={metro:{label:'T-bane',color:'#e47721'},tram:{label:'Tram',color:'#1688bd'},bus:{label:'Bus',color:'#c83b42'},rail:{label:'Train',color:'#32844a'}};
export function parseNetworks(value:unknown):Networks{
 if(value===undefined)return {...defaultNetworks};
 if(!value||typeof value!=='object'||networkModes.some(k=>typeof (value as any)[k]!=='boolean'))throw Object.assign(new Error('Choose on or off for each transport network.'),{status:400});
 return Object.fromEntries(networkModes.map(k=>[k,(value as Networks)[k]])) as Networks;
}
