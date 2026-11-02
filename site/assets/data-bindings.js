(() => {
  const pageToType={person:'person',event:'event',org:'org',place:'place',topic:'topic'};
  const objectSchemas=window.HQZ_OBJECT_SCHEMAS?.schemas||{};
  const hrefByType={person:'person.html',event:'event.html',org:'org.html',place:'place.html',topic:'topic.html'};
  const typeLabel={person:'人物',event:'事件',org:'组织',place:'地点',topic:'专题'};
  const PUBLIC_SEARCH_TYPES=['person','event','org','place','topic'];
  const EMPTY_TEXT='暂无数据';
  const titleOf=x=>x?.name||x?.title||'';
  const itemsOf=response=>Array.isArray(response)?response:(Array.isArray(response?.items)?response.items:[]);
  const empty=el=>{while(el?.firstChild)el.removeChild(el.firstChild)};
  const text=(tag,value,className)=>{const el=document.createElement(tag);if(className)el.className=className;el.textContent=value??'';return el};
  const hasValue=value=>value!==null&&value!==undefined&&value!==''&&(!Array.isArray(value)||value.length);
  const mode=()=>window.HQZ?.api?.mode||'public';
  const isShowcase=()=>document.body.dataset.presentationProfile==='final_showcase_v1';
  const statusText=item=>{
    if(isShowcase())return '';
    if(mode()==='public')return '已公开';
    const reviewStatus=String(item?.review_status||item?.data_status||'').toLowerCase();
    if(item?.scope_review_required&&mode()==='teacher_preview')return reviewStatus==='candidate'||reviewStatus==='needs_review'?'候选 · 范围待审核':'范围待审核';
    if(item?.possible_same)return '候选 · 可能同一实体 · 待消歧';
    if(reviewStatus==='candidate'||reviewStatus==='needs_review'||item?.data_status==='candidate')return '候选 · 待审核';
    if(reviewStatus==='reviewed_internal')return '内部审核';
    if(item?.uncertainty_status==='evidence_insufficient')return '证据不足';
    if(item?.uncertainty_status==='disputed')return '有争议';
    return '待审核';
  };
  const precisionText=value=>({
    day:'精确到日',month:'精确到月',year:'精确到年',
    day_candidate:'日期候选',month_candidate:'月份候选',year_candidate:'年份候选',
    approximate:'约',coarse:'粗略时间',unknown:'精度不详'
  }[value]||'精度待确认');
  function showEmpty(container,message=EMPTY_TEXT){
    if(!container)return;
    empty(container);
    const node=text('div',message,'empty-state muted');node.dataset.emptyState='';node.setAttribute('role','status');container.appendChild(node);
  }
  function showLoading(container,message='正在加载真实五书数据…'){
    if(!container)return;
    empty(container);
    const node=text('div',message,'loading-state muted');node.setAttribute('role','status');node.setAttribute('aria-busy','true');container.appendChild(node);
  }
  function showError(container,error){
    showEmpty(container,`数据请求失败：${String(error?.message||error||'未知错误')}`);
    container?.querySelector('[data-empty-state]')?.classList.add('error-state');
  }
  function addImage(parent,item,kind='image'){
    const value=item?.portrait?.render_url||item?.emblem?.render_url||item?.emblem||item?.cover?.render_url||item?.cover||item?.scan_preview||item?.image?.render_url;
    if(!value)return null;
    try{
      const url=new URL(value,location.href);
      if(!['http:','https:'].includes(url.protocol)&&!String(value).startsWith('/api/'))return null;
      const img=document.createElement('img');img.src=value;img.alt=`${titleOf(item)}${kind}`;parent.appendChild(img);return img;
    }catch{return null}
  }
  function chipRow(values=[]){
    const row=document.createElement('div');row.className='chip-row';
    values.filter(hasValue).forEach(value=>row.appendChild(text('span',String(value),'chip')));
    return row;
  }
  function definitionGrid(entries=[]){
    const grid=document.createElement('div');grid.className='definition-grid';
    entries.filter(([,value])=>hasValue(value)).forEach(([label,value])=>{
      const cell=document.createElement('div');cell.append(text('b',label),document.createTextNode(String(value)));grid.appendChild(cell);
    });
    return grid;
  }
  function statusRow(item){
    const values=[statusText(item)];
    if(item?.uncertainty_status==='disputed')values.push('有争议');
    if(item?.uncertainty_status==='evidence_insufficient')values.push('证据不足');
    if(item?.possible_same)values.push('possible_same');
    return chipRow(values);
  }
  function buildRecord(type,item){
    const article=document.createElement('article');article.className=`record-item ${type==='event'||type==='org'?'landscape':''}`;article.dataset.entityId=item.id;
    const media=addImage(article,item);if(!media)article.classList.add('no-media');
    const copy=document.createElement('div');copy.appendChild(text('h3',titleOf(item)));
    const displayType=item.type_label||(type==='org'||type==='place'?item.type:null);
    const personTags=type==='person'?(item.display_tags||item.tags||item.occupation||[]).slice(0,2):[];
    const recordChips=(type==='person'?[...personTags]:[statusText(item),...(item.tags||item.occupation||[]).slice(0,2),displayType]).filter(hasValue);
    if(recordChips.length)copy.appendChild(chipRow(recordChips));
    const summary=item.bio_short||item.summary||item.purpose||item.intro||item.subtitle||item.history;
    if(summary)copy.appendChild(text('p',summary));
    article.appendChild(copy);return article;
  }
  function resolveOther(type,id,link){
    if(link.other_type&&link.other_id)return {type:link.other_type,item:link.other,id:link.other_id,direction:link.direction};
    if(link.subject_type===type&&String(link.subject_id)===String(id))return {type:link.object_type,item:link.object,id:link.object_id,direction:'direct'};
    return {type:link.subject_type,item:link.subject,id:link.subject_id,direction:'reverse'};
  }
  async function buildRelationsPanel(type,id,options={}){
    const links=await window.HQZ.api.links(type,id);
    if(!links.length)return null;
    const panel=document.createElement('article');panel.className='panel';panel.dataset.backendRelated='';
    const familyCodes=new Set(['spouse','father','mother','son','daughter','brother','sister','grandfather','grandmother','relative']);
    const isFamily=link=>type==='person'&&(link.relation_group==='family'||familyCodes.has(link.relation)||familyCodes.has(link.predicate));
    const displayLinks=isShowcase()?links.filter(link=>{const other=resolveOther(type,id,link);return Boolean(titleOf(other.item)&&other.type&&other.id)}):links;
    const family=displayLinks.filter(isFamily),general=displayLinks.filter(link=>!isFamily(link));
    const heading=type==='org'&&options.contentMaturity==='valid_sparse'?'已核关系（稀疏数据）':family.length&&!general.length?'家庭关系':'相关人物、组织、事件、地点与专题';
    panel.appendChild(text('h2',heading,'subheading'));
    const appendGroup=(label,rows)=>{
      if(!rows.length)return;
      if(family.length&&general.length)panel.appendChild(text('h3',label,'relation-section-title'));
      const grid=document.createElement('div');grid.className='relation-grid';
      rows.forEach(link=>{
        const other=resolveOther(type,id,link);
        const resolvedTitle=titleOf(other.item);
        const canLink=Boolean(resolvedTitle&&other.type&&hrefByType[other.type]&&other.id);
        const card=document.createElement(canLink?'a':'div');card.className='relation-card';
        if(canLink)card.href=`${hrefByType[other.type]}?id=${encodeURIComponent(other.id)}`;
        addImage(card,other.item||{});
        const relationLabel=other.direction==='reverse'?link.inverse_relation_label:link.relation_label;
        card.append(text('strong',resolvedTitle||'关系对象尚未解引用，待后端补充'));
        const relationMeta=[relationLabel,typeLabel[other.type]].filter(Boolean).join(' · ');
        if(relationMeta)card.appendChild(text('small',relationMeta));
        if(!isShowcase()){
          if(other.direction==='direct'&&!link.relation_label)card.appendChild(text('small','关系标签未投影','relation-audit muted'));
          if(other.direction==='reverse'&&!link.inverse_relation_label)card.appendChild(text('small','反向关系标签未投影','relation-audit muted'));
          if(!resolvedTitle)card.appendChild(text('small','审查提示：关系只有 ID，未返回目标名称','relation-audit muted'));
          if(link.role&&link.role!==relationLabel)card.appendChild(text('small',`角色：${link.role}`,'relation-role muted'));
          const evidenceCount=Array.isArray(link.evidence_ids)?link.evidence_ids.length:0;
          if(window.HQZ_HIDE_PROVENANCE===false&&link.source_summary)card.appendChild(text('p',link.source_summary,'relation-source muted'));
          card.appendChild(text('small',`${statusText(link)}${evidenceCount?` · 证据 ${evidenceCount} 条`:''}`,'relation-audit muted'));
        }
        grid.appendChild(card);
      });
      panel.appendChild(grid);
    };
    appendGroup('家庭关系',family);appendGroup('其他关联',general);
    return panel;
  }
  function evidenceBelongsTo(item,type,id){
    if(!item)return false;
    if(item.entity_type&&item.entity_id)return item.entity_type===type&&String(item.entity_id)===String(id);
    if(Array.isArray(item.entity_ids))return item.entity_ids.some(value=>String(value)===String(id));
    return false;
  }
  async function buildEvidencePanel(type,id){
    if(window.HQZ_HIDE_PROVENANCE!==false)return null;
    const query=new URLSearchParams(location.search);
    const preferredId=String(query.get('id')||'')===String(id)?query.get('evidence'):null;
    const requests=[window.HQZ.api.evidence(type,id)];
    if(preferredId)requests.push(window.HQZ.api.evidenceDetail(preferredId));
    const settled=await Promise.allSettled(requests);
    if(settled[0].status==='rejected'){
      const failed=document.createElement('article');failed.className='panel evidence-panel evidence-error';failed.id='evidence';
      failed.append(text('h2','来源与依据','subheading'),text('p','来源与依据暂时无法加载，核心内容仍可查看。','muted'));
      return failed;
    }
    const rows=[...(settled[0].value||[])];
    if(preferredId&&settled[1]?.status==='fulfilled'&&evidenceBelongsTo(settled[1].value,type,id)&&!rows.some(item=>item.id===preferredId))rows.unshift(settled[1].value);
    if(!rows.length)return null;
    if(isShowcase()){
      const panel=document.createElement('article');panel.className='panel evidence-panel';panel.id='evidence';
      panel.appendChild(text('h2','来源','subheading'));
      const list=document.createElement('div');list.className='showcase-source-list';
      rows.slice(0,8).forEach(item=>{
        const entry=document.createElement('div');entry.className='showcase-source-item';
        const locator=[hasValue(item.printed_page)?`页 ${item.printed_page}`:null,hasValue(item.source_page)&&!hasValue(item.printed_page)?`来源页 ${item.source_page}`:null].filter(Boolean).join(' · ');
        entry.appendChild(text('strong',[item.book_title,locator].filter(Boolean).join(' · ')||'五书来源'));
        if(type!=='person'&&item.statement)entry.appendChild(text('p',item.statement,'muted'));
        list.appendChild(entry);
      });
      panel.appendChild(list);return panel;
    }
    const panel=document.createElement('article');panel.className='panel evidence-panel';panel.id='evidence';
    panel.appendChild(text('h2','来源与依据','subheading'));
    const list=document.createElement('div');list.className='evidence-list';
    rows.forEach(item=>{
      const details=document.createElement('details');details.className='evidence-card';
      details.dataset.evidenceId=item.id||'';
      if(preferredId&&item.id===preferredId)details.open=true;
      const summary=document.createElement('summary');
      const locator=[hasValue(item.printed_page)?`印刷页 ${item.printed_page}`:null,hasValue(item.source_page)?`来源页 ${item.source_page}`:null].filter(Boolean).join(' · ');
      summary.append(text('strong',`查看依据 · ${item.book_title||item.id}`));
      if(locator)summary.appendChild(text('span',locator,'muted'));
      details.appendChild(summary);
      const meta=definitionGrid([
        ['章节',item.chapter_title||item.chapter],
        ['证据状态',item.evidence_status||item.review_status],
        ['稳定页标识',item.stable_page_id],
        ['文本版本',item.text_version_id],
        ['文本块',item.text_block_id],
        ['高亮起点',item.highlight?.char_start??item.char_start],
        ['高亮终点',item.highlight?.char_end??item.char_end]
      ]);
      if(meta.children.length)details.appendChild(meta);
      if(item.statement)details.appendChild(text('p',item.statement,'summary'));
      if(item.ocr_snippet){
        const quote=document.createElement('blockquote');quote.className='ocr-box evidence-snippet';quote.textContent=item.ocr_snippet;
        const highlightStart=item.highlight?.char_start??item.char_start;
        const highlightEnd=item.highlight?.char_end??item.char_end;
        if(highlightStart!=null)quote.dataset.highlightStart=highlightStart;
        if(highlightEnd!=null)quote.dataset.highlightEnd=highlightEnd;
        details.appendChild(quote);
      }
      list.appendChild(details);
    });
    panel.appendChild(list);return panel;
  }
  function buildSourcePanel(item){
    if(window.HQZ_HIDE_PROVENANCE!==false)return null;
    if(isShowcase())return null;
    if(!item.source_summary&&!item.review_status)return null;
    const panel=document.createElement('article');panel.className='info-card validation-card';
    const copy=document.createElement('div');
    copy.appendChild(text('h2','数据来源与状态','subheading'));
    if(item.source_summary)copy.appendChild(text('div',item.source_summary,'source-list'));
    const audit=definitionGrid([
      ['审核状态',item.review_status||item.data_status],
      ['范围状态',item.scope_status||item.organization_scope_status],
      ['前端可见',item.frontend_visible===false?'否':item.frontend_visible===true?'是':null],
      ['证据数量',Array.isArray(item.evidence_ids)?item.evidence_ids.length:null],
      ['数据版本',item.record_version||item.data_version||item.schema_version]
    ]);
    if(audit.children.length)copy.appendChild(audit);
    panel.append(copy,text('div',statusText(item),'status-stamp'));return panel;
  }
  function dated(value,precision){return hasValue(value)?`${value}${precision?`（${precisionText(precision)}）`:''}`:null}
  function yearPart(value){const match=String(value||'').match(/\d{4}/);return match?match[0]:''}
  function personLifeSpan(item){
    if(item.life_span){const years=String(item.life_span).match(/\d{4}/g)||[];return years.length>=2?`${years[0]}-${years[1]}`:years.length===1?`${years[0]}-`:String(item.life_span)}
    const birth=yearPart(item.birth_year),death=yearPart(item.death_year);return birth&&death?`${birth}-${death}`:birth?`${birth}-`:death?`-${death}`:'';
  }
  function personNativeDisplay(item){
    return item.native_place?.full_text||item.native_place_display||item.native_place_text?.[0]||[item.native_province,item.native_prefecture,item.native_county_city,item.native_town_village].filter(Boolean).join('');
  }
  function formatTimelineDate(value){
    const raw=String(value||'').trim();if(!raw||raw==='时间未详'||raw==='未知')return '某年';
    let match=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(match)return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
    match=raw.match(/^(\d{4})-(\d{1,2})$/);if(match)return `${match[1]}年${Number(match[2])}月`;
    match=raw.match(/^(\d{4})$/);if(match)return `${match[1]}年`;return raw;
  }
  function detailEntries(type,item){
    if(type==='person')return [
      ['性别',item.gender],
      ['侨居地',item.residence_texts?.join(' → ')],
      ['共享人物组',item.shared_profile_group_id?'多人共同资料已拆分':null]
    ];
    if(type==='event')return [
      ['开始时间',dated(item.date_start,item.date_precision)],['结束时间',dated(item.date_end,item.date_precision)],['类型',item.type_label],
      ['参与角色',item.participant_roles?.map(value=>typeof value==='string'?value:(value.role_label||value.role_code||value.role)).filter(Boolean).join('、')]
    ];
    if(type==='org')return [
      ['类型',item.type_label||item.type],...(isShowcase()?[]:[['内容成熟度',item.content_maturity]]),['成立',dated(item.founded,item.founded_precision)],['解散',dated(item.dissolved,item.dissolved_precision)],
      ['地点文本',item.location_texts?.join('、')],['宗旨',item.purpose]
    ];
    if(type==='place')return [
      ['地点类型',item.type_label||item.type],['行政级别',item.admin_level],['国家/地区',item.country],['省级',item.province_name],['市级',item.city_name],
      ['区县级',item.district_county_name],['行政路径',item.admin_path?.join(' → ')],
      ['坐标',item.lat!=null&&item.lng!=null?`${item.lat}, ${item.lng}`:null],['空间精度',item.spatial_precision]
    ];
    if(type==='topic')return [
      ['主题类型',item.theme_label],['主题代码',item.theme_code],['选择依据',item.selection_rationale],['关联内容数量',item.linked_content_ids?.length]
    ];
    return [];
  }
  function buildOverview(type,item){
    const panel=document.createElement('article');panel.className='panel detail-hero';
    const body=document.createElement('div');
    if(type==='person'){
      const hero=document.createElement('div');hero.className='person-v2-hero';
      const portraitBox=document.createElement('div');portraitBox.className='person-v2-portrait';
      const portrait=addImage(portraitBox,item,'人物肖像');
      if(!portrait){portraitBox.classList.add('portrait-empty');portraitBox.appendChild(text('span',(titleOf(item)||'人').slice(0,1),'portrait-initial'));}
      const body=document.createElement('div');body.className='person-v2-headcopy';
      const titleLine=document.createElement('div');titleLine.className='person-title-line';
      titleLine.append(text('h2',titleOf(item),'detail-name'));
      const life=personLifeSpan(item);if(life)titleLine.append(text('span',life,'person-life-span'));
      body.append(titleLine);
      if(!isShowcase())body.appendChild(statusRow(item));
      const displayTags=(item.display_tags||[]).filter(Boolean).slice(0,6);
      if(displayTags.length){const tags=chipRow(displayTags);tags.classList.add('person-display-tags');body.appendChild(tags);}
      const aliases=(item.aliases||[]).map(value=>typeof value==='string'?value:(value?.alias||value?.name||value?.label)).filter(Boolean);
      const meta=[];
      const native=personNativeDisplay(item);if(native)meta.push(['籍贯',native]);
      if(item.residence_texts?.length)meta.push(['侨居',item.residence_texts.join('、')]);
      if(aliases.length)meta.push(['别名',aliases.join('、')]);
      const metaGrid=definitionGrid(meta);if(metaGrid.children.length){metaGrid.classList.add('person-v2-meta');body.appendChild(metaGrid);}
      hero.append(portraitBox,body);panel.appendChild(hero);

      const paragraphs=Array.isArray(item.bio_paragraphs)?item.bio_paragraphs:[];
      const bioSection=document.createElement('section');bioSection.className='person-bio-section';
      bioSection.appendChild(text('h3','人物生平','subheading'));
      if(paragraphs.length){
        const prose=document.createElement('div');prose.className='person-bio-prose';
        paragraphs.forEach(entry=>{const p=text('p',entry.text||entry,'person-bio-paragraph');prose.appendChild(p)});
        bioSection.appendChild(prose);
      }else if(item.bio_full||item.bio_short){bioSection.appendChild(text('p',item.bio_full||item.bio_short,'summary person-bio-paragraph'));}
      panel.appendChild(bioSection);
      return panel;
    }
    body.append(text('h2',titleOf(item),'detail-name'));if(!isShowcase())body.appendChild(statusRow(item));
    const aliases=(item.aliases||[]).map(value=>typeof value==='string'?value:(value?.alias||value?.name||value?.label)).filter(Boolean);
    const historicalNames=(item.historical_names||[]).map(value=>typeof value==='string'?value:(value?.alias||value?.name||value?.label)).filter(Boolean);
    if(aliases.length)body.appendChild(chipRow(['别名',...aliases]));
    if(historicalNames.length)body.appendChild(chipRow(['历史名称',...historicalNames]));
    const grid=definitionGrid(detailEntries(type,item));if(grid.children.length)body.appendChild(grid);
    const summary=item.content||item.history||item.intro||item.curator_note||item.summary||item.purpose;
    if(summary){const labels={event:'事件正文',org:'组织概况',place:'地点简介',topic:'策展说明'};body.append(text('h3',labels[type]||'内容摘要','subheading'),text('p',summary,'summary'));}
    const photo=item?.cover_url;
    if(photo && type!=='person'){
      const figure=document.createElement('figure');figure.className='hqz-detail-cover';
      const img=document.createElement('img');img.src=photo;img.alt=titleOf(item)+'相关图片';img.loading='lazy';
      figure.appendChild(img);panel.insertBefore(figure,panel.firstChild);
    }
    panel.appendChild(body);return panel;
  }
  function buildPersonHighlights(item){
    if(!item||!isShowcase())return [];
    const panels=[];
    const affiliations=Array.isArray(item.affiliations)?item.affiliations.filter(Boolean):[];
    const welfare=Array.isArray(item.public_welfare_highlights)?item.public_welfare_highlights.filter(Boolean):[];
    const honors=Array.isArray(item.honors)?item.honors.map(value=>typeof value==='string'?value:(value?.name||value?.label)).filter(Boolean):[];
    if(affiliations.length||welfare.length){
      const panel=document.createElement('article');panel.className='panel person-highlight-panel';
      panel.appendChild(text('h2','事业与组织','subheading'));
      const list=document.createElement('div');list.className='person-highlight-list';
      [...affiliations,...welfare].filter((value,index,array)=>array.indexOf(value)===index).slice(0,6).forEach(value=>list.appendChild(text('p',value,'person-highlight-item')));
      panel.appendChild(list);panels.push(panel);
    }
    if(honors.length){
      const panel=document.createElement('article');panel.className='panel person-highlight-panel';
      panel.appendChild(text('h2','荣誉','subheading'));
      const list=document.createElement('div');list.className='person-highlight-list';
      honors.slice(0,6).forEach(value=>list.appendChild(text('p',value,'person-highlight-item')));
      panel.appendChild(list);panels.push(panel);
    }
    if(panels.length===2){
      const wrap=document.createElement('div');wrap.className='person-highlight-grid';wrap.append(...panels);return [wrap];
    }
    return panels;
  }
  function buildTimeline(item,type){
    const timeline=Array.isArray(item.timeline)?item.timeline:[];
    if(!timeline.length)return null;
    const panel=document.createElement('article');panel.className='panel';panel.appendChild(text('h2',type==='org'?'组织概况':'生平时间轴','subheading'));
    const host=document.createElement('div');host.className='timeline';
    timeline.filter(entry=>hasValue(entry.date||entry.year)&&hasValue(entry.title||entry.summary)).forEach(entry=>{
      const row=document.createElement('div');row.className='timeline-item';
      row.append(text('span',formatTimelineDate(entry.date||entry.year),'timeline-year'),text('i','','timeline-dot'));
      const copy=document.createElement('div');copy.className='timeline-copy';copy.append(text('strong',entry.display_title||entry.title||entry.summary));
      if(entry.summary||entry.content)copy.appendChild(text('p',entry.summary||entry.content));row.appendChild(copy);host.appendChild(row);
    });
    panel.appendChild(host);return panel;
  }
  async function renderDetail(type,item,host){
    empty(host);
    host.dataset.objectType=type;
    host.dataset.schemaModules=(objectSchemas[type]?.modules||[]).join(',');
    host.appendChild(buildOverview(type,item));
    if(type==='org'){
      const mentioned=(item.mentioned_people||[]);
      if(mentioned.length){
        const p=document.createElement('article');p.className='panel';
        p.appendChild(text('h2','人物传记中的相关记载','subheading'));
        p.appendChild(text('p','以下人物生平正文出现过该机构全称；仅为文字提及，不代表已经确认会员或任职关系。','hqz-index-note'));
        const list=document.createElement('div');list.className='hqz-org-mention';
        mentioned.forEach(m=>{const a=document.createElement('a');a.href='person.html?id='+encodeURIComponent(m.id);a.append(text('strong',m.name),text('small','查看人物生平 →'));list.appendChild(a)});
        p.appendChild(list);host.appendChild(p);
      }
    }
    const timeline=buildTimeline(item,type);if(timeline)host.appendChild(timeline);
    if(type==='person')buildPersonHighlights(item).forEach(panel=>host.appendChild(panel));
    const maturity=item.content_maturity||null;
    const relationRequest=buildRelationsPanel(type,item.id,{contentMaturity:maturity});
    const [relationState,evidenceState]=await Promise.allSettled([relationRequest,buildEvidencePanel(type,item.id)]);
    if(relationState.status==='fulfilled'&&relationState.value)host.appendChild(relationState.value);
    if(relationState.status==='rejected'){
      const panel=document.createElement('article');panel.className='panel module-error';
      panel.append(text('h2','关系','subheading'),text('p','关系模块暂时无法加载，待后端接口恢复。','muted'));host.appendChild(panel);
    }
    if(evidenceState.status==='fulfilled'&&evidenceState.value)host.appendChild(evidenceState.value);
    const source=buildSourcePanel(item);if(source)host.appendChild(source);
    if(location.hash==='#evidence'){
      const evidenceId=new URLSearchParams(location.search).get('evidence');
      const target=evidenceId?host.querySelector(`[data-evidence-id="${CSS.escape(evidenceId)}"]`):host.querySelector('#evidence');
      target?.scrollIntoView({block:'start'});
    }
  }
  function updateResultMeta(total,label='条真实记录'){
    const target=document.querySelector('.result-meta span,.section-desc');
    if(target)target.textContent=`共 ${Number(total||0).toLocaleString('zh-CN')} ${label}`;
  }
  function renderPagination(container,response,onPage){
    if(!container)return;
    empty(container);
    const pages=Math.max(1,Math.ceil((response.total||0)/(response.page_size||20)));
    for(let value=1;value<=Math.min(pages,7);value++){
      const button=text('button',String(value),'page-no'+(value===response.page?' active':''));button.type='button';
      button.addEventListener('click',()=>onPage(value));container.appendChild(button);
    }
  }
  function filterParams(form,page=1){
    const input=form?.querySelector('input');
    const selects=[...(form?.querySelectorAll('select')||[])];
    const params={page,page_size:20};
    if(input?.value.trim())params.q=input.value.trim();
    const typed=selects.find(select=>select.value&&!select.value.startsWith('全部')&&!select.value.startsWith('排序'));
    if(typed){
      /* 人物页的“相关度/姓名”是排序控件；组织、事件筛选才使用 type。 */
      if(typed.name==='sort'){
        if(typed.value!=='relevance')params.sort=typed.value;
      }else params.type=typed.value;
    }
    return params;
  }
  async function bindMasterDetail(type){
    const list=document.querySelector('.record-list'),detailHost=document.querySelector('.master-detail>.detail-stack'),pagination=document.querySelector('.list-panel .pagination');
    const form=document.querySelector('.filter-panel');
    if(!list||!detailHost)return;
    let currentPage=1;
    async function load(page=1){
      currentPage=page;showLoading(list);showLoading(detailHost);
      try{
        const response=await window.HQZ.api.list(type,filterParams(form,page));const items=itemsOf(response);updateResultMeta(response.total);
        if(!items.length){showEmpty(list,'暂无符合条件的数据');showEmpty(detailHost,'当前数据模式暂无详情');renderPagination(pagination,response,load);return}
        empty(list);
        items.forEach((item,index)=>{
          const card=buildRecord(type,item);if(index===0)card.classList.add('active');
          card.addEventListener('click',async()=>{
            list.querySelectorAll('.record-item').forEach(node=>node.classList.remove('active'));card.classList.add('active');
            history.replaceState(null,'',location.pathname+'?id='+encodeURIComponent(item.id));
            showLoading(detailHost,'正在加载详情与证据…');
            try{const detail=await window.HQZ.api.detail(type,item.id);if(detail)await renderDetail(type,detail,detailHost);else showEmpty(detailHost)}
            catch(error){showError(detailHost,error)}
          });
          list.appendChild(card);
        });
        renderPagination(pagination,response,load);
        const id=new URLSearchParams(location.search).get('id');
        const first=id?await window.HQZ.api.detail(type,id):await window.HQZ.api.detail(type,items[0].id);
        if(first)await renderDetail(type,first,detailHost);else showEmpty(detailHost,'记录不存在或不可见');
      }catch(error){showError(list,error);showError(detailHost,error)}
    }
    form?.querySelector('.btn-primary')?.removeAttribute('data-demo');
    form?.addEventListener('submit',event=>{event.preventDefault();load(1)});
    form?.querySelector('.btn-primary')?.addEventListener('click',event=>{event.preventDefault();load(1)});
    form?.querySelector('[data-reset]')?.addEventListener('click',()=>setTimeout(()=>load(1)));
    await load(currentPage);
  }
  async function bindPlaces(){
    const grid=document.querySelector('.city-grid'),detailHost=document.querySelector('.wrap.detail-stack'),form=document.querySelector('.filter-panel');
    if(!grid||!detailHost)return;
    async function load(){
      showLoading(grid);showLoading(detailHost);
      try{
        const response=await window.HQZ.api.list('place',{...filterParams(form,1),page_size:200});const items=itemsOf(response);updateResultMeta(response.total);
        if(!items.length){showEmpty(grid,'暂无地点数据');showEmpty(detailHost);return}
        empty(grid);
        items.forEach(item=>{
          const card=document.createElement('button');card.type='button';card.className='city-card';card.appendChild(text('strong',titleOf(item)));
          const placeMeta=[item.country,item.type_label||item.type].filter(Boolean).join(' · ');if(placeMeta)card.appendChild(text('small',placeMeta));
          card.addEventListener('click',async()=>{history.replaceState(null,'',location.pathname+'?id='+encodeURIComponent(item.id));const detail=await window.HQZ.api.detail('place',item.id);if(detail)await renderDetail('place',detail,detailHost);});grid.appendChild(card);
        });
        const id=new URLSearchParams(location.search).get('id');
        const selected=id?await window.HQZ.api.detail('place',id):items[0];
        if(selected)await renderDetail('place',selected,detailHost);else showEmpty(detailHost,'地点不存在或不可见');
      }catch(error){showError(grid,error);showError(detailHost,error)}
    }
    form?.querySelector('.btn-primary')?.removeAttribute('data-demo');
    form?.addEventListener('submit',event=>{event.preventDefault();load()});
    form?.querySelector('[data-reset]')?.addEventListener('click',()=>{setTimeout(()=>load(),0)});
    await load();
  }
  async function bindTopics(){
    const grid=document.querySelector('.topic-grid'),detailSection=document.querySelector('.topic-detail-hero'),storyWrap=[...document.querySelectorAll('.section .wrap')].find(w=>w.querySelector('.story-chapter'));
    if(!grid)return;
    showLoading(grid);
    try{
      const response=await window.HQZ.api.list('topic',{page:1,page_size:50,sort:'sort_weight'});const items=itemsOf(response);
      if(!items.length){showEmpty(grid,'暂无由真实五书数据驱动的专题');detailSection?.closest('.section')?.remove();if(storyWrap)showEmpty(storyWrap);return}
      empty(grid);
      items.forEach(item=>{
        const card=document.createElement('article');card.className='topic-card';card.dataset.entityId=item.id;
        const frame=document.createElement('div');frame.className='media-frame';addImage(frame,item,'专题封面');
        const copy=document.createElement('div');copy.className='media-copy';copy.append(text('span',statusText(item),'eyebrow'),text('h3',titleOf(item)));if(item.subtitle||item.curator_note)copy.appendChild(text('p',item.subtitle||item.curator_note,'muted'));card.append(frame,copy);
        card.addEventListener('click',()=>renderTopic(item));grid.appendChild(card);
      });
      async function renderTopic(item){
        if(detailSection){empty(detailSection);const copy=document.createElement('div');copy.className='topic-detail-copy';copy.append(text('span',statusText(item),'eyebrow'),text('h2',titleOf(item)),text('p',item.curator_note||item.subtitle||''));detailSection.appendChild(copy)}
        if(storyWrap){
          empty(storyWrap);storyWrap.appendChild(text('h2','专题关联条目','section-title'));
          const relation=await buildRelationsPanel('topic',item.id),evidence=await buildEvidencePanel('topic',item.id);
          if(relation)storyWrap.appendChild(relation);else storyWrap.appendChild(text('p','暂无真实 entity_links','muted'));
          if(evidence)storyWrap.appendChild(evidence);
        }
      }
      const id=new URLSearchParams(location.search).get('id');
      const selected=id?await window.HQZ.api.detail('topic',id):items[0];
      if(selected)await renderTopic(selected);
      else{
        if(detailSection){empty(detailSection);detailSection.appendChild(text('div','专题不存在或不可见','empty-state muted'))}
        if(storyWrap)showEmpty(storyWrap,'专题不存在或不可见');
      }
    }catch(error){showError(grid,error);detailSection?.closest('.section')?.remove();if(storyWrap)showError(storyWrap,error)}
  }
  function detailHref(type,item,evidenceId){
    const base=hrefByType[type];if(!base)return null;
    const params=new URLSearchParams({id:item.id});
    if(evidenceId)params.set('evidence',evidenceId);
    return `${base}?${params}${evidenceId?'#evidence':''}`;
  }
  async function bindSearch(){
    const form=document.querySelector('.global-search'),input=form?.querySelector('input'),panel=document.querySelector('.tab-panel.active'),tabs=document.querySelector('.tabs'),pagination=document.querySelector('.pagination');
    if(!form||!input||!panel)return;
    form.removeAttribute('onsubmit');
    const url=new URLSearchParams(location.search);input.value=url.get('q')||'';
    const rawTypeParam=url.get('types')||url.get('type')||'all';
    const requestedTypes=rawTypeParam.split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
    const hasLegacyDocumentType=requestedTypes.some(value=>value==='document'||value==='doc');
    const requestedType=hasLegacyDocumentType?'all':(requestedTypes[0]||'all');
    let activeType=PUBLIC_SEARCH_TYPES.includes(requestedType)?requestedType:'all',currentPage=Number(url.get('page'))||1;
    if(hasLegacyDocumentType){url.delete('type');url.set('types','all');history.replaceState(null,'',`${location.pathname}?${url}`)}
    let pageSize=Math.min(100,Math.max(1,Number(url.get('page_size'))||20));
    let sort=url.get('sort')||'relevance';
    const controls=document.createElement('div');controls.className='chip-row search-controls';
    const sortSelect=document.createElement('select');sortSelect.className='field';sortSelect.setAttribute('aria-label','排序');
    [['relevance','相关度排序'],['type','按类型排序']].forEach(([value,label])=>{const option=new Option(label,value);option.selected=value===sort;sortSelect.add(option)});
    const sizeSelect=document.createElement('select');sizeSelect.className='field';sizeSelect.setAttribute('aria-label','每页数量');
    [10,20,50].forEach(value=>{const option=new Option(`每页 ${value} 条`,String(value));option.selected=value===pageSize;sizeSelect.add(option)});
    controls.append(sortSelect,sizeSelect);tabs.before(controls);
    sortSelect.addEventListener('change',()=>{sort=sortSelect.value;run(1)});
    sizeSelect.addEventListener('change',()=>{pageSize=Number(sizeSelect.value);run(1)});
    async function run(page=1){
      const q=input.value.trim();currentPage=page;
      if(!q){showEmpty(panel,'请输入检索关键词');empty(tabs);empty(pagination);return}
      showLoading(panel,'正在检索姓名、别名、历史名称与五书原文…');
      const selected=activeType==='all'?PUBLIC_SEARCH_TYPES:[activeType];
      try{
        const response=await window.HQZ.api.searchPage(q,selected,{page,page_size:pageSize,sort});
        const nextUrl=new URLSearchParams({q,types:activeType,page:String(page),page_size:String(pageSize),sort});
        history.replaceState(null,'',`${location.pathname}?${nextUrl}`);
        empty(tabs);
        [['all','全部'],['person','人物'],['event','事件'],['org','组织'],['place','地点'],['topic','专题']].forEach(([key,label])=>{
          const count=activeType===key?` ${response.total}`:'';
          const button=text('button',`${label}${count}`,'tab'+(activeType===key?' active':''));button.type='button';button.addEventListener('click',()=>{activeType=key;run(1)});tabs.appendChild(button);
        });
        empty(panel);
        if(!response.items.length){showEmpty(panel,`未找到“${q}”的真实数据`);empty(pagination);return}
        response.items.filter(hit=>PUBLIC_SEARCH_TYPES.includes(hit.type)).forEach(hit=>{
          const {type,item}=hit;const row=document.createElement('article');row.className='search-result';row.dataset.type=type;addImage(row,item);
          const copy=document.createElement('div');copy.append(text('h3',titleOf(item)),text('p',hit.snippet||item.bio_short||item.summary||item.intro||item.subtitle||'暂无摘要'));
          copy.appendChild(text('div',typeLabel[type],'meta-line'));
          const href=detailHref(type,item,hit.evidence_id);if(href){const link=text('a',hit.evidence_id?'查看条目与依据':'查看条目','btn btn-outline btn-small');link.href=href;copy.appendChild(link)}
          row.append(copy,text('span',typeLabel[type]||type,'type-badge'));panel.appendChild(row);
        });
        renderPagination(pagination,response,run);
      }catch(error){showError(panel,error);empty(tabs);empty(pagination)}
    }
    form.addEventListener('submit',event=>{event.preventDefault();run(1)});
    await run(currentPage);
  }
  function updateHeroMetric(page,stats){
    const type=pageToType[page];if(!type)return;
    const metric=document.querySelector('.channel-hero .hero-metrics');
    if(!metric)return;
    empty(metric);
    const count=stats?.counts?.[type]||{};
    const values=isShowcase()
      ? [[typeLabel[type]||'记录',count.candidate??count.needs_review??count.public]]
      : mode()==='teacher_preview'
      ? [['识别候选',count.candidate],['待审核',count.needs_review],['已审核',count.reviewed]]
      : [['已公开',count.public]];
    values.forEach(([label,value])=>{const cell=document.createElement('div');cell.append(text('b',Number(value||0).toLocaleString('zh-CN')),text('span',label));metric.appendChild(cell)});
  }
  function bindAbout(stats){
    const metric=document.querySelector('.hero-metrics');if(!metric)return;
    empty(metric);
    [
      ['首批华侨志',stats?.coverage?.books||0],
      ['来源页',stats?.coverage?.source_pages||0],
      [mode()==='teacher_preview'?'研究预览':'公开数据',mode()==='teacher_preview'?'含待审核':'已审核']
    ].forEach(([label,value])=>{const cell=document.createElement('div');cell.append(text('b',typeof value==='number'?value.toLocaleString('zh-CN'):value),text('span',label));metric.appendChild(cell)});
  }
  window.HQZ_BINDINGS=Object.freeze({
    EMPTY_TEXT,
    async apply(page,state){
      if(!['backend','demo'].includes(state.source))return;
      document.body.classList.toggle('backend-data-active',state.source==='backend');
      document.body.classList.toggle('demo-data-active',state.source==='demo');
      updateHeroMetric(page,state.stats);
      if(page==='org')document.querySelector('section.section:not(#list) .relation-grid')?.remove();
      const type=pageToType[page];
      if(['person','event','org'].includes(type))await bindMasterDetail(type);
      else if(type==='place')await bindPlaces();
      else if(type==='topic')await bindTopics();
      else if(page==='search')await bindSearch();
      else if(page==='about')bindAbout(state.stats);
    }
  });
})();
