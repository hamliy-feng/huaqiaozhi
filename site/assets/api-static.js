(() => {
  const types=['person','org','event','place','topic'];
  const cache=new Map();
  const inFlight=new Map();
  const base='data/';
  const keyOf=(t,id)=>String(t)+'/'+String(id);
  async function load(url){
    if(cache.has(url))return cache.get(url);
    if(inFlight.has(url))return inFlight.get(url);
    const promise=fetch(url,{cache:'default'}).then(r=>{if(!r.ok)throw Error('数据读取失败 '+r.status+' '+url);return r.json()}).then(data=>{cache.set(url,data);return data}).finally(()=>inFlight.delete(url));
    inFlight.set(url,promise);return promise;
  }
  const idx=t=>t==='topic'?Promise.resolve([]):load(base+t+'-index.json');
  const sums=()=>load(base+'stats.json');
  async function list(type,params={}){
    let rows=[...await idx(type)];
    const q=String(params.q||params.query||'').trim().toLocaleLowerCase('zh-CN');
    if(q)rows=rows.filter(x=>[x.name,x.title,x.bio_short,x.summary,x.native_place_display,...(x.aliases||[]),...(x.display_tags||[])].some(s=>String(s||'').toLocaleLowerCase('zh-CN').includes(q)));
    if(params.type)rows=rows.filter(x=>String(x.type||x.type_label||'')===String(params.type));
    const sourceBook=(params.source_book||(type==='person'?new URLSearchParams(location.search).get('source_book'):'')||'').trim();
    if(sourceBook)rows=rows.filter(x=>String(x.source_book||'')===sourceBook);
    if(params.sort==='name')rows.sort((a,b)=>(a.name||a.title||'').localeCompare(b.name||b.title||'','zh'));
    const page=Math.max(1,Number(params.page)||1),size=Math.max(1,Math.min(200,Number(params.page_size)||20));
    return {items:rows.slice((page-1)*size,page*size),total:rows.length,page,page_size:size,meta:{source_mode:'teacher_preview'},data_mode:'teacher_preview'};
  }
  async function detail(t,id){
    if(t==='topic')return null;
    try{return await load(base+t+'/'+encodeURIComponent(id)+'.json')}catch(e){if(String(e).includes('404'))return null;throw e}
  }
  async function links(t,id){
    const all=await load(base+'links.json');
    const [p,o]=await Promise.all([idx('person'),idx('org')]);
    const [ev,pl]=await Promise.all([idx('event'),idx('place')]);
    const map={person:new Map(p.map(x=>[String(x.id),x])),org:new Map(o.map(x=>[String(x.id),x])),event:new Map(ev.map(x=>[String(x.id),x])),place:new Map(pl.map(x=>[String(x.id),x]))};
    return all.filter(l=>(l.subject_type===t&&String(l.subject_id)===String(id))||(l.object_type===t&&String(l.object_id)===String(id))).map(l=>{
      const direct=l.subject_type===t&&String(l.subject_id)===String(id);
      const otherType=direct?l.object_type:l.subject_type;
      const otherId=direct?l.object_id:l.subject_id;
      const other=map[otherType]?.get(String(otherId));
      if(!other)return null;
      return {...l,direction:direct?'direct':'reverse',other_type:otherType,other_id:otherId,other,subject:map[l.subject_type]?.get(String(l.subject_id)),object:map[l.object_type]?.get(String(l.object_id))};
    }).filter(Boolean);
  }
  async function evidence(t,id){return (await load(base+'sources.json'))[id]||[]}
  async function searchPage(q, selected=types,params={}){
    const wanted=selected.includes('all')?types:selected;
    const word=String(q||'').toLocaleLowerCase('zh-CN');
    const result=await Promise.all(wanted.filter(t=>t!=='topic').map(async t=>(await idx(t)).filter(x=>[x.name,x.title,x.bio_short,x.summary,x.native_place_display,...(x.aliases||[]),...(x.display_tags||[])].some(v=>String(v||'').toLocaleLowerCase('zh-CN').includes(word))).map(item=>({type:t,item,snippet:item.bio_short||item.summary||item.source_summary||''}))));
    const items=result.flat(); const page=Math.max(1,Number(params.page)||1),size=Math.max(1,Number(params.page_size)||20);
    return {items:items.slice((page-1)*size,page*size),total:items.length,page,page_size:size};
  }
  const api={
    source:'backend',mode:'teacher_preview',baseUrl:'static-data',status:{mode:'teacher_preview'},
    async ready(){await sums();return {source:'backend',mode:'teacher_preview'}},
    stats:sums,list,detail,links,evidence,async evidenceDetail(){return null},
    searchPage,async search(q,ts,params){return (await searchPage(q,ts,params)).items},
    async mapPoints(){return []},async hotwords(){return []},async pageModules(){return []},
    async findPersonByName(name){return (await list('person',{q:name})).items[0]||null},
    async personsByNativePlace(name){const place=(await list('place',{q:name})).items[0]||null;return{place,persons:[]}},
    async bootstrap(page){
      const stats=await sums();
      return {source:'backend',mode:'teacher_preview',stats,mapPoints:[],hotwords:[],modules:[],status:{mode:'teacher_preview'},meta:{presentation_profile:'final_showcase_v1'}};
    }
  };
  window.HQZ=Object.freeze({api,types,adapter:window.HQZ_API_ADAPTER||{},schemas:window.HQZ_OBJECT_SCHEMAS?.schemas||{},contractVersion:'hqz-static-v1'});
})();
