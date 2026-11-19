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
 const {data:record,error:readError}=await db.from('workspace_records').select('id,title,payload,status,organization_id').eq('id',recordId).eq('category','agents').single();
 if(readError||!record)return json(res,404,{error:'Agent not found'});
 const {data:membership}=await db.from('organization_members').select('role').eq('organization_id',record.organization_id).eq('user_id',user.id).maybeSingle();
 if(!membership||!['owner','admin','member'].includes(membership.role))return json(res,403,{error:'You do not have permission to deploy agents in this workspace'});
 if(record.payload?.vapiAssistantId)return json(res,409,{error:'Agent already deployed to Vapi'});
 const fields=record.payload?.fields||{};
 const name=(record.title||'KATHYA Agent').slice(0,40);
 const prompt=String(fields.Instructions||'You are a helpful business voice assistant. Answer questions accurately, ask clarifying questions, and offer a human handoff when needed. Do not invent facts.').slice(0,6000);
 const purpose=String(fields.Purpose||'Customer support').slice(0,300);
 const language=String(fields['Default language']||record.payload?.language||'en').slice(0,16);
 const multilingual=fields['Multilingual support']!=='Disabled';
 const voiceProvider=String(fields['Voice provider']||'openai').slice(0,32);
 const voiceId=String(fields['Voice ID']||'alloy').slice(0,100);
 const supportedLanguages=String(fields['Supported languages']||'English').slice(0,500);
 const systemPrompt='You are '+name+'. Business purpose: '+purpose+'. '+prompt+'\\nDefault language: '+language+'. Supported languages: '+supportedLanguages+'. '+(multilingual?'Detect the caller’s language and respond naturally in that language. Keep the conversation in the caller’s preferred language unless they request a change.':'Respond in the configured default language unless asked otherwise.')+' Never claim a language or capability you cannot provide.';
 const webhookUrl=process.env.VERCEL_URL?'https://'+process.env.VERCEL_URL+'/api/vapi/webhook':null;
 const body={name,...(webhookUrl&&process.env.KATHYA_VAPI_WEBHOOK_SECRET?{serverUrl:webhookUrl,serverUrlSecret:process.env.KATHYA_VAPI_WEBHOOK_SECRET,serverMessages:['end-of-call-report']}:{}),firstMessage:'Hello! You are speaking with '+name+'. How can I help you?',model:{provider:'openai',model:'gpt-4o-mini',messages:[{role:'system',content:systemPrompt}]},voice:{provider:voiceProvider,voiceId, ...(voiceProvider==='openai'?{model:'tts-1'}:{})},transcriber:{provider:'deepgram',model:'nova-3',language:multilingual?'multi':language},maxDurationSeconds:300};
 try{
  const result=await fetch('https://api.vapi.ai/assistant',{method:'POST',headers:{Authorization:'Bearer '+process.env.VAPI_PRIVATE_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const response=await result.json().catch(()=>({}));
  if(!result.ok)return json(res,502,{error:'Vapi rejected assistant configuration',details:response?.message||response?.error||result.status});
  if(!response.id)return json(res,502,{error:'Vapi returned no assistant ID'});
  const payload={...record.payload,vapiAssistantId:response.id,vapiProvider:'vapi',vapiCreatedAt:new Date().toISOString()};
  const {error:saveError}=await db.from('workspace_records').update({payload,status:'configured'}).eq('id',record.id).eq('organization_id',record.organization_id);
  if(saveError)return json(res,502,{error:'Vapi assistant created but database sync failed. Contact support before retrying.',assistantId:response.id});
  return json(res,200,{assistantId:response.id,recordId:record.id,status:'configured'});
 }catch(e){return json(res,502,{error:'Vapi service unavailable'})}
}
