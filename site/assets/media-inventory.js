(function(){
 const types={person:'人物',org:'组织',place:'城市',event:'事件'};
 let rows=[];
 const $=id=>document.getElementById(id);
 const el=(tag,cls,str)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(str!==undefined)e.textContent=str;return e};
 const isReal=x=>!!x.photo && x.media_kind!=='editorial_card' && x.type!=='event';
 const status=x=>x.type==='event'?'不配图':isReal(x)?'真实来源图片':x.media_kind==='editorial_card'?'档案图卡（非历史照片）':'暂无可核实图片';
 function show(){
  const q=$('q').value.toLowerCase().trim(),kind=$('kind').value,stat=$('stat').value;
  const select=x=>stat==='real'?isReal(x):stat==='editorial_card'?x.media_kind==='editorial_card':
   stat==='missing'?x.type!=='event'&&!x.photo:stat==='not_applicable'?x.type==='event':true;
  const matches=rows.filter(x=>(!kind||x.type===kind)&&(!q||(x.name+' '+x.id).toLowerCase().includes(q))&&select(x));
  const real=rows.filter(isReal).length,cards=rows.filter(x=>x.media_kind==='editorial_card').length;
  const missing=rows.filter(x=>x.type!=='event'&&!x.photo).length;
  $('count').textContent='共 '+rows.length+' 个对象 · 当前 '+matches.length+' 个 · 真实来源图片 '+real+' · 档案图卡 '+cards+' · 缺图 '+missing+' · 事件不配图 '+rows.filter(x=>x.type==='event').length;
  const f=document.createDocumentFragment();
  matches.forEach(x=>{
   const card=el('article','item'),box=x.photo?el('img','pic'):el('div','pic',types[x.type][0]);
   if(x.photo){box.src=x.photo;box.loading='lazy';box.alt=x.name}
   const body=el('div','body'),name=el('div','name',x.name),id=el('div','id',types[x.type]+' · '+x.id+' · '+status(x));
   const links=el('div','links');
   if(x.type!=='event'){
    const search=el('a','','搜索图片');search.href=x.search||'https://www.google.com/search?tbm=isch&q='+encodeURIComponent(x.name);search.target='_blank';search.rel='noopener';links.append(search);
   }
   if(x.source){let src=el('a','','图片来源');src.href=x.source;src.target='_blank';src.rel='noopener';links.append(src)}
   body.append(name,id,links);card.append(box,body);f.append(card);
  });
  $('items').replaceChildren(f);
 }
 fetch('assets/media-tasks-public.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()})
 .then(data=>{rows=data;show()}).catch(()=>{$('count').textContent='加载失败'});
 ['q','kind','stat'].forEach(id=>$(id).addEventListener('input',show));
})();