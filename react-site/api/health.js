export default function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 res.setHeader('Cache-Control','no-store');
 const integrations={
  supabaseAuth:Boolean(process.env.VITE_SUPABASE_URL&&process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  vapi:Boolean(process.env.VAPI_PRIVATE_API_KEY),
  webhook:Boolean(process.env.KATHYA_VAPI_WEBHOOK_SECRET&&(process.env.KATHYA_VAPI_WEBHOOK_URL||process.env.VERCEL_URL)&&process.env.SUPABASE_SERVICE_ROLE_KEY),
  serviceDatabase:Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  phoneNumber:Boolean(process.env.VAPI_PHONE_NUMBER_ID)
 };
 res.status(200).json({ok:true,service:'kathya-web',time:new Date().toISOString(),integrations});
}
