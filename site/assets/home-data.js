(async()=>{
  const css=document.createElement('link');css.rel='stylesheet';css.href='assets/data-bridge.css';document.head.appendChild(css);
  if(!window.HQZ?.api)return;
  let state;
  try{state=await window.HQZ.api.bootstrap('home')}
  catch(error){state={source:'blocked',mode:window.HQZ.api.mode||'unknown',blocking_error:String(error?.message||error),stats:{},mapPoints:[],hotwords:[]}}
  document.body.dataset.dataSource=state.source;document.body.dataset.dataMode=state.mode||state.source;
  const profile=state.stats?.presentation_profile||'';
  if(profile)document.body.dataset.presentationProfile=profile;
  if(state.source==='blocked'){
    document.body.classList.add('backend-data-active','data-access-blocked');
    const host=document.createElement('section');host.className='data-access-blocked-panel';
    const panel=document.createElement('article');panel.className='panel';
    panel.append(Object.assign(document.createElement('h1'),{textContent:'数据访问已阻断'}),Object.assign(document.createElement('p'),{className:'summary',textContent:'后端数据暂时无法读取，请检查 8002 服务。'}));
    host.appendChild(panel);document.querySelector('header.hero')?.after(host);return;
  }
  if(state.source!=='backend')return;
  document.body.classList.add('backend-data-active');

  const countOf=type=>{
    const slot=state.stats?.counts?.[type];
    if(slot&&typeof slot==='object')return Number(slot.candidate??slot.needs_review??slot.public??0);
    return Number(state.stats?.[type]??0);
  };
  const metrics=[['人物',countOf('person'),'PERSON'],['组织',countOf('org'),'ORG'],['事件',countOf('event'),'EVENT'],['地点',countOf('place'),'PLACE']];
  const applyMetrics=()=>document.querySelectorAll('.hero-stats .hstat').forEach((cell,index)=>{
    const [label,value,code]=metrics[index]||['数据',0,'DATA'];
    const number=cell.querySelector('b'),name=cell.querySelector('span'),english=cell.querySelector('em');
    if(number){number.removeAttribute('data-count');number.textContent=value.toLocaleString('zh-CN')}
    if(name)name.textContent=label;if(english)english.textContent=code;
  });
  applyMetrics();setTimeout(applyMetrics,1700);

  const searchbar=document.querySelector('.searchbar');
  if(searchbar&&state.hotwords?.length){
    document.querySelector('.hot-tags')?.remove();
    const host=document.createElement('div');host.className='hot-tags';host.appendChild(document.createTextNode('热门：'));
    state.hotwords.slice(0,7).forEach(word=>{const value=typeof word==='string'?word:word.name||word.label;if(!value)return;const link=document.createElement('a');link.href=`search.html?q=${encodeURIComponent(value)}`;link.textContent=value;host.appendChild(link)});
    searchbar.after(host);
  }

  const grid=document.querySelector('.topics-grid');
  if(grid){
    const section=grid.closest('section');const head=section?.querySelector('.sec-title');if(head)head.textContent='五书资料精选';
    grid.replaceChildren();
    const requests=[['person','人物'],['org','组织'],['event','事件'],['place','地点']];
    const responses=await Promise.allSettled(requests.map(([type])=>window.HQZ.api.list(type,{page:1,page_size:1})));
    responses.forEach((result,index)=>{
      if(result.status!=='fulfilled'||!result.value.items?.length)return;
      const [type,label]=requests[index],item=result.value.items[0];
      const card=document.createElement('a');card.className='topic-card';card.href=`${{person:'person.html',event:'event.html',org:'org.html',place:'place.html'}[type]}?id=${encodeURIComponent(item.id)}`;
      const body=document.createElement('div');body.className='body';
      const heading=document.createElement('h4');heading.textContent=item.name||item.title||label;
      body.appendChild(heading);
      const summary=item.bio_short||item.summary||item.history||item.intro;
      if(summary){const p=document.createElement('p');p.textContent=summary;body.appendChild(p)}
      const tag=document.createElement('div');tag.className='count';tag.textContent=label;body.appendChild(tag);
      card.appendChild(body);grid.appendChild(card);
    });
    if(!grid.children.length)section?.remove();
  }

  const box=document.getElementById('worldMap');
  const mapSection=box?.closest('section.block');
  if(!state.mapPoints?.length){mapSection?.remove();return}
  if(!box||!window.echarts||!echarts.getMap('world')){mapSection?.remove();return}
  const chart=echarts.init(box);
  const points=state.mapPoints.map(item=>({name:item.name,value:[item.lng,item.lat,item.count||1]}));
  chart.setOption({backgroundColor:'transparent',tooltip:{trigger:'item',formatter:p=>p.name},geo:{map:'world',roam:true,itemStyle:{areaColor:'#efe6cf',borderColor:'#b6a37c',borderWidth:.6},emphasis:{itemStyle:{areaColor:'#e3d3ac'}}},series:[{type:'effectScatter',coordinateSystem:'geo',rippleEffect:{brushType:'stroke',scale:2.6},symbolSize:10,itemStyle:{color:'#6d4c24'},data:points}]});
  const legend=document.querySelector('.map-legend');if(legend)legend.textContent=`${state.mapPoints.length} 个可靠坐标地点`;
  addEventListener('resize',()=>chart.resize());
})();
