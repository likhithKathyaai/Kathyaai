import assistantHandler from '../server/vapi/assistant.js';
import connectPhoneHandler from '../server/vapi/connect-phone-number.js';
import webhookHandler from '../server/vapi/webhook.js';
import assistantRequestHandler from '../server/vapi/assistant-request.js';
const routes={'assistant':assistantHandler,'connect-phone-number':connectPhoneHandler,'webhook':webhookHandler,'assistant-request':assistantRequestHandler};
export function resolveRoute(req){const path=String(req.url||'').split('?')[0],prefix='/api/vapi/';return String(req.query?.route||(path.startsWith(prefix)?path.slice(prefix.length):'')).split('/')[0]}
export default async function handler(req,res){
 const route=resolveRoute(req),target=routes[route];
 if(!target)return res.status(404).json({error:'Unknown Vapi endpoint'});
 return target(req,res);
}
