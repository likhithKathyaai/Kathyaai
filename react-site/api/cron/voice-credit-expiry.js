import {createClient} from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const json=(res,status,data)=>res.status(status).json(data);
export default async function handler(req,res){
  if(req.method!=='GET'&&req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  const secret=process.env.CRON_SECRET;
  const supplied=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  if(!secret||supplied!==secret)return json(res,401,{error:'Cron authentication failed'});
  const url=process.env.VITE_SUPABASE_URL,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!serviceKey)return json(res,503,{error:'Server database credentials are not configured'});
  const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:expiredCount,error:expireError}=await db.rpc('expire_voice_minutes');
  if(expireError)return json(res,503,{error:'Could not process expired monthly voice minutes'});
  const now=new Date(),windowEnd=new Date(now.getTime()+8*86400000);
  const {data:lots,error:lotsError}=await db.from('voice_credit_lots')
    .select('id,organization_id,remaining_minutes,expires_at')
    .gt('remaining_minutes',0).gt('expires_at',now.toISOString()).lte('expires_at',windowEnd.toISOString());
  if(lotsError)return json(res,503,{error:'Could not read upcoming credit expiries'});
  const smtpReady=!!(process.env.SMTP_HOST&&process.env.SMTP_PORT&&process.env.SMTP_USER&&process.env.SMTP_PASS&&process.env.SMTP_FROM);
  const transporter=smtpReady?nodemailer.createTransport({
    host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT),secure:Number(process.env.SMTP_PORT)===465,
    auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}
  }):null;
  const groups=new Map();
  for(const lot of lots||[]){
    const days=Math.ceil((new Date(lot.expires_at).getTime()-now.getTime())/86400000);
    if(![1,3,7].includes(days))continue;
    const key=lot.organization_id+':'+days;
    const current=groups.get(key)||{organization_id:lot.organization_id,days,minutes:0,expiry:lot.expires_at};
    current.minutes+=Number(lot.remaining_minutes||0);groups.set(key,current);
  }
  let queued=0,sent=0,failed=0;
  for(const item of groups.values()){
    const {data:org}=await db.from('organizations').select('id,name,owner_user_id').eq('id',item.organization_id).maybeSingle();
    if(!org)continue;
    const {data:userResult}=await db.auth.admin.getUserById(org.owner_user_id);
    const email=userResult?.user?.email;
    if(!email)continue;
    const notificationKey='credit-expiry:'+item.organization_id+':'+item.days+':'+new Date(item.expiry).toISOString().slice(0,10);
    const subject='KATHYA AI: '+item.minutes.toFixed(2)+' voice minutes expire in '+item.days+' day(s)';
    const body='Hello,\n\nYour KATHYA AI workspace "'+org.name+'" has '+item.minutes.toFixed(2)+' unused voice minutes scheduled to expire in '+item.days+' day(s), on '+new Date(item.expiry).toUTCString()+'.\n\nPlease sign in to review your balance or contact your KATHYA account administrator.\n\nKATHYA AI Support';
    const {data:notice,error:insertError}=await db.from('customer_notifications').upsert({
      organization_id:item.organization_id,notification_key:notificationKey,notification_type:'voice_credit_expiry',
      recipient_email:email,subject,body,scheduled_for:now.toISOString(),status:'queued'
    },{onConflict:'notification_key',ignoreDuplicates:true}).select('id').maybeSingle();
    if(insertError){failed++;continue}
    if(!notice?.id)continue;
    queued++;
    if(transporter){
      try{
        await transporter.sendMail({from:process.env.SMTP_FROM,to:email,subject,text:body});
        await db.from('customer_notifications').update({status:'sent',sent_at:new Date().toISOString(),last_error:null}).eq('id',notice.id);
        sent++;
      }catch(e){
        await db.from('customer_notifications').update({status:'failed',last_error:'SMTP delivery failed'}).eq('id',notice.id);
        failed++;
      }
    }
  }
  return json(res,200,{expired_lots_processed:expiredCount||0,expiry_groups:groups.size,notifications_queued:queued,notifications_sent:sent,notifications_failed:failed,email_configured:smtpReady});
}
