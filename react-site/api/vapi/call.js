import {createClient} from '@supabase/supabase-js';
const json=(res,status,data)=>res.status(status).json(data);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{error:'Method not allowed'});}
 const apiKey=process.env.VAPI_PRIVATE_API_KEY;
 const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!apiKey)return json(res,503,{error:'Vapi private key is not configured on the server'});
 if(!url||!key)return json(res,503,{error:'Supabase authentication is not configured'});
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token)return json(res,401,{error:'Sign in required'});
 const db=createClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false}});
 const {data:{user},error:authError}=await db.auth.getUser(token);
 if(authError||!user)return json(res,401,{error:'Invalid session'});
 const {recordId,customerNumber}=req.body||{};
 if(typeof recordId!=='string'||! /^[0-9a-f-]{36}$/i.test(recordId))return json(res,400,{error:'Valid agent record required'});
 const number=String(customerNumber||'').trim();
 if(!/^\+[1-9]\d{7,14}$/.test(number))return json(res,400,{error:'Enter a valid phone number in international format, for example +14155550123'});
 const {data:agent,error:readError}=await db.from('workspace_records').select('id,title,payload').eq('id',recordId).eq('user_id',user.id).eq('category','agents').single();
 if(readError||!agent)return json(res,404,{error:'Agent not found'});
 const assistantId=agent.payload?.vapiAssistantId;
 if(!assistantId)return json(res,409,{error:'Deploy this agent to Vapi before placing a call'});
 const phoneNumberId=agent.payload?.vapiPhoneNumberId||agent.payload?.fields?.['Vapi phone number ID (optional)']||process.env.VAPI_PHONE_NUMBER_ID;
 if(!phoneNumberId)return json(res,503,{error:'No Vapi phone number is connected. Add VAPI_PHONE_NUMBER_ID in Vercel or assign a phone number to this agent.'});
 const {data:allowed,error:limitError}=await db.rpc('consume_kathya_rate_limit',{p_action:'vapi_test_call'});
 if(limitError)return json(res,503,{error:'Apply supabase/api_rate_limits.sql before placing test calls.'});
 if(!allowed)return json(res,429,{error:'Test call limit reached. Try again later.'});
 try{
  const response=await fetch('https://api.vapi.ai/call',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify({assistantId,phoneNumberId,customer:{number}})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)return json(res,502,{error:result?.message||result?.error||'Vapi could not start this call'});
  return json(res,200,{ok:true,callId:result.id||null,status:result.status||'queued'});
 }catch(e){return json(res,502,{error:'Vapi call service is unavailable'});}
}
