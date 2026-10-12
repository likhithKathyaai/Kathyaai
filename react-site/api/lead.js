import nodemailer from'nodemailer';import{randomUUID}from'node:crypto';
const clean=(v,max=2000)=>String(v||'').trim().slice(0,max);
export default async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'})}
 res.setHeader('Cache-Control','no-store');
 if(!String(req.headers['content-type']||'').includes('application/json'))return res.status(415).json({error:'Content-Type must be application/json.'});
 const{name,email,company,usecase,message,website}=req.body||{};
 if(website)return res.status(200).json({ok:true});
 const n=clean(name,120),e=clean(email,180),c=clean(company,160),u=clean(usecase,120),m=clean(message);
 if(!n||!e||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))return res.status(400).json({error:'Please enter a valid name and work email.'});
 const syncUrl=process.env.FOUNDER_CRM_INGEST_URL,secret=process.env.WEBSITE_LEAD_SYNC_SECRET;
 const smtp=Boolean(process.env.SMTP_USER&&process.env.SMTP_PASSWORD);
 if(!smtp&&!(syncUrl&&secret))return res.status(503).json({error:'Contact service is temporarily unavailable.'});
 let crmSynced=false,emailed=false;
 if(syncUrl&&secret){
  try{
   const target=new URL(syncUrl);
   if(target.protocol!=='https:'||!target.pathname.endsWith('/api/integrations/website-lead'))throw Error('Invalid CRM endpoint');
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
   try{
    const r=await fetch(target.toString(),{method:'POST',headers:{'Content-Type':'application/json','x-kathya-lead-secret':secret,...(process.env.FOUNDER_CRM_VERCEL_BYPASS_SECRET?{'x-vercel-protection-bypass':process.env.FOUNDER_CRM_VERCEL_BYPASS_SECRET}:{})},body:JSON.stringify({name:n,email:e,company:c,usecase:u,message:m,submissionId:randomUUID()}),signal:controller.signal});
    crmSynced=r.ok;
    if(!r.ok){const contentType=r.headers.get('content-type')||'';let reason='non-json upstream response';if(contentType.includes('application/json')){const body=await r.json().catch(()=>({}));const allowed=['Website lead sync not configured','CRM founder owner is not verified','CRM founder owner is not approved','CRM owner ID misconfigured','CRM save failed','Unauthorized','CRM sync unavailable','Method not allowed'];reason=allowed.includes(body?.error)?body.error:'unknown upstream error'}console.error('Founder CRM sync failed',{status:r.status,reason,upstreamHost:target.hostname,redirected:r.redirected});}
   }finally{clearTimeout(timer)}
  }catch(err){console.error('Founder CRM sync unavailable',err?.message)}
 }
 if(smtp){
  try{
   const transport=nodemailer.createTransport({host:process.env.SMTP_HOST||'smtp.hostinger.com',port:Number(process.env.SMTP_PORT||465),secure:Number(process.env.SMTP_PORT||465)===465,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}});
   await transport.sendMail({from:`KATHYA AI <${process.env.SMTP_USER}>`,to:process.env.LEAD_NOTIFICATION_EMAIL||'hr@pamedlogtalent.com',replyTo:e,subject:`New KATHYA AI Lead — ${c||n} — ${u||'Website'}`,text:`New KATHYA AI website lead\n\nName: ${n}\nEmail: ${e}\nCompany: ${c||'—'}\nUse case: ${u||'—'}\n\nWhat should KATHYA help complete?\n${m||'—'}\n\nReceived: ${new Date().toISOString()}`});
   emailed=true;
  }catch(err){console.error('Lead notification email failed',err?.message)}
 }
 if(!crmSynced&&!emailed)return res.status(503).json({error:'We could not save your request right now. Please try again.'});
 return res.status(200).json({ok:true,crmSynced,emailed});
}
