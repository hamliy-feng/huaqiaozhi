(async () => {
  const page = document.body.dataset.page || '';
  if(!document.querySelector('link[href="assets/data-bridge.css"]')){
    const dataCss=document.createElement('link');dataCss.rel='stylesheet';dataCss.href='assets/data-bridge.css';document.head.appendChild(dataCss);
  }
  const loadScript=src=>new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=reject;document.head.appendChild(script)});
  try{
    window.HQZ_API_BASE='static';
    if(window.HQZ_DATA_MODE==='demo'&&!window.HQZ_DEMO_DATA) await loadScript('assets/demo-data.js');
    if(!window.HQZ_API_ADAPTER) await loadScript('assets/api-adapter.js');
    if(!window.HQZ_OBJECT_SCHEMAS) await loadScript('assets/object-schemas.js?v=public-api-v1-20260807');
    if(!window.HQZ) await loadScript('assets/api-static.js?v=20261102');
    if(!window.HQZ_BINDINGS) await loadScript('assets/data-bindings.js?v=person-v2-20260911');
  }catch(error){ document.body.dataset.bootstrapError=String(error?.message||error); }
  const labels = {person:'人物',org:'组织',event:'事件',place:'地点',topic:'专题',search:'检索',review:'审阅'};
  const links = [
    ['index.html','home','首页'],['person.html','person','人物'],['org.html','org','组织'],
    ['event.html','event','事件'],['place.html','place','地点'],['search.html','search','检索']
  ];
  const header = document.querySelector('[data-site-header]');
  if (header) header.innerHTML = `<nav class="site-nav" aria-label="主导航"><div class="nav-shell">
    <a class="site-brand" href="index.html"><img src="assets/common-nav-logo.png" alt="华侨志数据库站徽"><span class="brand-copy"><strong>华侨志数据库</strong><small>全球华侨历史知识库</small></span></a>
    <button class="nav-toggle" aria-label="展开导航" aria-expanded="false">☰</button>
    <div class="main-links">${links.map(([href,key,name])=>`<a href="${href}" class="${page===key?'active':''}">${name}</a>`).join('')}</div>
    <div class="nav-tools"><label class="nav-search"><span>⌕</span><input aria-label="站内搜索" placeholder="检索全库"></label><a class="nav-text" href="search.html">高级检索</a><a class="nav-text" href="about.html">帮助中心</a></div>
  </div></nav>`;
  const footer = document.querySelector('[data-site-footer]');
  if (footer) footer.innerHTML = `<footer><div class="wrap"><div class="footer-grid">
    <div><div class="footer-brand">华侨志数据库</div><p>五书人物、组织、事件与地点资料</p></div>
    <div><h4>浏览</h4><a href="person.html">人物</a><a href="org.html">组织</a><a href="event.html">事件</a><a href="place.html">地点</a></div>
    <div><h4>工具</h4><a href="search.html">全库检索</a></div>
  </div><div class="copyright">© 2026 华侨志数据库</div></div></footer>`;

  const localDemoAllowed=window.HQZ_DATA_MODE==='demo';
  let dataState = {source:localDemoAllowed?'demo':'blocked',mode:localDemoAllowed?'demo':'unknown',stats:{},mapPoints:[],hotwords:[],modules:[]};
  if(window.HQZ?.api){
    try{ dataState = await window.HQZ.api.bootstrap(page,new URLSearchParams(location.search).get('id')||document.body.dataset.entityId||null); }
    catch(error){ dataState={...dataState,source:'blocked',blocking_error:String(error?.message||error)}; }
  }
  const presentationProfile=dataState.stats?.presentation_profile||'';
  if(presentationProfile)document.body.dataset.presentationProfile=presentationProfile;
  if((dataState.source==='backend'||dataState.source==='demo')&&window.HQZ_BINDINGS){
    try{await window.HQZ_BINDINGS.apply(page,dataState);dataState.source=window.HQZ.api.source}
    catch(error){
      const reason=String(error?.message||error);
      document.body.dataset.dataError=reason;
      dataState={...dataState,source:'blocked',blocking_error:`frontend-binding-failed:${reason}`,bindingError:reason};
    }
  }
  if(dataState.source==='blocked'){
    document.body.classList.add('backend-data-active','data-access-blocked');
    document.body.dataset.dataError=dataState.blocking_error||'data-access-blocked';
    const host=document.createElement('section');host.className='data-access-blocked-panel';
    const panel=document.createElement('article');panel.className='panel';
    const title=document.createElement('h1');title.textContent='数据访问已阻断';
    const summary=document.createElement('p');summary.className='summary';
    summary.textContent=dataState.mode==='teacher_preview'
      ?'教学预览认证或模式确认失败。为防止候选数据与 Demo 混淆，页面已停止展示数据。'
      :'后端数据模式无法确认。页面不会回退到 Demo，请检查同源 API 或受控代理。';
    panel.append(title,summary);host.appendChild(panel);
    const main=document.querySelector('main');
    if(main)main.replaceChildren(host);
  }
  document.body.dataset.dataSource=dataState.source;
  document.body.dataset.dataMode=dataState.mode||dataState.source;
  if(dataState.source==='backend'&&dataState.mode==='teacher_preview'&&presentationProfile!=='final_showcase_v1'){
    const tools=document.querySelector('.nav-tools');
    if(tools&&!tools.querySelector('a[href="review.html"]')){
      const reviewLink=document.createElement('a');reviewLink.className='nav-text';reviewLink.href='review.html';reviewLink.textContent='字段审阅';tools.prepend(reviewLink);
    }
  }
  const sourceMode=dataState.source==='backend'?(dataState.mode||'public'):dataState.source==='blocked'?'blocked':'demo';
  const sourceCopy={
    teacher_preview:['研究数据','含待审核条目'],
    public:['后端审核数据','仅显示已公开内容'],
    demo:['第一版 Demo 数据','仅限离线或显式 Demo'],
    blocked:['数据访问已阻断','未回退 Demo']
  }[sourceMode]||['数据状态未知','请检查接口'];
  if(footer&&(dataState.source==='backend'||dataState.source==='blocked')&&presentationProfile!=='final_showcase_v1'){
    const footerNote=footer.querySelector('.footer-grid>div:first-child p:last-child');
    if(footerNote)footerNote.textContent=sourceMode==='blocked'?'当前数据访问已阻断。':sourceMode==='teacher_preview'?'当前数据由后端接口提供。':'当前展示后端数据。';
    const copyright=footer.querySelector('.copyright');
    if(copyright)copyright.textContent=`© 2026 华侨志数据库 · ${sourceCopy[0]}`;
  }
  function renderExtensionModules(modules=[]){
    if(!Array.isArray(modules)||!modules.length)return;
    const host=document.createElement('section');host.className='section extension-zone';host.dataset.extensionSlot='';
    const wrap=document.createElement('div');wrap.className='wrap';
    const title=document.createElement('h2');title.className='section-title';title.textContent='扩展数据';wrap.appendChild(title);
    const grid=document.createElement('div');grid.className='extension-grid';
    modules.filter(m=>['note','stats','cards','links'].includes(m.kind)).forEach(module=>{
      const card=document.createElement('article');card.className='panel extension-module';
      const heading=document.createElement('h3');heading.className='subheading';heading.textContent=module.title||'扩展板块';card.appendChild(heading);
      if(module.summary){const p=document.createElement('p');p.className='summary';p.textContent=module.summary;card.appendChild(p)}
      const items=document.createElement('div');items.className='chip-row';
      (Array.isArray(module.items)?module.items:[]).slice(0,12).forEach(item=>{const chip=document.createElement(item.href?'a':'span');chip.className='chip';chip.textContent=item.label||item.title||String(item.value??'');if(item.href&&/^(person|event|org|place|topic|search)\.html(?:[?#].*)?$/.test(item.href))chip.href=item.href;items.appendChild(chip)});
      card.appendChild(items);grid.appendChild(card);
    });
    wrap.appendChild(grid);host.appendChild(wrap);document.querySelector('main')?.appendChild(host);
  }
  renderExtensionModules(dataState.modules);
  document.dispatchEvent(new CustomEvent('hqz:data-ready',{detail:dataState}));

  const toast = document.createElement('div');
  toast.className = 'toast'; toast.setAttribute('role','status'); document.body.appendChild(toast);
  let toastTimer;
  window.demoTip = (name='该功能') => { clearTimeout(toastTimer); toast.textContent = dataState.source==='demo'?`【Demo】${name}将在 MVP 版本中开放`:dataState.source==='blocked'?'数据访问已阻断':`${name}暂未开放`; toast.classList.add('show'); toastTimer=setTimeout(()=>toast.classList.remove('show'),2200); };

  document.querySelector('.nav-toggle')?.addEventListener('click', e => {
    const menu=document.querySelector('.main-links'); menu.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded',menu.classList.contains('open'));
  });
  document.querySelector('.nav-search input')?.addEventListener('keydown', e => {
    if(e.key==='Enter'){ const q=encodeURIComponent(e.currentTarget.value.trim()); location.href=`search.html${q?'?q='+q:''}`; }
  });
  document.querySelectorAll('[data-demo]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();demoTip(el.dataset.demo)}));
  document.querySelectorAll('[data-filter-toggle]').forEach(btn=>btn.addEventListener('click',()=>{
    const target=document.querySelector(btn.dataset.filterToggle); target?.classList.toggle('open'); btn.textContent=target?.classList.contains('open')?'收起筛选 ↑':'展开更多筛选 ↓';
  }));
  document.querySelectorAll('[data-reset]').forEach(btn=>btn.addEventListener('click',()=>{
    btn.closest('form')?.reset(); document.querySelectorAll('.record-item').forEach(x=>x.hidden=false); if(dataState.source==='demo')demoTip('筛选重置');
  }));
  document.querySelectorAll(page==='search'?'[data-tab-group]:not(*)':'[data-tab-group]').forEach(group=>{
    const tabs=group.querySelectorAll('.tab'); const panels=group.querySelectorAll('.tab-panel');
    tabs.forEach((tab,i)=>tab.addEventListener('click',()=>{tabs.forEach(x=>x.classList.remove('active'));panels.forEach(x=>x.classList.remove('active'));tab.classList.add('active');panels[i]?.classList.add('active')}));
  });
  document.querySelectorAll('.record-item').forEach(item=>item.addEventListener('click',()=>{
    item.closest('.record-list')?.querySelectorAll('.record-item').forEach(x=>x.classList.remove('active')); item.classList.add('active');
    const name=item.querySelector('h3')?.textContent; if(name){ document.querySelector('[data-detail-name]')?.replaceChildren(document.createTextNode(name)); }
  }));
  if(dataState.source==='demo')document.querySelectorAll('.page-no').forEach(btn=>btn.addEventListener('click',()=>{btn.parentElement.querySelectorAll('.page-no').forEach(x=>x.classList.remove('active'));btn.classList.add('active');demoTip(`第 ${btn.textContent} 页数据`)}));
  document.querySelectorAll('.accordion button').forEach(btn=>btn.addEventListener('click',()=>btn.parentElement.classList.toggle('open')));
  document.querySelectorAll('.auth-tab').forEach((tab,i)=>tab.addEventListener('click',()=>{
    document.querySelectorAll('.auth-tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.auth-form').forEach(x=>x.classList.remove('active'));tab.classList.add('active');document.querySelectorAll('.auth-form')[i]?.classList.add('active');
  }));

  const revealObserver = new IntersectionObserver(entries=>entries.forEach((entry,i)=>{
    if(entry.isIntersecting){setTimeout(()=>entry.target.classList.add('visible'),i*60);revealObserver.unobserve(entry.target)}
  }),{threshold:.08});
  document.querySelectorAll('.section,.panel,.info-card').forEach(el=>{el.classList.add('reveal');revealObserver.observe(el)});
  const timelineObserver = new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting) entry.target.querySelectorAll('.timeline-item').forEach((x,i)=>setTimeout(()=>x.classList.add('lit'),i*120));
  }),{threshold:.2});
  document.querySelectorAll('.timeline').forEach(x=>timelineObserver.observe(x));

  document.querySelectorAll('.scan-viewer').forEach(viewer=>{
    const image=viewer.querySelector('img'); let scale=1, x=0, y=0, down=false, sx=0, sy=0;
    const paint=()=>image.style.transform=`translate(${x}px,${y}px) scale(${scale})`;
    viewer.querySelector('[data-zoom-in]')?.addEventListener('click',()=>{scale=Math.min(3,scale+.2);paint()});
    viewer.querySelector('[data-zoom-out]')?.addEventListener('click',()=>{scale=Math.max(.6,scale-.2);paint()});
    viewer.querySelector('[data-zoom-reset]')?.addEventListener('click',()=>{scale=1;x=0;y=0;paint()});
    viewer.addEventListener('wheel',e=>{e.preventDefault();scale=Math.max(.6,Math.min(3,scale+(e.deltaY<0?.12:-.12)));paint()},{passive:false});
    viewer.addEventListener('pointerdown',e=>{down=true;sx=e.clientX-x;sy=e.clientY-y;viewer.setPointerCapture(e.pointerId)});
    viewer.addEventListener('pointermove',e=>{if(down){x=e.clientX-sx;y=e.clientY-sy;paint()}});viewer.addEventListener('pointerup',()=>down=false);
  });
  document.querySelectorAll('[data-copy]').forEach(btn=>btn.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(btn.dataset.copy);toast.textContent='引用格式已复制';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1800)}catch{demoTip('复制引用')}}));

  const geoPoints=(dataState.source==='backend'?dataState.mapPoints.map(x=>({name:x.name,value:[x.lng,x.lat,x.count||1]})):dataState.source==='demo'?[
    {name:'厦门',value:[118.09,24.48,1840]},{name:'泉州',value:[118.67,24.88,1460]},{name:'梅州',value:[116.12,24.29,920]},
    {name:'新加坡',value:[103.82,1.35,2310]},{name:'槟城',value:[100.33,5.41,1260]},{name:'马尼拉',value:[120.98,14.6,880]},
    {name:'雅加达',value:[106.85,-6.2,760]},{name:'旧金山',value:[-122.42,37.77,540]},{name:'温哥华',value:[-123.12,49.28,390]}
  ]:[]);
  function initMap(el){
    if(dataState.source==='backend'&&!geoPoints.length){el.innerHTML='<div class="map-fallback">暂无公开地点数据</div>';return}
    if(!window.echarts){el.innerHTML='<div class="map-fallback">地图资源暂未载入，其他内容仍可正常浏览</div>';return}
    try{
      const chart=echarts.init(el); const routes=dataState.source==='backend'?[]:[['厦门','新加坡'],['厦门','槟城'],['泉州','马尼拉'],['梅州','雅加达'],['厦门','旧金山'],['泉州','温哥华']];
      const byName=Object.fromEntries(geoPoints.map(x=>[x.name,x.value]));
      chart.setOption({backgroundColor:'transparent',tooltip:{trigger:'item',formatter:p=>`${p.name}${p.value?.[2]?`<br>关联记录 ${p.value[2].toLocaleString()} 条`:''}`},geo:{map:'world',roam:true,silent:false,itemStyle:{areaColor:'#e4d5b7',borderColor:'#9f8051',borderWidth:.5},emphasis:{itemStyle:{areaColor:'#d3ba8b'}}},series:[{type:'lines',coordinateSystem:'geo',zlevel:2,effect:{show:true,period:16,trailLength:.15,symbol:'circle',symbolSize:3,color:'#b08d57'},lineStyle:{color:'#8d6935',width:.6,opacity:.55,curveness:.2,type:'dashed'},data:routes.filter(r=>byName[r[0]]&&byName[r[1]]).map(r=>({coords:[byName[r[0]],byName[r[1]]]}))},{type:'effectScatter',coordinateSystem:'geo',rippleEffect:{period:5,scale:3},symbolSize:v=>Math.max(7,Math.min(16,(v[2]||1)/130)),itemStyle:{color:'#6d4c24',shadowBlur:8,shadowColor:'#b08d57'},data:geoPoints}]});
      addEventListener('resize',()=>chart.resize());
    }catch(err){el.innerHTML='<div class="map-fallback">地图数据暂不可用，请稍后重试</div>'}
  }
  document.querySelectorAll('[data-map]').forEach(initMap);

  if(page==='search'){
    const input=document.querySelector('.global-search input'); const q=new URLSearchParams(location.search).get('q'); if(q) input.value=q;
    document.querySelectorAll('[data-search-tab]').forEach(tab=>tab.addEventListener('click',()=>{
      document.querySelectorAll('[data-search-tab]').forEach(x=>x.classList.remove('active')); tab.classList.add('active');
      const type=tab.dataset.searchTab; document.querySelectorAll('.search-result').forEach(x=>x.hidden=type!=='all'&&x.dataset.type!==type);
    }));
  }
})();
