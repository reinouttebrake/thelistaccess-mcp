// Public read-only MCP adapter: reuse the canonical API rather than another calendar.
import {publicEventSearchResponse} from '../app/api/events/route';
import {editorialMcpEvent} from './editorial-events';
const versions=['2026-07-28','2025-11-25','2025-06-18','2025-03-26'];
const info={name:'the-list-access-events',title:'The List Access',version:'1.0.1',websiteUrl:'https://thelistaccess.nl'};
const notice='The List Access is a curated selection. Source-review warnings remain unresolved. Stored ticket status does not verify current prices, fees or stock; check the official ticket shop linked from the event page. Guestlist membership does not confirm admission.';
export const eventSearchTool={
 name:'search_events',title:'Doorzoek The List Access-evenementen',
 description:'Search upcoming and ongoing public The List Access events without opening the website. Combine event/artist/organizer text, city, genre, venue and inclusive dates in Europe/Amsterdam. Returns details, canonical links, source uncertainty and pagination. Date ranges include overnight events overlapping the selected days. Use from/to for dates; no purchases or guestlist registration.',
 annotations:{title:'Zoek events bij The List Access',readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false,untrustedContentHint:true},
 inputSchema:{type:'object',additionalProperties:false,properties:{
  q:{type:'string',maxLength:150,description:'Event, artist or organizer search text. All terms must match.'},
  city:{type:'string',maxLength:100,description:'City name, for example Amsterdam or Utrecht. Filters events to that city; omit for all cities.'},
  genre:{type:'string',maxLength:100,description:'Music genre, for example House or Techno. Matches published genre labels using the calendar genre aliases; omit for all genres.'},
  venue:{type:'string',maxLength:100,description:'Venue name, for example Paradiso. Matches the calendar venue identity; combine with city to distinguish venues with the same name.'},
  from:{type:'string',format:'date',description:'Inclusive YYYY-MM-DD start date.'},to:{type:'string',format:'date',description:'Inclusive YYYY-MM-DD end date.'},
  guestlist:{type:'boolean',description:'True selects listed guestlist actions; admission is never confirmed by this search.'},
  page:{type:'integer',minimum:1,maximum:99999,default:1,description:'Result page, starting at 1 (default). Use nextPage from the previous response with the same filters and limit; pages beyond available results return an error.'},limit:{type:'integer',minimum:1,maximum:20,default:10,description:'Maximum number of events per result page, from 1 to 20; defaults to 10. Keep the same limit when requesting subsequent pages.'}
 }}
};
const {guestlist:_guestlist,...editorialProperties}=eventSearchTool.inputSchema.properties;
const editorialTool={...eventSearchTool,title:'Doorzoek de redactionele eventagenda',description:'Search a restricted editorial selection of public events by event/artist/organizer text, city, genre, venue and inclusive dates in Europe/Amsterdam. Known campaigns, guestlists, List offers and detected promotional or affiliate content are excluded before filtering and pagination. Returns factual event details, canonical links and source-review flags. No advertising, ticket links, purchases or registrations.',inputSchema:{...eventSearchTool.inputSchema,properties:editorialProperties}};
type Profile='public'|'editorial';
const editorialNotice='Restricted editorial selection, not the complete agenda. No paid ranking, promotions, ticket links, prices or admission confirmation. Source-review flags remain relevant; unknown facts remain unknown. Canonical event pages are separate from this connector and may contain commercial site navigation.';
function object(value:unknown):value is Record<string,any>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
function searchParams(input:unknown,profile:Profile){
 if(!object(input))throw Error('Search arguments must be an object.');
 const params=new URLSearchParams();
 for(const [key,value] of Object.entries(input)){
  if(!Object.hasOwn(profile==='editorial'?editorialProperties:eventSearchTool.inputSchema.properties,key))throw Error('Unknown search parameter: '+key);
  if(key==='page'||key==='limit'){
   if(!Number.isInteger(value)||value<1||value>(key==='limit'?20:99999))throw Error('Invalid '+key);
   params.set(key,String(value));
  }else if(key==='guestlist'){
   if(typeof value!=='boolean')throw Error('guestlist must be a boolean.');
   if(value)params.set(key,'1');
  }else{
   if(typeof value!=='string'||value.length>(key==='q'?150:key==='from'||key==='to'?10:100))throw Error('Invalid '+key);
   params.set(key,value);
  }
 }
 if(!params.has('limit'))params.set('limit','10');
 return params;
}
export async function searchMcpEvents(input:unknown,profile:Profile='public'){
 const params=searchParams(input,profile);
 const response=await publicEventSearchResponse(new Request('https://thelistaccess.nl/api/events?'+params),profile==='editorial'?'editorial':'all');
 const data=await response.json() as Record<string,any>;
 if(!response.ok)throw Error(typeof data.error==='string'?data.error:'Event search unavailable.');
 // Explicit projection prevents accidentally exposing new internal fields.
 const fields=['slug','name','organizer','date','endDate','time','startDateTime','endDateTime','venue','city','genre','age','lineup','performers','description','status','sourceReviewPending','sourceUrl','checkedAt','modifiedAt','pageModifiedAt','factSources','enrichmentReview','guestlistAvailable','url'];
 return {total:data.total,page:data.page,limit:data.limit,pages:data.pages,hasMore:data.next!==null,nextPage:data.next?data.page+1:null,filters:data.filters,
  events:data.events.map((event:Record<string,unknown>)=>profile==='editorial'?editorialMcpEvent(event):Object.fromEntries(fields.filter(key=>event[key]!==undefined).map(key=>[key,event[key]]))),
  notice:profile==='editorial'?editorialNotice:notice,documentation:profile==='editorial'?'https://thelistaccess.nl/events/data/mcp#claude':'https://thelistaccess.nl/events/data',...(profile==='editorial'?{selection:'editorial-v1'}:{})};
}
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'};
function rpcError(id:unknown,code:number,message:string,status=400,data?:unknown){return Response.json({jsonrpc:'2.0',id,error:{code,message,...(data===undefined?{}:{data})}},{status,headers});}
function headerValue(value:string|null){
 if(value?.startsWith('=?base64?')&&value.endsWith('?=')){
  try{return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(value.slice(9,-2)),c=>c.charCodeAt(0)));}catch{return null;}
 }
 return value;
}
async function readBody(request:Request){
 const reader=request.body?.getReader();if(!reader)return '';
 let size=0;const chunks:Uint8Array[]=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();throw Error('Request too large');}chunks.push(value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
export function eventMcpResponse(request:Request){return mcpResponse(request,'public');}
export function editorialEventMcpResponse(request:Request){return mcpResponse(request,'editorial');}
async function mcpResponse(request:Request,profile:Profile){
 const tool=profile==='editorial'?editorialTool:eventSearchTool;
 const serverInfo=profile==='editorial'?{...info,name:'the-list-access-editorial-events',title:'The List Access · redactionele agenda'}:info;
 const instructions=profile==='editorial'?editorialNotice:notice;
 const origin=request.headers.get('Origin');
 if(origin&&origin!==new URL(request.url).origin&&origin!=='https://thelistaccess.nl')return rpcError(null,-32600,'Origin not allowed.',403);
 if(request.method!=='POST')return new Response(null,{status:405,headers:{...headers,Allow:'POST'}});
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')||''))return rpcError(null,-32600,'Use application/json.',415);
 const accept=request.headers.get('Accept');if(accept&&!accept.includes('application/json')&&!accept.includes('*/*'))return rpcError(null,-32600,'Accept application/json responses.',406);
 let body:Record<string,any>;
 try{const parsed=JSON.parse(await readBody(request));if(!object(parsed))return rpcError(null,-32600,'Expected one JSON-RPC request.');body=parsed;}catch(error){return rpcError(null,-32700,error instanceof Error&&error.message==='Request too large'?'Request too large.':'Invalid JSON.',error instanceof Error&&error.message==='Request too large'?413:400);}
 const id=typeof body.id==='string'||(typeof body.id==='number'&&Number.isFinite(body.id))?body.id:null;
 if(body.jsonrpc!=='2.0'||typeof body.method!=='string'||('id'in body&&id===null)||('params'in body&&!object(body.params)))return rpcError(id,-32600,'Invalid JSON-RPC request.');
 const params=body.params||{},meta=params._meta;
 const headerVersion=request.headers.get('MCP-Protocol-Version');
 const bodyVersion=object(meta)?meta['io.modelcontextprotocol/protocolVersion']:undefined;
 const version=headerVersion||bodyVersion||'2025-03-26';
 const modern=version==='2026-07-28';
 if(!versions.includes(version))return rpcError(id,-32022,'Unsupported protocol version.',400,{supported:versions,requested:version});
 if((headerVersion&&bodyVersion&&headerVersion!==bodyVersion)||(modern&&(headerVersion!==bodyVersion||request.headers.get('Mcp-Method')!==body.method||(body.method==='tools/call'&&headerValue(request.headers.get('Mcp-Name'))!==params.name))))return rpcError(id,-32020,'Missing or mismatched MCP headers.');
 if(modern&&(!object(meta)||!object(meta['io.modelcontextprotocol/clientCapabilities'])))return rpcError(id,-32602,'Client capabilities metadata is required.');
 if(!('id'in body)){
  if(body.method==='notifications/initialized'||body.method==='notifications/cancelled')return new Response(null,{status:202,headers});
  return rpcError(null,-32600,'A request id is required.');
 }
 const reply=(result:Record<string,unknown>)=>Response.json({jsonrpc:'2.0',id,result:{...(modern?{resultType:'complete'}:{}),...result}},{headers});
 if(body.method==='server/discover')return reply({resultType:'complete',supportedVersions:versions,capabilities:{tools:{}},_meta:{'io.modelcontextprotocol/serverInfo':serverInfo},instructions});
 if(body.method==='initialize'){
  if(modern)return rpcError(id,-32601,'Use server/discover for this protocol version.',404);
  const protocolVersion=versions.slice(1).includes(params.protocolVersion)?params.protocolVersion:'2025-11-25';
  return reply({protocolVersion,serverInfo,capabilities:{tools:{}},instructions});
 }
 if(body.method==='ping')return reply({});
 if(body.method==='tools/list'){
  if(params.cursor!==undefined)return rpcError(id,-32602,'This server has no tool-list continuation cursor.');
  return reply({tools:[tool]});
 }
 if(body.method!=='tools/call')return rpcError(id,-32601,'Method not found.',modern?404:200);
 if(params.name!==eventSearchTool.name)return rpcError(id,-32602,'Unknown tool.',200);
 try{
  const result=await searchMcpEvents(Object.hasOwn(params,'arguments')?params.arguments:{},profile);
  return reply({content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result,isError:false});
 }catch(error){
  // Input errors can be corrected by the client; storage errors disclose no internals.
  const message=error instanceof Error&&/^(Invalid |Unknown search |Search arguments|guestlist must|from must|Page exceeds|page must)/.test(error.message)?error.message:'Event search temporarily unavailable. Retry later.';
  return reply({content:[{type:'text',text:message}],isError:true});
 }
}
