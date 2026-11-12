import {createClient} from '@supabase/supabase-js';
const json=(res,status,data)=>res.status(status).json(data);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{error:'Method not allowed'});}
 const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return json(res,503,{error:'Supabase authentication is not configured'});
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token)return json(res,401,{error:'Sign in required'});
 const db=createClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false}});
 const {data:{user},error:authError}=await db.auth.getUser(token);
 if(authError||!user)return json(res,401,{error:'Invalid session'});
 const phoneNumberId=String(req.body?.phoneNumberId||'').trim();
 const displayPhoneNumber=String(req.body?.displayPhoneNumber||'').trim().slice(0,40);
 if(!/^\d{5,30}$/.test(phoneNumberId))return json(res,400,{error:'Enter the WhatsApp Cloud API phone number ID from Meta.'});
 const {data,error}=await db.from('whatsapp_channels').upsert({user_id:user.id,phone_number_id:phoneNumberId,display_phone_number:displayPhoneNumber||null,updated_at:new Date().toISOString()},{onConflict:'phone_number_id'}).select('id,phone_number_id,display_phone_number').single();
 if(error)return json(res,409,{error:'Could not connect this WhatsApp number. Check that the channel is not linked to another workspace and that supabase/whatsapp.sql has been applied.'});
 return json(res,200,{ok:true,channel:data});
}
