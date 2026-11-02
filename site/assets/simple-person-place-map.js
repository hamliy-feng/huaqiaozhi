/* HQZ simple person-place map. Visual pattern borrowed from read-only Qimai ECharts map. */
(()=>{
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const byId=new Map(), lineByPair=new Map();
 const fetchJson=async p=>{const r=await fetch(p);if(!r.ok)throw new Error(p+' HTTP '+r.status);return r.json()};
 let sharedPromise;
 function data(){
  if(!sharedPromise) sharedPromise=Promise.all([
    fetchJson('data/map-places.json'),fetchJson('data/map-links.json'),
    fetchJson('assets/geo/world.json'),
    fetchJson('data/person-index.json'),
    window.echarts?Promise.resolve():new Promise((yes,no)=>{
      const s=document.createElement('script');s.src='vendor/echarts/echarts.min.js';s.onload=yes;s.onerror=()=>no(new Error('ECharts unavailable'));document.head.appendChild(s);
    })
  ]).then(([nodes,edges,world,people])=>{
    nodes.forEach(p=>byId.set(p.id,p));
    edges.forEach(l=>lineByPair.set([l.fromPlaceId,l.toPlaceId].sort().join('|'),l));
    const names=new Map(people.map(p=>[p.id,p.name]));
    if(!echarts.getMap('hqz-simple-world'))echarts.registerMap('hqz-simple-world',world);
    return{nodes,edges,names};
  });
  return sharedPromise;
 }
 function panel(container,title,ids,names,subtitle){
   let shell=container.querySelector('.hqz-person-place-panel');
   if(!shell){shell=document.createElement('section');shell.className='hqz-person-place-panel';shell.setAttribute('role','region');container.appendChild(shell)}
   const sorted=[...new Set(ids)].sort((a,b)=>String(names.get(a)||'').localeCompare(String(names.get(b)||''),'zh'));
   const selectedPlace=[...byId.values()].find(v=>v.name===title);
   const placePhoto=(selectedPlace?.cover_kind==='photo_or_recorded_source'&&selectedPlace?.cover_url)?'<img class="hqz-map-place-photo" loading="lazy" src="'+esc(selectedPlace.cover_url)+'" alt="'+esc(title)+'相关风貌">':'';
   shell.innerHTML=placePhoto+'<div class="hqz-map-panel-head"><div><strong>'+esc(title)+'</strong><small>'+sorted.length+'位关联人物</small></div><button type="button" aria-label="关闭关联人物名单">×</button></div>'+
   (subtitle?'<p class="hqz-map-panel-note">'+esc(subtitle)+'</p>':'')+
   '<input type="search" aria-label="筛选关联人物" placeholder="搜索姓名..." class="hqz-person-map-filter">'+
   '<div class="hqz-person-map-list"></div>';
   const list=shell.querySelector('.hqz-person-map-list'),input=shell.querySelector('input');
   const paint=()=>{const q=input.value.trim();list.innerHTML=sorted.filter(id=>!q||String(names.get(id)||'').includes(q)).map(id=>'<a href="person.html?id='+encodeURIComponent(id)+'">'+esc(names.get(id)||id)+' <span>查看人物 →</span></a>').join('')||'<p class="hqz-map-panel-note">没有匹配姓名</p>'};
   input.addEventListener('input',paint);paint();
   shell.querySelector('button').onclick=()=>shell.remove();
 }
 function controls(frame,chart,host,nodes){
   let bar=frame.querySelector('.hqz-map-toolbar');
   if(!bar){bar=document.createElement('div');bar.className='hqz-map-toolbar';bar.innerHTML='<button type="button" data-map-region="world">世界</button><button type="button" data-map-region="china">中国</button>';frame.appendChild(bar)}
   let chooser=bar.querySelector('.hqz-map-place-select');
   if(!chooser){chooser=document.createElement('select');chooser.className='hqz-map-place-select';chooser.setAttribute('aria-label','按名称定位地点');chooser.innerHTML='<option value="">选择地点...</option>'+nodes.slice().sort((a,b)=>a.name.localeCompare(b.name,'zh')).map(n=>'<option value="'+esc(n.id)+'">'+esc(n.name)+' · '+n.person_count+'人</option>').join('');bar.appendChild(chooser)}
   chooser.onchange=()=>{if(chooser.value)host.__hqzMap?.selectPlace(chooser.value)};
   bar.querySelectorAll('[data-map-region]').forEach(btn=>{
     btn.classList.toggle('active',btn.dataset.mapRegion==='world');
     btn.addEventListener('click',()=>{
       bar.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===btn));
       chart.setOption({geo:btn.dataset.mapRegion==='china'?{center:[108,32],zoom:3.8}:{center:[12,18],zoom:1.10}});
     })
   });
   let zoom=frame.querySelector('.hqz-assoc-zoom');
   if(!zoom){zoom=document.createElement('div');zoom.className='hqz-assoc-zoom';zoom.innerHTML='<button type="button" data-mult="1.25" aria-label="地图放大">+</button><button type="button" data-mult="0.8" aria-label="地图缩小">−</button>';frame.appendChild(zoom)}
   zoom.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{
     const v=chart.getOption().geo[0].zoom||1;
     chart.setOption({geo:{zoom:Math.max(.7,Math.min(10,v*Number(btn.dataset.mult)))}})
   });
 }
 async function mount(host){
   if(host.dataset.ready)return;host.dataset.ready='loading';
   try {
     const {nodes,edges,names}=await data();
     if(!host.isConnected)return;
     const frame=host.closest('.hqz-home-map,.hqz-place-map')||host.parentElement;
     let selected=nodes.find(p=>p.name==='安溪县')||nodes[0];
     const params=new URLSearchParams(location.search);
     if(params.has('map'))selected=byId.get(params.get('map'))||selected;
     const chart=echarts.init(host,null,{renderer:'canvas'});
     function selectedLines(){
       return edges.filter(l=>l.fromPlaceId===selected.id||l.toPlaceId===selected.id).map(l=>({
        name:l.fromLabel+' — '+l.toLabel,coords:[byId.get(l.fromPlaceId).coordinates,byId.get(l.toPlaceId).coordinates],
        fromPlaceId:l.fromPlaceId,toPlaceId:l.toPlaceId,personIds:l.personIds,count:l.count
       }));
     }
     const points=nodes.map(p=>({name:p.name,value:[...p.coordinates,p.person_count],id:p.id,personIds:p.personIds}));
     const option={animation:false,
      tooltip:{trigger:'item',backgroundColor:'#fffaf0',borderColor:'#d5b58c',textStyle:{color:'#5b422b',fontSize:12},
        formatter:p=>p.seriesType==='lines'?esc(p.data?.name)+'<br>'+Number(p.data?.count||0)+'位共同关联人物 · 点击查看':esc(p.name)+'<br>'+Number(p.data?.value?.[2]||0)+'位关联人物 · 点击查看'},
      geo:{map:'hqz-simple-world',roam:true,center:[12,18],zoom:1.10,
        boundingCoords:[[-180,83],[180,-60]],
        itemStyle:{areaColor:'#eaddc5',borderColor:'#f6eddd',borderWidth:.5},emphasis:{itemStyle:{areaColor:'#d9c39d'}}},
      series:[
       {type:'lines',coordinateSystem:'geo',z:2,silent:false,large:false,
        lineStyle:{color:'#a44d38',opacity:.55,width:1.3,curveness:.23},
        emphasis:{lineStyle:{width:2.6,opacity:1}},data:selectedLines()},
       {type:'scatter',coordinateSystem:'geo',z:5,data:points,
        symbolSize:v=>Math.max(6,Math.min(15,7+Math.sqrt(v[2])*.32)),
        itemStyle:{color:'#a44d38',borderColor:'#fffaf0',borderWidth:1.3},
        label:{show:true,position:'right',distance:4,color:'#684c34',fontSize:11,
          formatter:p=>(p.data?.value?.[2]>=4||p.data?.id===selected.id)?p.name:''},
        labelLayout:{hideOverlap:true},emphasis:{scale:1.2}}
      ]};
     chart.setOption(option);
     controls(frame,chart,host,nodes);
     if(params.has('map'))panel(frame,selected.name,selected.personIds,names,'点击姓名查看人物档案');
     chart.on('click',p=>{
       if(p.seriesType==='scatter'&&p.data?.id){
         host.__hqzMap?.selectPlace(p.data.id);
       }else if(p.seriesType==='lines'&&p.data?.personIds){
         panel(frame,p.data.name,p.data.personIds,names,'两地共享同一人物的地点关联；不表示迁徙方向');
       }
     });
     const obs=new ResizeObserver(()=>chart.resize());obs.observe(host);
     host.dataset.ready='yes';host.dataset.points=String(nodes.length);host.dataset.links=String(edges.length);
     const markActive=()=>{
       document.querySelectorAll('.hqz-map-linked-list button[data-map-id]').forEach(btn=>{
         const active=btn.dataset.mapId===selected.id;
         btn.classList.toggle('active',active);
         btn.setAttribute('aria-pressed',String(active));
       });
     };
     host.__hqzMap={chart,selectPlace:(id)=>{
       const item=byId.get(id);if(!item)return false;
       selected=item;
       chart.setOption({series:[{data:selectedLines()},{data:points.map(p=>({...p,symbolSize:p.id===selected.id?16:undefined}))}]});
       panel(frame,item.name,item.personIds,names,'点击姓名进入该人物档案');
       markActive();return true;
     }};
     if(document.body?.dataset.page==='place'){
       const directory=document.querySelector('.hqz-map-linked-list');
       if(directory){
         const ordered=nodes.slice().sort((a,b)=>b.person_count-a.person_count||a.name.localeCompare(b.name,'zh'));
         directory.innerHTML=ordered.map(item=>'<button type="button" data-map-id="'+esc(item.id)+'" aria-pressed="false"><strong>'+esc(item.name)+'</strong><span>'+Number(item.person_count)+'人</span></button>').join('');
         directory.addEventListener('click',event=>{
           const btn=event.target.closest('button[data-map-id]');
           if(btn)host.__hqzMap?.selectPlace(btn.dataset.mapId);
         });
         markActive();
       }
       const list=document.querySelector('.hqz-place-list .city-grid');
       list?.addEventListener('click',event=>{
         const card=event.target.closest('.city-card');if(!card)return;
         const name=card.querySelector('strong')?.textContent?.trim();
         const item=nodes.find(x=>x.name===name);
         if(item)host.__hqzMap?.selectPlace(item.id);
       });
     }
   }catch(err){
     host.dataset.ready='error';host.innerHTML='<div class="hqz-map-fallback">地图暂不可用，请从人物目录浏览。</div>';
     console.warn('HQZ association map',err);
   }
 }
 document.addEventListener('DOMContentLoaded',()=>{
   const hosts=[...document.querySelectorAll('.hqz-map-canvas')];if(!hosts.length)return;
   if(!('IntersectionObserver'in window)){hosts.forEach(mount);return}
   const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){observer.unobserve(entry.target);mount(entry.target)}}),{rootMargin:'250px'});
   hosts.forEach(host=>observer.observe(host));
 });
})();