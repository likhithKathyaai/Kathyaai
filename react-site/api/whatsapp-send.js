import {createClient} from '@supabase/supabase-js';
const clean=(v,n=2000)=>String(v||'').trim().slice(0,n);
const json=(res,status,data)=>res.status(status).json(data);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{error:'Method not allowed'});}
 const apiToken=process.env.WHATSAPP_ACCESS_TOKEN;
 const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!apiToken)return json(res,503,{error:'WhatsApp Cloud API is not configured on the server'});
 if(!url||!key)return json(res,503,{error:'Supabase authentication is not configured'});
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token)return json(res,401,{error:'Sign in required'});
 const db=createClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false}});
 const {data:{user},error:authError}=await db.auth.getUser(token);
 if(authError||!user)return json(res,401,{error:'Invalid session'});
 const to=clean(req.body?.to,24).replace(/[^0-9]/g,'');
 const body=clean(req.body?.message,1500);
 const phoneNumberId=clean(req.body?.phoneNumberId,40);
 if(!/^\d{8,15}$/.test(to)||!body||!/^\d{5,30}$/.test(phoneNumberId))return json(res,400,{error:'Enter a valid recipient number, message and connected WhatsApp channel.'});
 const {data:channel,error:channelError}=await db.from('whatsapp_channels').select('id,phone_number_id,display_phone_number').eq('user_id',user.id).eq('phone_number_id',phoneNumberId).single();
 if(channelError||!channel)return json(res,404,{error:'Connect this WhatsApp channel to your workspace first.'});
 try{
  const version=process.env.WHATSAPP_GRAPH_API_VERSION||'v23.0';
  const response=await fetch('https://graph.facebook.com/'+version+'/'+encodeURIComponent(channel.phone_number_id)+'/messages',{method:'POST',headers:{Authorization:'Bearer '+apiToken,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to,type:'text',text:{body}})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok){console.error('WhatsApp send failed',{status:response.status,code:result?.error?.code||null});return json(res,502,{error:'WhatsApp rejected the message. Check the Meta number, token and recipient opt-in.'});}
  const messageId=result.messages?.[0]?.id||null;
  let persisted=false;
  if(messageId){
   const {error:saveError}=await db.from('whatsapp_messages').insert({user_id:user.id,channel_id:channel.id,wa_message_id:messageId,direction:'outbound',from_number:channel.display_phone_number,to_number:to,message_type:'text',message_text:body,delivery_status:'accepted'});
   persisted=!saveError;
  }
  return json(res,200,{ok:true,id:messageId,persisted});
 }catch(e){console.error('WhatsApp send service unavailable');return json(res,502,{error:'Message service unavailable'});}
}
