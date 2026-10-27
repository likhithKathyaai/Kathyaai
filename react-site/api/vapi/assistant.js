import {createClient} from '@supabase/supabase-js';
const json=(res,status,data)=>res.status(status).json(data);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{error:'Method not allowed'});}
 const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return json(res,503,{error:'Workspace authentication is not configured'});
 const token=(req.headers.authorization||'').replace(/^Bearer\\s+/i,'');
 if(!token)return json(res,401,{error:'Sign in required'});
 const db=createClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false}});
 const {data:{user},error:authError}=await db.auth.getUser(token);
 if(authError||!user)return json(res,401,{error:'Invalid session'});
 const {recordId}=req.body||{};
 if(typeof recordId!=='string'||! /^[0-9a-f-]{36}$/i.test(recordId))return json(res,400,{error:'Valid agent record required'});
 const {data:record,error:readError}=await db.from('workspace_records').select('id,title,payload,status').eq('id',recordId).eq('user_id',user.id).eq('category','agents').single();
 if(readError||!record)return json(res,404,{error:'Agent not found'});
 const agentName=process.env.LIVEKIT_AGENT_NAME||'kathya-voice-agent';
 const payload={...record.payload,voiceProvider:'livekit',livekitAgentName:agentName,livekitConfiguredAt:new Date().toISOString()};
 const {error:saveError}=await db.from('workspace_records').update({payload,status:'configured'}).eq('id',record.id).eq('user_id',user.id);
 if(saveError)return json(res,502,{error:'Could not save LiveKit agent settings'});
 return json(res,200,{assistantId:agentName,recordId:record.id,status:'configured',provider:'livekit',note:'Agent configuration saved. Outbound calls still require a running LiveKit agent worker and a configured outbound SIP trunk.'});
}
