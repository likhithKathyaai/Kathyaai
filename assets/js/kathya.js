document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.primary-nav');
  if (toggle && nav) toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id.length < 2) return;
    const el = document.querySelector(id); if (el) { e.preventDefault(); el.scrollIntoView({behavior:'smooth'}); }
  }));

  const roles = document.querySelectorAll('.role');
  const name = document.getElementById('agent-name');
  const desc = document.getElementById('agent-desc');
  const copy = {
    'Receptionist':'Answers customer calls, understands requests, routes conversations and books appointments.',
    'Sales Agent':'Qualifies leads, answers common questions and books sales meetings.',
    'Support Agent':'Handles repeat questions, captures context and escalates complex issues.',
    'Appointment Agent':'Handles booking requests, confirmations, rescheduling and reminders.'
  };
  roles.forEach(btn => btn.addEventListener('click', () => {
    roles.forEach(b => b.classList.remove('active')); btn.classList.add('active');
    if(name) name.textContent = 'KATHYA ' + btn.dataset.role.replace(' Agent','');
    if(desc) desc.textContent = copy[btn.dataset.role];
  }));
  const generate = document.getElementById('generate-agent');
  if(generate) generate.addEventListener('click', () => {
    generate.textContent='Preview Ready ✓'; setTimeout(()=>generate.textContent='Generate Preview',1600);
    document.querySelector('.agent-preview')?.classList.add('pulse'); setTimeout(()=>document.querySelector('.agent-preview')?.classList.remove('pulse'),700);
  });

  const calls = document.getElementById('calls'), mins = document.getElementById('mins'), auto = document.getElementById('auto');
  const format = n => Number(n).toLocaleString();
  function calc(){ if(!calls||!mins||!auto)return; const a=Math.round(calls.value*(auto.value/100));
    document.getElementById('calls-value').textContent=format(calls.value); document.getElementById('mins-value').textContent=mins.value+' min'; document.getElementById('auto-value').textContent=auto.value+'%'; document.getElementById('automated').textContent=format(a); document.getElementById('minutes').textContent=format(a*mins.value); }
  [calls,mins,auto].forEach(x=>x&&x.addEventListener('input',calc)); calc();

  const io = new IntersectionObserver(entries => entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); }), {threshold:.12});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
});

/* V3 appointment availability */
document.addEventListener('DOMContentLoaded',function(){
  const date=document.getElementById('k-book-date'), time=document.getElementById('k-book-time');
  if(!date||!time||!window.KathyaBooking) return;
  date.addEventListener('change',async function(){
    time.innerHTML='<option>Checking availability…</option>'; time.disabled=true;
    const body=new URLSearchParams({action:'kathya_slots',nonce:window.KathyaBooking.nonce,date:date.value});
    try{const r=await fetch(window.KathyaBooking.ajax,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body}); const j=await r.json();
      time.innerHTML='<option value="">Choose a time</option>';
      (j.success?j.data.slots:[]).forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;time.appendChild(o)});
      if(!j.success||!j.data.slots.length) time.innerHTML='<option value="">No times available</option>';
    }catch(e){time.innerHTML='<option value="">Could not load times</option>';} time.disabled=false;
  });
});
/* V4 interactive launch demo - UI preview, no microphone capture until a production voice provider is connected. */
document.addEventListener('DOMContentLoaded',()=>{
  const btn=document.getElementById('v4-talk'), title=document.getElementById('v4-voice-title'), transcript=document.getElementById('v4-transcript');
  if(!btn||!title||!transcript) return;
  btn.addEventListener('click',()=>{
    btn.disabled=true; btn.textContent='Listening…'; title.textContent='Understanding your request…'; transcript.textContent='You: “I want to book a product demo tomorrow afternoon.”';
    setTimeout(()=>{title.textContent='Intent detected: Book appointment'; transcript.innerHTML='<strong>You:</strong> “I want to book a product demo tomorrow afternoon.”<br><strong>KATHYA:</strong> “I can help with that. Let’s choose an available time.”'; btn.textContent='Demo Complete ✓'; setTimeout(()=>{btn.disabled=false;btn.textContent='🎙 Start Demo';},2200);},1100);
  });
});
/* V5 product interactions */
document.addEventListener('DOMContentLoaded',()=>{
 const talk=document.getElementById('v5-talk'),status=document.getElementById('v5-status'),chat=document.getElementById('v5-chat');
 if(talk&&status&&chat){talk.addEventListener('click',()=>{talk.disabled=true;talk.innerHTML='<span>●</span> Listening…';status.textContent='Listening…';chat.innerHTML='<div class="user"><small>YOU</small><p>Can you book a demo tomorrow afternoon?</p></div>';setTimeout(()=>{status.textContent='Understanding intent…';},650);setTimeout(()=>{status.textContent='Action ready';chat.innerHTML+='<div class="ai"><small>KATHYA</small><p>I found two available times: 2:30 PM and 4:00 PM. Which works better?</p></div>';talk.innerHTML='<span>✓</span> Action ready';setTimeout(()=>{talk.disabled=false;talk.innerHTML='<span>●</span> Experience again';},1800)},1400)})}
 const build=document.getElementById('v5-build'),result=document.getElementById('v5-result'),industry=document.getElementById('v5-industry');
 if(build&&result){build.addEventListener('click',()=>{build.textContent='Building…';result.style.opacity='.35';setTimeout(()=>{result.querySelector('strong').textContent='KATHYA '+(industry?.value||'Assistant');result.style.opacity='1';build.textContent='Agent ready ✓'},850)})}
 const tabs=document.querySelectorAll('.v5-usecase-tabs button'),label=document.getElementById('use-label'),title=document.getElementById('use-title'),copy=document.getElementById('use-copy');
 const data={reception:['AI RECEPTION','Never leave a customer waiting.','Answer, understand, route and complete routine customer requests around the clock.'],sales:['AI SALES','Turn interest into the next step.','Qualify inbound interest, answer product questions and move qualified conversations toward a meeting.'],support:['AI SUPPORT','Resolve the repeatable. Escalate the important.','Handle common requests, capture context and transfer complex cases with a useful summary.'],booking:['AI APPOINTMENTS','Make scheduling feel effortless.','Find availability, confirm bookings and support reschedule or cancellation workflows.'],custom:['CUSTOM AGENTS','Design around your workflow.','Combine your knowledge, business rules and connected actions into a purpose-built conversational experience.']};
 tabs.forEach(b=>b.addEventListener('click',()=>{tabs.forEach(x=>x.classList.remove('active'));b.classList.add('active');const d=data[b.dataset.use];if(d){label.textContent=d[0];title.textContent=d[1];copy.textContent=d[2]}}));
});

