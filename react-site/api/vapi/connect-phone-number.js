import {createClient} from '@supabase/supabase-js';
const json=(res,status,data)=>res.status(status).json(data);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 const apiKey=process.env.VAPI_PRIVATE_API_KEY;
 if(!apiKey)return json(res,503,{error:'Vapi private key is not configured on the server'});
 const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return json(res,503,{error:'Supabase auth is not configured'});
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token)return json(res,401,{error:'Sign in required'});
 const db=createClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false}});
 const {data:{user},error:authError}=await db.auth.getUser(token);
 if(authError||!user)return json(res,401,{error:'Invalid session'});
 const {recordId}=req.body||{};
 if(typeof recordId!=='string'||! /^[0-9a-f-]{36}$/i.test(recordId))return json(res,400,{error:'Valid agent record required'});
 const {data:record,error:readError}=await db.from('workspace_records').select('id,title,payload,status,organization_id').eq('id',recordId).eq('category','agents').single();
 if(readError||!record)return json(res,404,{error:'Agent not found'});
 const {data:membership}=await db.from('organization_members').select('role').eq('organization_id',record.organization_id).eq('user_id',user.id).maybeSingle();
 if(!membership||!['owner','admin','member'].includes(membership.role))return json(res,403,{error:'You do not have permission to connect phone numbers in this workspace'});
 const phoneNumberId=record.payload?.vapiPhoneNumberId;
 if(!phoneNumberId)return json(res,400,{error:'Add a Vapi phone-number ID to this agent before connecting it. Each customer must use an assigned phone number.'});
 const assistantId=record.payload?.vapiAssistantId;
 if(!assistantId)return json(res,409,{error:'Deploy this agent to Vapi before connecting a phone number'});
 if(record.payload?.vapiPhoneNumberConnectedAt)return json(res,409,{error:'A phone number is already recorded as connected to this agent'});
 try{
  const headers={Authorization:'Bearer '+apiKey,'Content-Type':'application/json'};
  const currentResponse=await fetch('https://api.vapi.ai/phone-number/'+encodeURIComponent(phoneNumberId),{headers});
  const current=await currentResponse.json().catch(()=>({}));
  if(!currentResponse.ok)return json(res,502,{error:'Could not verify the configured Vapi phone number',details:current?.message||current?.error||currentResponse.status});
  if(current.assistantId&&current.assistantId!==assistantId)return json(res,409,{error:'This phone number is already assigned to a different Vapi assistant. No changes were made.'});
  if(current.squadId)return json(res,409,{error:'This phone number is currently assigned to a Vapi squad. No changes were made.'});
  let connected=current;
  if(current.assistantId!==assistantId){
   const patchResponse=await fetch('https://api.vapi.ai/phone-number/'+encodeURIComponent(phoneNumberId),{method:'PATCH',headers,body:JSON.stringify({assistantId})});
   connected=await patchResponse.json().catch(()=>({}));
   if(!patchResponse.ok)return json(res,502,{error:'Vapi could not attach the phone number',details:connected?.message||connected?.error||patchResponse.status});
   if(connected.assistantId!==assistantId)return json(res,502,{error:'Vapi did not confirm the expected assistant assignment'});
  }
  const payload={...record.payload,vapiPhoneNumberId:phoneNumberId,vapiPhoneNumber:connected.number||current.number||null,vapiPhoneNumberConnectedAt:new Date().toISOString()};
  const {error:saveError}=await db.from('workspace_records').update({payload,status:'configured'}).eq('id',record.id).eq('organization_id',record.organization_id);
  if(saveError)return json(res,502,{error:'Vapi connected the phone number, but workspace sync failed. Do not retry; contact support to reconcile it.',connected:true});
  return json(res,200,{connected:true,recordId:record.id,assistantId,phoneNumber:connected.number||current.number||null});
 }catch(e){return json(res,502,{error:'Vapi phone-number service is unavailable'})}
}
