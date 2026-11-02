(function(){
 const t={person:'人物',org:'组织',place:'城市',event:'事件'};
 let rows=[];
 const $=id=>document.getElementById(id);
 const el=(tag,cls,str)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(str!==undefined)e.textContent=str;return e};
 function show(){
  const q=$('q').value.toLowerCase().trim(),kind=$('kind').value,stat=$('stat').value;
  const matches=rows.filter(x=>(!kind||x.type===kind)&&(!q||(x.name+' '+x.id).toLowerCase().includes(q))&&(!stat||(stat==='ready'?(x.status==='ready'):(x.status!=='ready'))));
  $('count').textContent='共 '+rows.length+' 条 · 当前 '+matches.length+' 条 · 已入站 '+rows.filter(x=>x.status==='ready').length+' 张';
  const f=document.createDocumentFragment();
  matches.forEach(x=>{
   const card=el('article','item'),box=x.photo?el('img','pic'):el('div','pic',t[x.type][0]);
   if(x.photo){box.src=x.photo;box.loading='lazy';box.alt=x.name}
   const body=el('div','body'),name=el('div','name',x.name),id=el('div','id',t[x.type]+' · '+x.id+' · '+(x.status==='ready'?'已入站':'待补图'));
   const links=el('div','links'),search=el('a','', '搜索图片');search.href=x.search||'https://www.google.com/search?tbm=isch&q='+encodeURIComponent(x.name);search.target='_blank';search.rel='noopener';links.append(search);
   if(x.source){let src=el('a','', '图片来源');src.href=x.source;src.target='_blank';src.rel='noopener';links.append(src)}
   body.append(name,id,links);card.append(box,body);f.append(card);
  });
  $('items').replaceChildren(f);
 }
 Promise.resolve().then(()=>fetch('assets/media-tasks-public.json')).then(r=>r.json()).then(data=>{rows=data;show()}).catch(()=>{$('count').textContent='加载失败'});
 ['q','kind','stat'].forEach(id=>$(id).addEventListener('input',show));
})();