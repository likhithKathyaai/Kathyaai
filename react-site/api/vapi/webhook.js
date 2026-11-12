import {createClient} from '@supabase/supabase-js';
import {timingSafeEqual} from 'node:crypto';
const json=(res,status,data)=>res.status(status).json(data);
const sameSecret=(provided,expected)=>{if(typeof provided!=='string'||typeof expected!=='string')return false;const a=Buffer.from(provided),b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b)};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{error:'Method not allowed'});}
 const expected=process.env.KATHYA_VAPI_WEBHOOK_SECRET;
 if(!expected)return json(res,503,{error:'Vapi webhook secret is not configured'});
 if(!sameSecret(req.headers['x-kathya-webhook-secret'],expected))return json(res,401,{error:'Unauthorized webhook'});
 const url=process.env.VITE_SUPABASE_URL,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!serviceKey)return json(res,503,{error:'Server database credentials are not configured'});
 const message=req.body?.message||{},type=message.type;
 if(!['status-update','end-of-call-report'].includes(type))return json(res,200,{ok:true,ignored:true});
 const call=message.call||{},assistantId=call.assistantId||message.assistant?.id,callId=call.id;
 if(typeof assistantId!=='string'||typeof callId!=='string')return json(res,400,{error:'Call or assistant reference missing'});
 const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const{data:agent,error:agentError}=await db.from('workspace_records').select('id,user_id,title').eq('category','agents').contains('payload',{vapiAssistantId:assistantId}).maybeSingle();
  if(agentError)return json(res,500,{error:'Could not resolve the owning agent'});
  if(!agent)return json(res,404,{error:'No KATHYA agent is linked to this Vapi assistant'});
  const artifact=message.artifact||{},transcript=typeof artifact.transcript==='string'?artifact.transcript:'';
  const startedAt=call.startedAt||null,endedAt=call.endedAt||null;
  const parsedDuration=startedAt&&endedAt?Math.round((Date.parse(endedAt)-Date.parse(startedAt))/1000):null;
  const durationSeconds=Number.isFinite(parsedDuration)?Math.max(0,parsedDuration):null;
  const status=type==='end-of-call-report'?'ended':String(message.status||call.status||'in-progress').slice(0,40);
  const structuredData=message.analysis?.structuredData||message.analysis?.structured_data||{};
  const summary=String(message.analysis?.summary||message.summary||transcript.slice(0,240)||'').slice(0,1000);
  const callRow={user_id:agent.user_id,agent_record_id:agent.id,call_id:callId,assistant_id:assistantId,customer_number:call.customer?.number||call.customerNumber||null,direction:call.type||null,status,ended_reason:message.endedReason||call.endedReason||null,started_at:startedAt,ended_at:endedAt,duration_seconds:durationSeconds,summary:summary||null,transcript:transcript||null,recording_url:artifact.recording?.url||null,updated_at:new Date().toISOString()};
  const{error:callSaveError}=await db.from('vapi_calls').upsert(callRow,{onConflict:'call_id'});
  if(callSaveError)return json(res,500,{error:'Could not save live call state'});
  if(type==='status-update')return json(res,200,{ok:true,live:true});
  const{data:existing,error:existingError}=await db.from('workspace_records').select('id').eq('user_id',agent.user_id).eq('category','conversations').contains('payload',{vapiCallId:callId}).maybeSingle();
  if(existingError)return json(res,500,{error:'Could not check conversation history'});
  if(existing)return json(res,200,{ok:true,duplicate:true});
  const payload={vapiCallId:callId,vapiAssistantId:assistantId,agentRecordId:agent.id,agentName:agent.title,channel:'voice',status:'completed',endedReason:callRow.ended_reason,startedAt,endedAt,durationSeconds,summary:summary||'Call completed',transcript,structuredData,intent:structuredData.intent||structuredData.customerIntent||null,outcome:structuredData.outcome||structuredData.result||null,outcomeType:structuredData.outcomeType||structuredData.outcome_type||null,humanHandoff:Boolean(structuredData.humanHandoff||structuredData.human_handoff),actionStarted:Boolean(structuredData.actionStarted||structuredData.action_started||structuredData.action),recordingUrl:artifact.recording?.url||null,recordingAvailable:Boolean(artifact.recording?.url),createdAt:new Date().toISOString()};
  const{error:insertError}=await db.from('workspace_records').insert({user_id:agent.user_id,category:'conversations',title:agent.title+' · '+new Date(endedAt||Date.now()).toLocaleString('en-US'),payload,status:'configured'});
  if(insertError)return json(res,500,{error:'Could not save the call report'});
  return json(res,200,{ok:true,saved:true});
 }catch(e){return json(res,500,{error:'Webhook processing failed'});}
}
