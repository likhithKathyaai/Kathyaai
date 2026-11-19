import {createClient} from '@supabase/supabase-js';
import {timingSafeEqual} from 'node:crypto';

const json=(res,status,data)=>res.status(status).json(data);
const safeEqual=(a,b)=>{
  const left=Buffer.from(String(a||'')),right=Buffer.from(String(b||''));
  return left.length===right.length&&timingSafeEqual(left,right);
};

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  const secret=process.env.KATHYA_VAPI_WEBHOOK_SECRET;
  const supplied=req.headers['x-vapi-secret']||String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  if(!secret||!supplied||!safeEqual(supplied,secret))return json(res,401,{error:'Webhook authentication failed'});

  const url=process.env.VITE_SUPABASE_URL;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!serviceKey)return json(res,503,{error:'Server database credentials are not configured'});
  const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const envelope=req.body||{};
  const message=envelope.message||envelope;
  const type=message.type||envelope.type;
  if(type!=='end-of-call-report')return json(res,200,{received:true,ignored:true,eventType:type||'unknown'});

  const call=message.call||{};
  const assistantId=message.assistantId||call.assistantId||message.assistant?.id;
  const callId=call.id||message.callId||message.id;
  const seconds=Number(message.durationSeconds??call.durationSeconds??message.duration??0);
  if(!assistantId||!callId||!Number.isFinite(seconds)||seconds<=0){
    return json(res,422,{error:'Call report is missing assistant ID, call ID or valid duration'});
  }
  const minutes=Math.round((seconds/60)*100)/100;
  const {data:agent,error:agentError}=await db.from('workspace_records')
    .select('id,organization_id,payload').eq('category','agents')
    .contains('payload',{vapiAssistantId:assistantId}).maybeSingle();
  if(agentError||!agent?.organization_id)return json(res,404,{error:'No KATHYA workspace is mapped to this Vapi assistant'});

  const {data:usage,error:usageError}=await db.rpc('consume_voice_minutes',{
    p_org_id:agent.organization_id,
    p_minutes:minutes,
    p_provider_event_id:String(callId),
    p_provider:'vapi',
    p_agent_id:agent.id,
    p_call_id:String(callId),
    p_metadata:{assistant_id:assistantId,duration_seconds:seconds,ended_reason:message.endedReason||call.endedReason||null}
  });
  if(usageError){
    // Do not silently mark an uncharged call as billed. Return a retryable server error.
    return json(res,503,{error:'Voice usage could not be posted to the customer credit ledger'});
  }
  const providerCost=Number(message.cost??call.cost);
  if(Number.isFinite(providerCost)&&providerCost>=0){
    await db.from('voice_provider_cost_events').upsert({
      organization_id:agent.organization_id,provider:'vapi',provider_event_id:String(callId),
      cost_amount:providerCost,currency:'USD',metadata:{assistant_id:assistantId,duration_seconds:seconds}
    },{onConflict:'provider,provider_event_id',ignoreDuplicates:true});
  }
  return json(res,200,{received:true,billed_minutes:minutes,available_minutes:usage?.available_minutes??null,duplicate:usage?.duplicate??false});
}