/* V5.2 live KATHYA generative website assistant */
document.addEventListener('DOMContentLoaded',()=>{
 const root=document.getElementById('k-assist'),launch=document.getElementById('k-assist-launch'),panel=document.getElementById('k-assist-panel'),close=document.getElementById('k-assist-close'),form=document.getElementById('k-assist-form'),input=document.getElementById('k-assist-input'),body=document.getElementById('k-assist-body');
 if(!root||!launch||!panel||!body)return;
 const history=[];
 const open=()=>{root.classList.add('open');launch.setAttribute('aria-expanded','true');panel.setAttribute('aria-hidden','false');setTimeout(()=>input?.focus(),180)};
 const shut=()=>{root.classList.remove('open');launch.setAttribute('aria-expanded','false');panel.setAttribute('aria-hidden','true');launch.focus()};
 launch.addEventListener('click',open);close?.addEventListener('click',shut);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.classList.contains('open'))shut()});
 const add=(text,who='ai',cls='')=>{const d=document.createElement('div');d.className='k-assist-msg '+who+(cls?' '+cls:'');if(who==='ai'){const s=document.createElement('span');s.textContent='K';d.appendChild(s)}const p=document.createElement('p');p.textContent=text;d.appendChild(p);body.appendChild(d);body.scrollTop=body.scrollHeight;return d};
 const link=(path,label)=>{const a=document.createElement('a');a.href=(window.KathyaAssist?.home||'/')+path.replace(/^\//,'');a.className='k-btn k-btn-small k-btn-primary';a.style.margin='0 0 14px 34px';a.textContent=label;body.appendChild(a);body.scrollTop=body.scrollHeight};
 const ask=async(q)=>{
   add(q,'user'); history.push({role:'user',content:q});
   const wait=add('Thinking…','ai','thinking');
   try{
     if(!window.KathyaLiveAI?.configured) throw new Error('not-configured');
     const r=await fetch(KathyaLiveAI.rest,{method:'POST',headers:{'Content-Type':'application/json','X-WP-Nonce':KathyaLiveAI.nonce},body:JSON.stringify({message:q,history:history.slice(-8)})});
     const data=await r.json(); if(!r.ok) throw new Error(data?.message||'unavailable');
     wait.remove(); add(data.reply,'ai'); history.push({role:'assistant',content:data.reply});
   }catch(err){wait.remove();add(err.message==='not-configured'?'Live AI needs its server-side API key configured. You can still book a demo or contact our team.':'KATHYA is temporarily unavailable. Please try again or contact our team.','ai');}
 };
 const prompts={demo:'I want to book a KATHYA demo.',solutions:'What solutions does KATHYA AI offer?',pricing:'How does KATHYA AI pricing work?',contact:'How can I contact the KATHYA team?'};
 document.querySelectorAll('.k-assist-quick button').forEach(b=>b.addEventListener('click',async()=>{const k=b.dataset.q;await ask(prompts[k]||b.textContent);if(k==='demo')link('/book-appointment/','Choose a time →');if(k==='contact')link('/contact/','Contact team →');if(k==='pricing')link('/pricing/','View pricing →');if(k==='solutions')link('/solutions/','Explore solutions →')}));
 form?.addEventListener('submit',e=>{e.preventDefault();const q=input.value.trim();if(!q)return;input.value='';ask(q)});
});

