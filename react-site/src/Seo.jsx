import{useEffect}from'react';
const base='https://kathyaai.com';
const meta={
home:['KATHYA AI — Conversations that complete the work','Conversational AI for customer-facing business actions across voice and digital workflows.'],
product:['KATHYA AI Product — Conversational AI Platform','Explore KATHYA AI for natural conversations, reasoning, connected actions and human handoff.'],
solutions:['KATHYA AI Solutions','AI receptionist, sales, support, appointment and custom conversational workflows.'],
industries:['KATHYA AI Industries','Adapt conversational AI workflows to professional services, healthcare administration, real estate, hospitality, automotive and education.'],
integrations:['KATHYA AI Integrations','Connect KATHYA conversations to calendars, CRM, email, messaging, APIs and webhooks.'],
pricing:['KATHYA AI Pricing','Explore KATHYA deployment plans for pilots, growing businesses and enterprise workflows.'],
customers:['KATHYA AI Customer Stories','Verified KATHYA AI customer outcomes and production stories as they become available.'],
resources:['KATHYA AI Resources','Guides for conversational design, integrations, trust and deployment.'],
demo:['Talk to KATHYA — Interactive Demo','Experience an illustrative KATHYA conversation-to-action workflow.'],
contact:['Contact KATHYA AI','Talk with KATHYA AI about conversational workflows for your business.'],
trust:['KATHYA AI Trust Center','Learn about KATHYA AI design principles for data handling, consent, access controls and human escalation.'],
'sign-in':['Sign in — KATHYA AI','Access the KATHYA AI workspace.']
};
function setMeta(selector,attrs){let el=document.querySelector(selector);if(!el){el=document.createElement('meta');Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));document.head.appendChild(el)}return el}
export default function Seo({route}){useEffect(()=>{const m=meta[route]||meta.home;const path=route==='home'?'/':'/'+route+'/';const url=base+path;document.title=m[0];let d=document.querySelector('meta[name="description"]');if(!d){d=document.createElement('meta');d.name='description';document.head.appendChild(d)}d.content=m[1];let c=document.querySelector('link[rel="canonical"]');if(!c){c=document.createElement('link');c.rel='canonical';document.head.appendChild(c)}c.href=url;setMeta('meta[property="og:title"]',{property:'og:title'}).content=m[0];setMeta('meta[property="og:description"]',{property:'og:description'}).content=m[1];setMeta('meta[property="og:url"]',{property:'og:url'}).content=url;setMeta('meta[name="twitter:title"]',{name:'twitter:title'}).content=m[0];setMeta('meta[name="twitter:description"]',{name:'twitter:description'}).content=m[1];},[route]);return null}