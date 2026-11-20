import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {validSignature as validStripeSignature} from '../api/billing/stripe-webhook.js';
import {getCallDurationSeconds} from '../server/vapi/webhook.js';\nimport {resolveRoute} from '../api/vapi.js';\nimport {pickPhone} from '../server/vapi/assistant-request.js';

const signed=(raw,timestamp,secret)=>createHmac('sha256',secret).update(String(timestamp)+'.').update(raw).digest('hex');
test('Stripe signature verifies exact payload',()=>{
 const raw=Buffer.from('{"id":"evt_test","type":"test"}'),t=Math.floor(Date.now()/1000),secret='whsec_test';
 assert.equal(validStripeSignature(raw,`t=${t},v1=${signed(raw,t,secret)}`,secret),true);
});
test('Stripe signature accepts any valid v1 rotation signature',()=>{
 const raw=Buffer.from('payload'),t=Math.floor(Date.now()/1000),secret='whsec_rotated';
 assert.equal(validStripeSignature(raw,`t=${t},v1=deadbeef,v1=${signed(raw,t,secret)}`,secret),true);
});
test('Stripe signature rejects tampered payload and stale timestamp',()=>{
 const raw=Buffer.from('payload'),t=Math.floor(Date.now()/1000),secret='whsec_test';
 assert.equal(validStripeSignature(Buffer.from('changed'),`t=${t},v1=${signed(raw,t,secret)}`,secret),false);
 assert.equal(validStripeSignature(raw,`t=${t-600},v1=${signed(raw,t-600,secret)}`,secret),false);
});
test('Vapi duration accepts explicit seconds',()=>assert.equal(getCallDurationSeconds({durationSeconds:73},{}),73));
test('Vapi duration accepts call.duration seconds',()=>assert.equal(getCallDurationSeconds({}, {duration:44}),44));
test('Vapi duration falls back to call timestamps',()=>assert.equal(getCallDurationSeconds({}, {startedAt:'2026-01-01T00:00:00Z',endedAt:'2026-01-01T00:02:30Z'}),150));
test('Vapi duration rejects missing or invalid duration',()=>assert.equal(getCallDurationSeconds({}, {startedAt:'bad',endedAt:'bad'}),0));

test('Vapi dispatcher resolves rewritten and direct paths',()=>{
 assert.equal(resolveRoute({query:{route:'webhook'},url:'/api/vapi?route=webhook'}),'webhook');
 assert.equal(resolveRoute({query:{},url:'/api/vapi/assistant-request?token=x'}),'assistant-request');
});
test('Vapi phone mapping accepts provider phone-number objects',()=>{
 assert.deepEqual(pickPhone({phoneNumber:{id:'pn_123',number:'+15555550100'}},{}),{id:'pn_123',number:'+15555550100'});
});
