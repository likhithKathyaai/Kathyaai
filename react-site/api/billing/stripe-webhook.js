import {createClient} from '@supabase/supabase-js';
import {createHmac,timingSafeEqual} from 'node:crypto';
export const config={api:{bodyParser:false}};
const json=(res,status,data)=>res.status(status).json(data);
async function rawBody(req){const chunks=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));return Buffer.concat(chunks)}
export function validSignature(raw,header,secret){
 if(!header||!secret)return false;
 const fields=String(header).split(',').map(x=>x.trim());
 const timestamp=fields.find(x=>x.startsWith('t='))?.slice(2);
 const signatures=fields.filter(x=>x.startsWith('v1=')).map(x=>x.slice(3));
 if(!timestamp||!signatures.length||!/^\d+$/.test(timestamp)||Math.abs(Date.now()/1000-Number(timestamp))>300)return false;
 const expected=createHmac('sha256',secret).update(timestamp+'.').update(raw).digest();
 return signatures.some(signature=>{const candidate=Buffer.from(signature,'hex');return candidate.length===expected.length&&timingSafeEqual(candidate,expected)});
}
export default async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 const secret=process.env.STRIPE_WEBHOOK_SECRET,raw=await rawBody(req);
 if(!validSignature(raw,req.headers['stripe-signature'],secret))return json(res,400,{error:'Invalid Stripe signature'});
 let event;
 try{event=JSON.parse(raw.toString('utf8'))}catch{return json(res,400,{error:'Invalid event JSON'})}
 if(!event?.id||!event?.type)return json(res,400,{error:'Invalid event envelope'});
 const url=process.env.VITE_SUPABASE_URL,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!serviceKey)return json(res,503,{error:'Server database credentials are not configured'});
 const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const now=new Date().toISOString(),staleBefore=new Date(Date.now()-5*60*1000).toISOString();
 const {error:claimError}=await db.from('stripe_webhook_events').insert({event_id:event.id,event_type:event.type,status:'processing',attempts:1,updated_at:now});
 if(claimError){
  if(claimError.code!=='23505')return json(res,503,{error:'Could not claim payment event'});
  const {data:existing,error:readError}=await db.from('stripe_webhook_events').select('status,updated_at,attempts').eq('event_id',event.id).maybeSingle();
  if(readError||!existing)return json(res,503,{error:'Payment event state could not be verified'});
  if(existing.status==='processed')return json(res,200,{received:true,duplicate:true});
  const stale=existing.status==='processing'&&existing.updated_at&&existing.updated_at<staleBefore;
  if(existing.status!=='failed'&&!stale)return json(res,503,{error:'Payment event is currently processing; retry later'});
  let retryQuery=db.from('stripe_webhook_events').update({status:'processing',attempts:Number(existing.attempts||0)+1,updated_at:now,last_error:null,processed_at:null}).eq('event_id',event.id).eq('status',existing.status);
  if(stale)retryQuery=retryQuery.lt('updated_at',staleBefore);
  const {data:claimed,error:retryClaimError}=await retryQuery.select('event_id');
  if(retryClaimError||!claimed?.length)return json(res,503,{error:'Payment event retry could not be claimed'});
 }
 try{
  const obj=event.data?.object||{};
  if(event.type==='checkout.session.completed'){
   const orgId=obj.metadata?.organization_id||obj.client_reference_id;
   if(!orgId)throw new Error('Checkout session is missing its workspace reference');
   if(obj.metadata?.purchase_type==='voice_minutes'){
    const minutes=Number(obj.metadata.minutes);
    const {error}=await db.rpc('grant_purchased_voice_minutes',{p_org_id:orgId,p_minutes:minutes,p_reference:obj.id,p_note:'Stripe checkout '+obj.id});
    if(error)throw error;
   }else if(obj.mode==='subscription'){
    const {error}=await db.from('customer_subscriptions').upsert({organization_id:orgId,plan_code:obj.metadata?.plan_code||'launch',status:obj.payment_status==='paid'?'active':'incomplete',billing_provider:'stripe',provider_customer_id:obj.customer||null,provider_subscription_id:obj.subscription||null,updated_at:new Date().toISOString()},{onConflict:'organization_id'});
    if(error)throw error;
   }
  }else if(event.type==='customer.subscription.updated'||event.type==='customer.subscription.deleted'){
   const orgId=obj.metadata?.organization_id;
   if(orgId){
    const {error}=await db.from('customer_subscriptions').upsert({organization_id:orgId,plan_code:obj.metadata?.plan_code||'launch',status:event.type==='customer.subscription.deleted'?'canceled':(['trialing','active','past_due','canceled','incomplete'].includes(obj.status)?obj.status:'incomplete'),billing_provider:'stripe',provider_customer_id:obj.customer||null,provider_subscription_id:obj.id,current_period_start:obj.current_period_start?new Date(obj.current_period_start*1000).toISOString():null,current_period_end:obj.current_period_end?new Date(obj.current_period_end*1000).toISOString():null,cancel_at_period_end:!!obj.cancel_at_period_end,updated_at:new Date().toISOString()},{onConflict:'organization_id'});
    if(error)throw error;
   }
  }else if(event.type==='invoice.payment_failed'){
   const subscriptionId=obj.subscription||obj.parent?.subscription_details?.subscription;
   if(subscriptionId){
    const {error}=await db.from('customer_subscriptions').update({status:'past_due',updated_at:new Date().toISOString()}).eq('provider_subscription_id',subscriptionId);
    if(error)throw error;
   }
  }
  const {error:completeError}=await db.from('stripe_webhook_events').update({status:'processed',processed_at:new Date().toISOString(),updated_at:new Date().toISOString(),last_error:null}).eq('event_id',event.id);
  if(completeError)return json(res,503,{error:'Payment event applied but completion state could not be recorded; retry later'});
  return json(res,200,{received:true,eventType:event.type});
 }catch(e){
  await db.from('stripe_webhook_events').update({status:'failed',updated_at:new Date().toISOString(),last_error:String(e?.message||'Processing failed').slice(0,300)}).eq('event_id',event.id);
  return json(res,503,{error:'Payment event could not be applied; provider may retry'});
 }
}
