import {createClient} from '@supabase/supabase-js';
const json=(res,status,data)=>res.status(status).json(data);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 const apiKey=process.env.VAPI_PRIVATE_API_KEY,phoneNumberId=process.env.VAPI_PHONE_NUMBER_ID;
 if(!apiKey||!phoneNumberId)return json(res,503,{error:'Vapi calling is not fully configured. Set VAPI_PRIVATE_API_KEY and VAPI_PHONE_NUMBER_ID on the server.'});
 const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return json(res,503,{error:'Workspace authentication is not configured'});
 const token=(req.headers.authorization||'').replace(/^Bearer\\s+/i,'');
 if(!token)return json(res,401,{error:'Sign in required'});
 const db=createClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false}});
 const {data:{user},error:authError}=await db.auth.getUser(token);
 if(authError||!user)return json(res,401,{error:'Invalid session'});
 const {recordId,phoneNumber,consentConfirmed}=req.body||{};
 if(consentConfirmed!==true)return json(res,400,{error:'Confirm that the recipient has consented to receive this call.'});
 if(typeof recordId!=='string'||! /^[0-9a-f-]{36}$/i.test(recordId))return json(res,400,{error:'Valid agent record required'});
 if(typeof phoneNumber!=='string'||! /^\\+[1-9]\\d{7,14}$/.test(phoneNumber))return json(res,400,{error:'Enter the recipient number in international format, e.g. +14155550123.'});
 const {data:record,error:readError}=await db.from('workspace_records').select('id,title,payload,status').eq('id',recordId).eq('user_id',user.id).eq('category','agents').single();
 if(readError||!record)return json(res,404,{error:'Agent not found'});
 const assistantId=record.payload?.vapiAssistantId;
 if(!assistantId)return json(res,409,{error:'Deploy this agent to Vapi before placing a test call.'});
 try{
  const response=await fetch('https://api.vapi.ai/call/phone',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify({assistantId,phoneNumberId,customer:{number:phoneNumber},metadata:{workspaceUserId:user.id,workspaceRecordId:record.id,callType:'manual-consented-test'}})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)return json(res,502,{error:'Vapi could not start the call',details:data?.message||data?.error||response.status});
  const payload={...record.payload,lastOutboundCall:{id:data.id||null,status:data.status||'queued',to:phoneNumber,createdAt:new Date().toISOString()}};
  const {error:saveError}=await db.from('workspace_records').update({payload,status:'configured'}).eq('id',record.id).eq('user_id',user.id);
  if(saveError)return json(res,200,{callId:data.id||null,status:data.status||'queued',warning:'Call request accepted; call details could not be synced to the dashboard.'});
  return json(res,200,{callId:data.id||null,status:data.status||'queued'});
 }catch(e){return json(res,502,{error:'Vapi service unavailable'})}
}