import {createClient} from '@supabase/supabase-js';
import {createHmac,timingSafeEqual} from 'node:crypto';
const json=(res,status,data)=>res.status(status).json(data);
const safeEqual=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
async function rawBody(req){if(req.rawBody)return Buffer.from(req.rawBody);const chunks=[];for await(const chunk of req)chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));return Buffer.concat(chunks);}
const messageText=m=>String(m?.text?.body||m?.button?.text||m?.interactive?.button_reply?.title||m?.interactive?.list_reply?.title||'').slice(0,4000);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method==='GET'){
  const mode=req.query?.['hub.mode'],token=req.query?.['hub.verify_token'],challenge=req.query?.['hub.challenge'];
  if(mode==='subscribe'&&safeEqual(String(token||''),String(process.env.WHATSAPP_VERIFY_TOKEN||''))&&process.env.WHATSAPP_VERIFY_TOKEN)return res.status(200).send(challenge);
  return json(res,403,{error:'Verification failed'});
 }
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return json(res,405,{error:'Method not allowed'});}
 const appSecret=process.env.WHATSAPP_APP_SECRET;
 if(!appSecret)return json(res,503,{error:'WhatsApp webhook signature verification is not configured'});
 const signature=String(req.headers['x-hub-signature-256']||'');
 let raw;
 try{raw=await rawBody(req)}catch{return json(res,400,{error:'Invalid request body'});}
 const expected='sha256='+createHmac('sha256',appSecret).update(raw).digest('hex');
 if(!safeEqual(signature,expected))return json(res,401,{error:'Invalid webhook signature'});
 const serviceUrl=process.env.VITE_SUPABASE_URL,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!serviceUrl||!serviceKey)return json(res,503,{error:'Webhook database credentials are not configured'});
 let payload;try{payload=JSON.parse(raw.toString('utf8'))}catch{return json(res,400,{error:'Invalid JSON payload'});}
 const db=createClient(serviceUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 let saved=0,unmapped=0;
 try{
  for(const entry of payload.entry||[])for(const change of entry.changes||[]){
   const value=change.value||{},phoneNumberId=String(value.metadata?.phone_number_id||'');
   if(!phoneNumberId)continue;
   const {data:channel,error:channelError}=await db.from('whatsapp_channels').select('id,user_id,display_phone_number').eq('phone_number_id',phoneNumberId).maybeSingle();
   if(channelError)throw channelError;
   if(!channel){unmapped++;continue;}
   for(const m of value.messages||[]){
    const row={user_id:channel.user_id,channel_id:channel.id,wa_message_id:String(m.id||''),direction:'inbound',from_number:String(m.from||'').slice(0,24),to_number:channel.display_phone_number,message_type:String(m.type||'unknown').slice(0,40),message_text:messageText(m),delivery_status:'received'};
    if(!row.wa_message_id)continue;
    const {error}=await db.from('whatsapp_messages').upsert(row,{onConflict:'wa_message_id',ignoreDuplicates:true});
    if(error)throw error;saved++;
   }
   for(const status of value.statuses||[]){
    if(!status.id)continue;
    const {error}=await db.from('whatsapp_messages').update({delivery_status:String(status.status||'updated').slice(0,40),updated_at:new Date().toISOString()}).eq('channel_id',channel.id).eq('wa_message_id',String(status.id));
    if(error)throw error;
   }
  }
  return json(res,200,{ok:true,saved,unmapped});
 }catch(e){console.error('WhatsApp webhook persistence failed');return json(res,500,{error:'Could not process WhatsApp webhook'});}
}
export const config={api:{bodyParser:false}};
