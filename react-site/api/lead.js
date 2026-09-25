import nodemailer from'nodemailer';
const clean=(v,max=2000)=>String(v||'').trim().slice(0,max);
export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  try{
    const {name,email,company,usecase,message,website}=req.body||{};
    if(website)return res.status(200).json({ok:true});
    const n=clean(name,120),e=clean(email,180),c=clean(company,180),u=clean(usecase,120),m=clean(message);
    if(!n||!e||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))return res.status(400).json({error:'Please enter a valid name and work email.'});
    const transport=nodemailer.createTransport({host:process.env.SMTP_HOST||'smtp.hostinger.com',port:Number(process.env.SMTP_PORT||465),secure:Number(process.env.SMTP_PORT||465)===465,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}});
    await transport.sendMail({from:`KATHYA AI <${process.env.SMTP_USER}>`,to:'likhit@pamedlogtalent.com',replyTo:e,subject:`New KATHYA AI Lead — ${c||n} — ${u||'Website'}`,text:`New KATHYA AI website lead\n\nName: ${n}\nEmail: ${e}\nCompany: ${c||'—'}\nUse case: ${u||'—'}\n\nWhat should KATHYA help complete?\n${m||'—'}\n\nReceived: ${new Date().toISOString()}`});
    return res.status(200).json({ok:true});
  }catch(err){console.error('Lead email failed',err);return res.status(500).json({error:'We could not send your request right now. Please try again.'})}
}