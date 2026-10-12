import{createClient}from'@supabase/supabase-js';import{timingSafeEqual}from'node:crypto';
const reply=(res,status,data)=>{res.setHeader('Cache-Control','no-store');return res.status(status).json(data)};
const same=(a,b)=>{const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&x.length>0&&timingSafeEqual(x,y)};
const clean=(x,max)=>String(x||'').trim().slice(0,max);
export default async function handler(req,res){
 if(req.method!=='POST')return reply(res,405,{error:'Method not allowed'});
 const secret=process.env.WEBSITE_LEAD_SYNC_SECRET,owner=process.env.FOUNDER_CRM_OWNER_ID;
 const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!secret||!owner||!url||!key)return reply(res,503,{error:'Website lead sync not configured'});
 if(!same(req.headers['x-kathya-lead-secret'],secret))return reply(res,401,{error:'Unauthorized'});
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(owner))return reply(res,503,{error:'CRM owner ID misconfigured'});
 const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
 const name=clean(b.name,120),email=clean(b.email,180).toLowerCase(),company=clean(b.company,160),usecase=clean(b.usecase,120),message=clean(b.message,1600),submissionId=clean(b.submissionId,100);
 if(!name||!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!submissionId)return reply(res,400,{error:'Invalid lead'});
 const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const{data:userData,error:userError}=await supabase.auth.admin.getUserById(owner);
  if(userError||!userData?.user?.email_confirmed_at)return reply(res,503,{error:'CRM founder owner is not verified'});
  const{data:allow,error:allowError}=await supabase.from('founder_allowlist').select('email').ilike('email',userData.user.email).limit(1);
  if(allowError||!allow?.length)return reply(res,503,{error:'CRM founder owner is not approved'});
  const payload={owner_id:owner,external_submission_id:submissionId,company:company||'Individual inquiry',contact_name:name,email,source:'KATHYA website form',stage:'new',fit:'unknown',intent:'unknown',engagement:'none',notes:['Use case: '+(usecase||'Not specified'),message&&'Request: '+message].filter(Boolean).join('\n')};
  const{error}=await supabase.from('founder_sales_leads').insert(payload);
  if(error?.code==='23505')return reply(res,200,{ok:true,duplicate:true});
  if(error){console.error('Website lead sync database error',{code:error.code});return reply(res,500,{error:'CRM save failed'})}
  return reply(res,200,{ok:true});
 }catch(e){console.error('Website lead sync unexpected error',e?.message);return reply(res,500,{error:'CRM sync unavailable'})}
}