/* V6.2 creative interaction layer */
document.addEventListener('DOMContentLoaded',()=>{
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const header=document.querySelector('.site-header');
 const onScroll=()=>header?.classList.toggle('k-scrolled',window.scrollY>18);
 onScroll();window.addEventListener('scroll',onScroll,{passive:true});
 document.querySelectorAll('.v5-bento,.pricing-grid,.card-grid,.v5-flow,.auth-points').forEach(group=>{
   [...group.children].forEach((el,i)=>{el.classList.add('motion-child');el.style.setProperty('--motion-i',i);});
   if(!group.classList.contains('reveal')) group.classList.add('reveal');
 });
 if(reduced)return;
 document.querySelectorAll('.v5-bento article,.price-card,.k-card,.v5-builder,.auth-card').forEach(card=>{
   card.addEventListener('pointermove',e=>{if(window.innerWidth<900)return;const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform='perspective(900px) rotateX('+(-y*2.4)+'deg) rotateY('+(x*3.2)+'deg) translateY(-5px)';});
   card.addEventListener('pointerleave',()=>card.style.transform='');
 });
 const hero=document.querySelector('.v5-hero');
 const mark=hero?.querySelector('.v5-product-stage');
 if(hero&&mark){hero.addEventListener('pointermove',e=>{if(window.innerWidth<900)return;const x=(e.clientX/window.innerWidth-.5)*8,y=(e.clientY/window.innerHeight-.5)*6;mark.style.transform='translate3d('+x+'px,'+y+'px,0)';});hero.addEventListener('pointerleave',()=>mark.style.transform='');}
});

/* V7.0 KATHYA bird companion — CSS-drawn bird, not the brand logo */
document.addEventListener('DOMContentLoaded',()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const fine=matchMedia('(pointer:fine)').matches;
 if(reduced)return;
 const bird=document.createElement('div');
 bird.className='k-bird';
 bird.setAttribute('aria-hidden','true');
 bird.innerHTML='<svg class="kb-parrot" viewBox="0 0 96 72" aria-hidden="true"><defs><linearGradient id="kpg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d8ff63"/><stop offset=".48" stop-color="#55d879"/><stop offset="1" stop-color="#079b56"/></linearGradient><linearGradient id="kpw" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#efff77"/><stop offset=".5" stop-color="#75df43"/><stop offset="1" stop-color="#0c8d4e"/></linearGradient></defs><path class="kp-tail" d="M36 48 4 68l28-27L8 53l31-20z" fill="#2fc568"/><ellipse cx="48" cy="39" rx="25" ry="17" fill="url(#kpg)"/><path class="kp-wing" d="M46 39C29 29 25 8 39 3c5 15 14 22 28 29-7 3-13 6-21 7z" fill="url(#kpw)"/><circle cx="70" cy="29" r="13" fill="#91ee55"/><path d="M80 27c11-4 14 2 5 8-3 2-6 1-8-1z" fill="#ff5b35"/><circle cx="74" cy="25" r="2.2" fill="#07120c"/><circle cx="73.4" cy="24.3" r=".65" fill="#fff"/><path d="M61 31c4 4 8 6 13 7" fill="none" stroke="#1a9a50" stroke-width="2"/><path d="M48 51c3 6 1 10-3 13M57 52c4 5 3 9 0 12" fill="none" stroke="#ef8b39" stroke-width="2.5" stroke-linecap="round"/></svg><i class="kb-trail"></i>'
 document.body.appendChild(bird);
 if(fine&&innerWidth>820){
  let tx=innerWidth*.7,ty=innerHeight*.3,x=tx,y=ty,dir=1,idle;
  const frame=()=>{x+=(tx-x)*.105;y+=(ty-y)*.105;bird.style.transform='translate3d('+(x-24)+'px,'+(y-20)+'px,0) scaleX('+dir+')';requestAnimationFrame(frame)};frame();
  addEventListener('pointermove',e=>{dir=e.clientX<tx?-1:1;tx=e.clientX+28*dir;ty=e.clientY+18;bird.classList.add('flying');clearTimeout(idle);idle=setTimeout(()=>bird.classList.remove('flying'),240)},{passive:true});
  document.querySelectorAll('a,button').forEach(el=>{el.addEventListener('pointerenter',()=>bird.classList.add('curious'));el.addEventListener('pointerleave',()=>bird.classList.remove('curious'))});
 }else{bird.classList.add('mobile-bird');const fly=()=>{bird.classList.remove('flyby');void bird.offsetWidth;bird.classList.add('flyby')};setTimeout(fly,1000);setInterval(fly,15000)}
});
