/* 侨脉地图视觉复用：仅迁入 Natural Earth 底图/离线 ECharts；本库不展示虚构迁徙路线。 */
(() => {
  const $=s=>document.querySelector(s);
  const e=(s)=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let mapLibPromise;
  function addScript(src) {
    return new Promise((resolve,reject)=>{const tag=document.createElement('script');tag.src=src;tag.onload=resolve;tag.onerror=()=>reject(Error(src+'加载失败'));document.head.appendChild(tag)})
  }
  async function ensureMapLib(){
    if(!mapLibPromise)mapLibPromise=(async()=>{
      if(!window.echarts)await addScript('vendor/echarts/echarts.min.js');
      const r=await fetch('assets/geo/world.json');if(!r.ok)throw Error('地图数据读取失败');
      const geo=await r.json();if(!window.echarts.getMap('hqz-world'))window.echarts.registerMap('hqz-world',geo);
    })();
    return mapLibPromise;
  }
  let mapPointsPromise;
  function points(){return mapPointsPromise||(mapPointsPromise=fetch('data/hqz-map-points.json').then(r=>r.json()))}
  async function drawMap(host){
    if(host.dataset.ready)return;
    host.dataset.ready='loading';
    try{
      const [geo,ls,migrationRoutes]=await Promise.all([ensureMapLib(),points(),fetch('data/migration-routes.json').then(r=>r.json())]);
      if(!host.isConnected)return;
      const anchors=ls.filter(p=>Array.isArray(p.coordinates)&&p.coordinates.length===2);
      const data=anchors.map(p=>({id:p.id,name:p.name,value:[...p.coordinates,p.person_count],url:p.url,book:p.book}));
      const routeData=migrationRoutes.map(r=>({...r,coords:[r.from_coords,r.to_coords],name:r.from_label+' → '+r.to_label,value:r.count_unique_people}));
      const chart=window.echarts.init(host,null,{renderer:'canvas'});
      const china=host.closest('.hqz-place-map')!=null;
      chart.setOption({animation:false,
        tooltip:{trigger:'item',backgroundColor:'#fffaf0',borderColor:'#c7a57a',textStyle:{color:'#5a3c21',fontSize:12},
          formatter:p=>{const d=p.data||{};if(p.seriesType==='lines')return e(d.name)+'<br>'+Number(d.count_unique_people||0)+' 位人物 · 点击看名单';return e(d.name)+'<br>地区关联人物 '+Number(d.value?.[2]||0)+' 条';}},
        geo:{map:'hqz-world',roam:true,center:china?[113,26]:[12,25],zoom:china?6.2:1.05,boundingCoords:[[-180,83],[180,-60]],itemStyle:{areaColor:'#e8dcc4',borderColor:'#faf3e7',borderWidth:.5},emphasis:{itemStyle:{areaColor:'#ddc29c'}}},
        series:[{type:'effectScatter',coordinateSystem:'geo',z:4,
          rippleEffect:{scale:2.1,period:5,brushType:'stroke'},symbolSize:v=>Math.max(7,Math.min(10,7+Math.sqrt(v[2])/9)),itemStyle:{color:'#a8543a',borderColor:'#fff5e7',borderWidth:1.6},
          label:{show:china,formatter:'{b}',position:'right',color:'#69492e',fontSize:11,backgroundColor:'#fff9ebbb',padding:2},labelLayout:{hideOverlap:true},data},
        {type:'lines',coordinateSystem:'geo',name:'经核实迁徙方向',z:3,silent:false,
         lineStyle:{color:'#a95140',opacity:.64,width:1.7,curveness:.27},
         emphasis:{lineStyle:{color:'#702b25',opacity:1,width:3}},
         effect:{show:false},data:routeData}]});
      chart.on('click',p=>{
        if(p.seriesType==='lines'&&p.data?.persons){
          const wrapper=host.closest('.hqz-home-map,.hqz-place-map')||host.parentElement;
          wrapper.querySelector('.hqz-map-route-panel')?.remove();
          const panel=document.createElement('div');panel.className='hqz-map-route-panel';panel.setAttribute('role','region');panel.setAttribute('aria-label','迁徙人物');
          const persons=p.data.persons||[];
          const personLinks=persons.map(person=>'<a href="person.html?id='+encodeURIComponent(person.id)+'">'+e(person.name)+'</a>').join('');
          panel.innerHTML='<div class="hqz-route-title"><strong>'+e(p.data.from_label)+' → '+e(p.data.to_label)+' · '+persons.length+'人</strong><button type="button" aria-label="关闭迁徙人物详情">×</button></div>'+
                          '<div class="hqz-route-people">'+personLinks+'</div>'+
                          '<small>线条代表人物生平中的迁居方向，不代表历史交通航线。</small>';
          panel.querySelector('button').addEventListener('click',()=>panel.remove());
          wrapper.appendChild(panel);
        }else if(p.data?.url)location.href=p.data.url;
      });
      new ResizeObserver(()=>chart.resize()).observe(host);
      const frame=host.closest('.hqz-place-map');
      frame?.querySelectorAll('[data-map-region]').forEach(btn=>btn.addEventListener('click',()=>{
        frame.querySelectorAll('[data-map-region]').forEach(b=>b.classList.toggle('active',b===btn));
        chart.setOption({geo:btn.dataset.mapRegion==='china'?{center:[113,26],zoom:6.2}:{center:[12,25],zoom:1.05}});
      }));
      host.dataset.ready='yes';
    }catch(err){host.dataset.ready='error';host.innerHTML='<div class="hqz-map-fallback">地图资源暂不可用。可从左侧地点目录或下方检索继续浏览。</div>';console.warn('Map failed',err)}
  }
  function initMaps(){
    const targets=[...document.querySelectorAll('.hqz-map-canvas')];
    if(!targets.length)return;
    if(!('IntersectionObserver' in window)){targets.forEach(drawMap);return}
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){observer.unobserve(entry.target);drawMap(entry.target)}
    }),{rootMargin:'180px'});
    targets.forEach(t=>observer.observe(t));
  }
  async function initHome(){
    const target=$('[data-hqz-feature-list]');if(!target)return;
    try{
      const [person,org,event]=await Promise.all(['person','org','event'].map(t=>fetch('data/'+t+'-index.json').then(r=>r.json())));
      function list(which,items){const host=$('[data-hqz-feature-'+which+']');if(!host)return;host.innerHTML=items.map(item=>{
        const n=item.name||item.title||'',detail=(item.bio_short||item.summary||'').replace(/(?:资料出处|来源)[：:].*$/u,'').slice(0,76);
        return '<a class="hqz-feature-row" href="'+which+'.html?id='+encodeURIComponent(item.id)+'"><span class="hqz-feature-logo">'+((item.cover_url&&item.cover_kind==='photo_or_recorded_source')?'<img loading="lazy" src="'+e(item.cover_url)+'" alt="'+e(n)+'">':e(n.slice(0,1)))+'</span><span><strong>'+e(n)+'</strong><small>'+e(detail)+'</small></span></a>'
      }).join('')}
      const priority=['陈宜禧','伍连德','雷洁琼','林梧桐'];
      const featured=priority.map(n=>person.find(p=>p.name===n)).filter(Boolean).slice(0,4);
      list('person', [...featured,...person.filter(x=>!featured.some(y=>x.id===y.id))].slice(0,4));
      list('org', org.filter(o=>/会馆|公会|商会/.test(o.name)).slice(0,2));
      list('event', event.filter(o=>(o.title||'').length<36).slice(0,2));
      target.dataset.loaded='yes';
    }catch(err){target.innerHTML='<p class="hqz-index-note">精选条目暂不可加载，请使用上方四个入口浏览。</p>';console.warn(err)}
  }
  document.addEventListener('DOMContentLoaded',()=>{initHome()});
})();