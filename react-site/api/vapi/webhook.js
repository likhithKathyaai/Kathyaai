import {createClient} from '@supabase/supabase-js';
import {timingSafeEqual} from 'node:crypto';
const json=(res,status,data)=>res.status(status).json(data);
const sameSecret=(provided,expected)=>{if(typeof provided!=='string'||typeof expected!=='string')return false;const a=Buffer.from(provided);const b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b)};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{error:'Method not allowed'});}
 const expected=process.env.KATHYA_VAPI_WEBHOOK_SECRET;
 if(!expected)return json(res,503,{error:'Vapi webhook secret is not configured'});
 if(!sameSecret(req.headers['x-kathya-webhook-secret'],expected))return json(res,401,{error:'Unauthorized webhook'});
 const url=process.env.VITE_SUPABASE_URL;
 const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!serviceKey)return json(res,503,{error:'Server database credentials are not configured'});
 const message=req.body?.message||{};
 if(message.type!=='end-of-call-report')return json(res,200,{ok:true,ignored:true});
 const call=message.call||{};
 const assistantId=call.assistantId||message.assistant?.id;
 const callId=call.id;
 if(typeof assistantId!=='string'||typeof callId!=='string')return json(res,400,{error:'Call or assistant reference missing'});
 const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const {data:agent,error:agentError}=await db.from('workspace_records').select('id,user_id,title').eq('category','agents').contains('payload',{vapiAssistantId:assistantId}).maybeSingle();
  if(agentError)return json(res,500,{error:'Could not resolve the owning agent'});
  if(!agent)return json(res,404,{error:'No KATHYA agent is linked to this Vapi assistant'});
  const {data:existing,error:existingError}=await db.from('workspace_records').select('id').eq('user_id',agent.user_id).eq('category','conversations').contains('payload',{vapiCallId:callId}).maybeSingle();
  if(existingError)return json(res,500,{error:'Could not check conversation history'});
  if(existing)return json(res,200,{ok:true,duplicate:true});
  const artifact=message.artifact||{};
  const transcript=typeof artifact.transcript==='string'?artifact.transcript:'';
  const summary=String(message.analysis?.summary||message.summary||transcript.slice(0,240)||'Call completed').slice(0,1000);
  const startedAt=call.startedAt||null;
  const endedAt=call.endedAt||new Date().toISOString();
  const durationSeconds=startedAt?Math.max(0,Math.round((Date.parse(endedAt)-Date.parse(startedAt))/1000)):null;
  const payload={vapiCallId:callId,vapiAssistantId:assistantId,agentRecordId:agent.id,agentName:agent.title,channel:'voice',status:call.status||'ended',endedReason:message.endedReason||call.endedReason||null,startedAt,endedAt,durationSeconds,summary,transcript,recordingUrl:artifact.recording?.url||null,recordingAvailable:Boolean(artifact.recording?.url),createdAt:new Date().toISOString()};
  const {error:insertError}=await db.from('workspace_records').insert({user_id:agent.user_id,category:'conversations',title:agent.title+' · '+new Date(endedAt).toLocaleString('en-US'),payload,status:'configured'});
  if(insertError)return json(res,500,{error:'Could not save the call report'});
  return json(res,200,{ok:true,saved:true});
 }catch(e){return json(res,500,{error:'Webhook processing failed'});}
}
