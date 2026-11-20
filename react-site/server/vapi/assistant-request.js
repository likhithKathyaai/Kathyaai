import {createClient} from '@supabase/supabase-js';
import {timingSafeEqual} from 'node:crypto';
const json=(res,status,data)=>res.status(status).json(data);
const safeEqual=(a,b)=>{const left=Buffer.from(String(a||'')),right=Buffer.from(String(b||''));return left.length===right.length&&timingSafeEqual(left,right)};
const pickPhone=(message,call)=>{
 const candidates=[message.phoneNumber,call.phoneNumber,call.phoneNumberId,message.phoneNumberId].filter(Boolean);
 for(const item of candidates){
  if(typeof item==='string')return {id:item,number:null};
  if(typeof item==='object')return {id:item.id||item.phoneNumberId||null,number:item.number||item.phoneNumber||null};
 }
 return {id:null,number:call.phoneNumber?.number||message.phoneNumber?.number||null};
};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 const expected=process.env.KATHYA_VAPI_WEBHOOK_SECRET;
 const supplied=req.query?.token;
 if(!expected||!supplied||!safeEqual(supplied,expected))return json(res,401,{error:'Webhook authentication failed'});
 const envelope=req.body||{},message=envelope.message||envelope;
 if(message.type!=='assistant-request')return json(res,200,{received:true,ignored:true});
 const call=message.call||{},phone=pickPhone(message,call);
 if(!phone.id&&!phone.number)return json(res,200,{error:'Sorry, this phone service is not configured. Please try again later.'});
 const url=process.env.VITE_SUPABASE_URL,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!serviceKey)return json(res,200,{error:'Sorry, the phone service is temporarily unavailable. Please try again later.'});
 const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 let {data:agent,error:agentError}=await db.from('workspace_records').select('id,organization_id,payload').eq('category','agents').contains('payload',{vapiPhoneNumberId:phone.id||'__no_id__'}).limit(2);
 if((!agent||!agent.length)&&phone.number){const fallback=await db.from('workspace_records').select('id,organization_id,payload').eq('category','agents').contains('payload',{vapiPhoneNumber:phone.number}).limit(2);agent=fallback.data;agentError=fallback.error;}
 if(agentError||!agent||agent.length!==1)return json(res,200,{error:'Sorry, this phone service is not available. Please try again later.'});
 const record=agent[0],assistantId=record.payload?.vapiAssistantId;
 if(!assistantId)return json(res,200,{error:'Sorry, this phone service is not ready. Please try again later.'});
 const {data:org,error:orgError}=await db.from('organizations').select('status').eq('id',record.organization_id).maybeSingle();
 if(orgError||!org||org.status!=='active')return json(res,200,{error:'Sorry, this phone service is temporarily unavailable. Please try again later.'});
 const {data:lots,error:creditError}=await db.from('voice_credit_lots').select('remaining_minutes,expires_at').eq('organization_id',record.organization_id).gt('remaining_minutes',0).gt('expires_at',new Date().toISOString());
 if(creditError)return json(res,200,{error:'Sorry, this phone service is temporarily unavailable. Please try again later.'});
 const available=(lots||[]).reduce((sum,lot)=>sum+Number(lot.remaining_minutes||0),0);
 if(available<=0)return json(res,200,{error:'This business is temporarily unable to take calls. Please try again later.'});
 return json(res,200,{assistantId});
}
