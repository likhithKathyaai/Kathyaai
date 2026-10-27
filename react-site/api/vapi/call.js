import crypto from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

const json=(res,status,data)=>res.status(status).json(data);
const b64url=value=>Buffer.from(value).toString('base64url');
function livekitToken(apiKey,apiSecret,roomName){
 const now=Math.floor(Date.now()/1000);
 const header=b64url(JSON.stringify({alg:'HS256',typ:'JWT'}));
 const payload=b64url(JSON.stringify({
  iss:apiKey,sub:'kathya-preview-call',nbf:now-5,iat:now,exp:now+300,
  video:{room:roomName,roomJoin:true,roomCreate:true,roomAdmin:true},
  sip:true
 }));
 const unsigned=header+'.'+payload;
 const signature=crypto.createHmac('sha256',apiSecret).update(unsigned).digest('base64url');
 return unsigned+'.'+signature;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{error:'Method not allowed'});}
 const livekitUrl=process.env.LIVEKIT_URL;
 const apiKey=process.env.LIVEKIT_API_KEY;
 const apiSecret=process.env.LIVEKIT_API_SECRET;
 const trunkId=process.env.LIVEKIT_SIP_OUTBOUND_TRUNK_ID;
 if(!livekitUrl||!apiKey||!apiSecret||!trunkId){
  return json(res,503,{error:'LiveKit outbound calling is not configured. Add LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_SIP_OUTBOUND_TRUNK_ID to this Preview deployment. An outbound SIP carrier is required; LiveKit Cloud phone numbers are inbound-only.'});
 }
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
 const roomName='kathya-'+crypto.randomUUID();
 const participantIdentity='customer-'+crypto.randomUUID();
 const participantName=String(record.title||'KATHYA customer').slice(0,80);
 const base=livekitUrl.replace(/\\/$/,'').replace(/^http:/,'https:');
 const endpoint=base+'/twirp/livekit.SIP/CreateSIPParticipant';
 const auth=livekitToken(apiKey,apiSecret,roomName);
 try{
  const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+auth,'Content-Type':'application/json'},body:JSON.stringify({
   sip_trunk_id:trunkId,sip_call_to:phoneNumber,room_name:roomName,
   participant_identity:participantIdentity,participant_name:participantName,
   wait_until_answered:true,
   room_config:{agents:[{agent_name:process.env.LIVEKIT_AGENT_NAME||'kathya-voice-agent'}]}
  })});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
   console.error('LiveKit outbound SIP request failed',response.status);
   return json(res,502,{error:'LiveKit could not start the outbound call. Check the SIP trunk, API credentials, and agent worker configuration.',providerStatus:response.status});
  }
  const payload={...record.payload,voiceProvider:'livekit',lastOutboundCall:{id:data.participant_id||participantIdentity,roomName,status:'initiated',to:phoneNumber,createdAt:new Date().toISOString()}};
  const {error:saveError}=await db.from('workspace_records').update({payload,status:'configured'}).eq('id',record.id).eq('user_id',user.id);
  if(saveError)return json(res,200,{callId:data.participant_id||participantIdentity,roomName,status:'initiated',warning:'Call request accepted; dashboard sync failed.'});
  return json(res,200,{callId:data.participant_id||participantIdentity,roomName,status:'initiated',provider:'livekit'});
 }catch(e){
  console.error('LiveKit outbound call request failed');
  return json(res,502,{error:'LiveKit service unavailable'});
 }
}
