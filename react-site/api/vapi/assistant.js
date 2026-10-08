import {createClient} from '@supabase/supabase-js';
const json=(res,status,data)=>res.status(status).json(data);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 if(!process.env.VAPI_PRIVATE_API_KEY)return json(res,503,{error:'Vapi private key not configured on server'});
 const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return json(res,503,{error:'Supabase auth not configured'});
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token)return json(res,401,{error:'Sign in required'});
 const db=createClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false}});
 const {data:{user},error:authError}=await db.auth.getUser(token);
 if(authError||!user)return json(res,401,{error:'Invalid session'});
 const {recordId}=req.body||{};
 if(typeof recordId!=='string'||! /^[0-9a-f-]{36}$/i.test(recordId))return json(res,400,{error:'Valid agent record required'});
 const {data:record,error:readError}=await db.from('workspace_records').select('id,title,payload,status').eq('id',recordId).eq('user_id',user.id).eq('category','agents').single();
 if(readError||!record)return json(res,404,{error:'Agent not found'});
 if(record.payload?.vapiAssistantId)return json(res,409,{error:'Agent already deployed to Vapi'});
 const fields=record.payload?.fields||{};
 const name=(record.title||'KATHYA Agent').slice(0,40);
 const prompt=String(fields.Instructions||'You are a helpful business voice assistant. Answer questions accurately, ask clarifying questions, and offer a human handoff when needed. Do not invent facts.').slice(0,6000);
 const purpose=String(fields.Purpose||'Customer support').slice(0,300);
 const body={name,firstMessage:'Hello! You are speaking with '+name+'. How can I help you?',model:{provider:'openai',model:'gpt-4o-mini',messages:[{role:'system',content:'You are '+name+'. Business purpose: '+purpose+'. '+prompt}]},voice:{provider:'openai',voiceId:'alloy',model:'tts-1'},maxDurationSeconds:300};
 try{
  const result=await fetch('https://api.vapi.ai/assistant',{method:'POST',headers:{Authorization:'Bearer '+process.env.VAPI_PRIVATE_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const response=await result.json().catch(()=>({}));
  if(!result.ok)return json(res,502,{error:'Vapi rejected assistant configuration',details:response?.message||response?.error||result.status});
  if(!response.id)return json(res,502,{error:'Vapi returned no assistant ID'});
  const payload={...record.payload,vapiAssistantId:response.id,vapiProvider:'vapi',vapiCreatedAt:new Date().toISOString()};
  const {error:saveError}=await db.from('workspace_records').update({payload,status:'configured'}).eq('id',record.id).eq('user_id',user.id);
  if(saveError)return json(res,502,{error:'Vapi assistant created but database sync failed. Contact support before retrying.',assistantId:response.id});
  return json(res,200,{assistantId:response.id,recordId:record.id,status:'configured'});
 }catch(e){return json(res,502,{error:'Vapi service unavailable'})}
}
