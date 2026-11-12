export default function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 res.setHeader('Cache-Control','no-store');
 const integrations={
  supabaseAuth:Boolean(process.env.VITE_SUPABASE_URL&&process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  vapi:Boolean(process.env.VAPI_PRIVATE_API_KEY),
  vapiWebhook:Boolean(process.env.KATHYA_VAPI_WEBHOOK_SECRET&&process.env.KATHYA_VERCEL_BYPASS_SECRET&&(process.env.KATHYA_VAPI_WEBHOOK_URL||process.env.VERCEL_URL)&&process.env.SUPABASE_SERVICE_ROLE_KEY),
  serviceDatabase:Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  vapiPhoneNumber:Boolean(process.env.VAPI_PHONE_NUMBER_ID),
  emailNotifications:Boolean(process.env.SMTP_USER&&process.env.SMTP_PASSWORD),
  founderCrmSync:Boolean(process.env.FOUNDER_CRM_INGEST_URL&&process.env.WEBSITE_LEAD_SYNC_SECRET),
  founderCrmPreviewBypass:Boolean(process.env.FOUNDER_CRM_VERCEL_BYPASS_SECRET),
  whatsappSend:Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
  whatsappWebhook:Boolean(process.env.WHATSAPP_APP_SECRET&&process.env.WHATSAPP_VERIFY_TOKEN&&process.env.WHATSAPP_WEBHOOK_BYPASS_SECRET&&process.env.SUPABASE_SERVICE_ROLE_KEY),
  stripeBilling:Boolean(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_WEBHOOK_SECRET)
 };
 res.status(200).json({ok:true,service:'kathya-web',time:new Date().toISOString(),integrations});
}
