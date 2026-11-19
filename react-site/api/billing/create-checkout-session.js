import {createClient} from '@supabase/supabase-js';
const json=(res,status,data)=>res.status(status).json(data);
const plans={launch:'STRIPE_PRICE_LAUNCH',growth:'STRIPE_PRICE_GROWTH',scale:'STRIPE_PRICE_SCALE',enterprise:'STRIPE_PRICE_ENTERPRISE'};
const minutePackages={500:{env:'STRIPE_PRICE_MINUTES_500',minutes:500},2000:{env:'STRIPE_PRICE_MINUTES_2000',minutes:2000},5000:{env:'STRIPE_PRICE_MINUTES_5000',minutes:5000}};

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 const stripeKey=process.env.STRIPE_SECRET_KEY,host=String(req.headers.host||'');
 const safeHost=/^(www\.)?kathyaai\.com$|^[a-z0-9-]+\.vercel\.app$/i.test(host);
 const appUrl=process.env.KATHYA_APP_URL||(safeHost?'https://'+host:null);
 if(!stripeKey||!appUrl||!safeHost)return json(res,503,{error:'Billing is not configured for this preview or production host'});
 const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token)return json(res,401,{error:'Sign in required'});
 const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return json(res,503,{error:'Workspace authentication is not configured'});
 const db=createClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false}});
 const {data:{user},error:authError}=await db.auth.getUser(token);
 if(authError||!user)return json(res,401,{error:'Invalid session'});
 const {organizationId,purchaseType='subscription',plan='launch',minutesPackage}=req.body||{};
 if(typeof organizationId!=='string')return json(res,400,{error:'Workspace is required'});
 const {data:membership}=await db.from('organization_members').select('role').eq('organization_id',organizationId).eq('user_id',user.id).maybeSingle();
 if(!membership||!['owner','admin'].includes(membership.role))return json(res,403,{error:'Workspace owner or admin permission required'});
 const {data:org}=await db.from('organizations').select('id,name,status').eq('id',organizationId).maybeSingle();
 if(!org||org.status!=='active')return json(res,404,{error:'Active customer workspace not found'});
 let priceId,mode,metadata={organization_id:organizationId};
 if(purchaseType==='minutes'){
  const pack=minutePackages[Number(minutesPackage)];
  if(!pack)return json(res,400,{error:'Choose an available minutes package'});
  priceId=process.env[pack.env];mode='payment';metadata.purchase_type='voice_minutes';metadata.minutes=String(pack.minutes);
 }else{
  if(!plans[plan])return json(res,400,{error:'Invalid subscription plan'});
  priceId=process.env[plans[plan]];mode='subscription';metadata.purchase_type='subscription';metadata.plan_code=plan;
 }
 if(!priceId)return json(res,503,{error:'The selected Stripe price is not configured yet'});
 const form=new URLSearchParams();
 form.set('mode',mode);form.set('line_items[0][price]',priceId);form.set('line_items[0][quantity]','1');
 form.set('success_url',appUrl.replace(/\/$/,'')+'/workspace?billing=success');
 form.set('cancel_url',appUrl.replace(/\/$/,'')+'/workspace?billing=cancelled');
 form.set('client_reference_id',organizationId);form.set('customer_email',user.email||'');
 for(const [k,v] of Object.entries(metadata))form.set('metadata['+k+']',v);
 if(mode==='subscription')for(const [k,v] of Object.entries(metadata))form.set('subscription_data[metadata]['+k+']',v);
 if(mode==='payment')for(const [k,v] of Object.entries(metadata))form.set('payment_intent_data[metadata]['+k+']',v);
 try{
  const response=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:'Bearer '+stripeKey,'Content-Type':'application/x-www-form-urlencoded'},body:form});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.url)return json(res,502,{error:result.error?.message||'Could not create checkout session'});
  return json(res,200,{url:result.url,sessionId:result.id});
 }catch(e){return json(res,502,{error:'Payment provider is unavailable'})}
}
