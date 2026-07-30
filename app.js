const products=[
['Листовой прокат','Горячекатаный, холоднокатаный, оцинкованный, рифлёный, ПВЛ, судовой, нержавеющий лист.'],
['Трубная продукция','Бесшовные, электросварные, профильные, котельные, нефтепроводные, обсадные и нержавеющие трубы.'],
['Сортовой прокат','Круг, квадрат, полоса, шестигранник, арматура, катанка.'],
['Фасонный прокат','Балка, швеллер, уголок, рельсы и специальные профили.'],
['Поковки','Круги, диски, кольца, валы и плиты по ГОСТ, ТУ и чертежам.'],
['Соединительные детали трубопроводов','Отводы, тройники, переходы, заглушки и фланцы.'],
['Запорная арматура','Задвижки, шаровые краны, клапаны и затворы.'],
['Метизы и крепёж','Болты, гайки, шпильки, шайбы и специальный крепёж.'],
['Сварочные материалы','Электроды, проволока, флюсы и материалы под специальные стали.'],
['Нержавеющие стали','AISI 304, 316, 321, 201, 12Х18Н10Т и другие марки.'],
['Жаропрочные и специальные сплавы','12Х1МФ, 15ХМ, ХН78Т и другие специальные марки.'],
['Цветные металлы','Алюминий, медь, латунь, бронза, титан и сплавы.'],
['Изоляция труб','ВУС, ППУ и другие покрытия по проекту.'],
['Промышленное оборудование','Оборудование, узлы и комплектующие по опросному листу.'],
['Нестандартные изделия','Изготовление по чертежу и техническому заданию заказчика.'],
['Материалы для ремонта','Позиции для ремонтных программ предприятий и сервисных организаций.']
];

const grid=document.querySelector('#catalogGrid');
const search=document.querySelector('#productSearch');
const productField=document.querySelector('#productField');
const form=document.querySelector('#leadForm');
const statusNode=document.querySelector('#formStatus');
const submitButton=form?.querySelector('button[type="submit"]');

function uuid(){
  return globalThis.crypto?.randomUUID?.() || `mm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function render(items){
  grid.innerHTML=items.map(([name,desc])=>`<article class="card"><h3>${name}</h3><p>${desc}</p><button type="button" data-product="${name}">Хочу купить →</button></article>`).join('');
}
render(products);

search?.addEventListener('input',()=>{
  const q=search.value.trim().toLowerCase();
  render(products.filter(p=>p.join(' ').toLowerCase().includes(q)));
  track('site_search',{query:q});
});

document.addEventListener('click',e=>{
  const button=e.target.closest('[data-product],[data-open-form]');
  if(!button)return;
  const product=button.dataset.product||'';
  if(productField&&product)productField.value=product;
  document.querySelector('#lead')?.scrollIntoView({behavior:'smooth'});
  track('want_to_buy_click',{product});
});

const params=new URLSearchParams(location.search);
const previous=JSON.parse(localStorage.getItem('mm_attribution')||'{}');
const sessionId=localStorage.getItem('mm_session_id')||uuid();
localStorage.setItem('mm_session_id',sessionId);
const attribution={
  sessionId,
  utm_source:params.get('utm_source')||previous.utm_source||null,
  utm_medium:params.get('utm_medium')||previous.utm_medium||null,
  utm_campaign:params.get('utm_campaign')||previous.utm_campaign||null,
  utm_term:params.get('utm_term')||previous.utm_term||null,
  utm_content:params.get('utm_content')||previous.utm_content||null,
  yclid:params.get('yclid')||previous.yclid||null,
  gclid:params.get('gclid')||previous.gclid||null,
  referrer:previous.referrer||document.referrer||null,
  landingPage:previous.landingPage||location.href
};
localStorage.setItem('mm_attribution',JSON.stringify(attribution));
const sourceField=document.querySelector('#sourceField');
if(sourceField)sourceField.value=JSON.stringify(attribution);

function track(name,data={}){
  const payload={name,data,path:location.pathname,time:new Date().toISOString(),sessionId};
  const events=JSON.parse(localStorage.getItem('mm_events')||'[]');
  events.push(payload);
  localStorage.setItem('mm_events',JSON.stringify(events.slice(-100)));
  window.ym?.(window.MM_METRIKA_ID,'reachGoal',name,data);
  window.gtag?.('event',name,data);
}

track('page_view');
document.querySelectorAll('a[href^="tel:"]').forEach(a=>a.addEventListener('click',()=>track('phone_click',{phone:a.textContent.trim()})));
form?.addEventListener('focusin',()=>track('form_start'),{once:true});
form?.querySelector('input[type="file"]')?.addEventListener('change',e=>track('file_upload',{hasFile:Boolean(e.target.files?.length)}));

function setStatus(message,isError=false){
  if(!statusNode)return;
  statusNode.textContent=message;
  statusNode.style.color=isError?'#a40000':'';
}

form?.addEventListener('submit',async(event)=>{
  event.preventDefault();
  if(!form.reportValidity())return;

  const formData=new FormData(form);
  const file=formData.get('file');
  const externalLeadId=uuid();
  document.querySelector('#externalLeadId').value=externalLeadId;
  document.querySelector('#personalDataField').value='true';
  formData.set('externalLeadId',externalLeadId);
  formData.set('personalData','true');

  // Until the SaaS attachment endpoint is enabled, file requests use Netlify Forms.
  if(file instanceof File && file.size>0){
    track('lead_submit',{product:productField?.value||'',channel:'netlify-file'});
    form.submit();
    return;
  }

  const payload=Object.fromEntries(formData.entries());
  payload.attribution=attribution;
  payload.personalData=true;
  delete payload.file;

  submitButton.disabled=true;
  setStatus('Отправляем заявку…');
  track('lead_submit',{product:productField?.value||'',channel:'saas-gateway'});

  try{
    const response=await fetch('/api/leads',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify(payload)
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok||!result.accepted)throw new Error(result.error||'LEAD_NOT_ACCEPTED');

    track('saas_lead_accepted',{requestId:result.requestId||null,externalLeadId});
    form.reset();
    if(sourceField)sourceField.value=JSON.stringify(attribution);
    setStatus('Заявка принята. Менеджер свяжется с вами в течение рабочего дня.');
  }catch(error){
    console.warn('SaaS gateway unavailable, using Netlify Forms fallback',error);
    setStatus('Сохраняем заявку резервным способом…');
    form.submit();
  }finally{
    submitButton.disabled=false;
  }
});
