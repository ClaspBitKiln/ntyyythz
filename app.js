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
function render(items){grid.innerHTML=items.map(([name,desc])=>`<article class="card"><h3>${name}</h3><p>${desc}</p><button type="button" data-product="${name}">Хочу купить →</button></article>`).join('');}
render(products);
search?.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();render(products.filter(p=>p.join(' ').toLowerCase().includes(q)));track('catalog_search',{query:q});});
document.addEventListener('click',e=>{const button=e.target.closest('[data-product],[data-open-form]');if(!button)return;const product=button.dataset.product||'';if(productField&&product)productField.value=product;document.querySelector('#lead')?.scrollIntoView({behavior:'smooth'});track('want_to_buy_click',{product});});
const params=new URLSearchParams(location.search);const attribution={utm_source:params.get('utm_source'),utm_medium:params.get('utm_medium'),utm_campaign:params.get('utm_campaign'),utm_term:params.get('utm_term'),referrer:document.referrer,landing_page:location.href};localStorage.setItem('mm_attribution',JSON.stringify(attribution));const sourceField=document.querySelector('#sourceField');if(sourceField)sourceField.value=JSON.stringify(attribution);
function track(name,data={}){const payload={name,data,path:location.pathname,time:new Date().toISOString()};const events=JSON.parse(localStorage.getItem('mm_events')||'[]');events.push(payload);localStorage.setItem('mm_events',JSON.stringify(events.slice(-100)));window.ym?.(window.MM_METRIKA_ID,'reachGoal',name,data);window.gtag?.('event',name,data);}
track('page_view');
document.querySelectorAll('a[href^="tel:"]').forEach(a=>a.addEventListener('click',()=>track('phone_click',{phone:a.textContent.trim()})));
document.querySelector('form')?.addEventListener('submit',()=>track('lead_submit',{product:productField?.value||''}));
