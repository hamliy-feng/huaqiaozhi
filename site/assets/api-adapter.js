(() => {
  const ENTITY_TYPES = ['person','org','event','place','topic'];
  const HIDDEN_REVIEW_STATUSES = new Set(['rejected','isolated','superseded','withdrawn','demo_only']);
  const PUBLIC_REVIEW_STATUSES = new Set(['published']);
  const TEACHER_PREVIEW_REVIEW_STATUSES = new Set(['candidate','needs_review','reviewed_internal','published']);
  const DISALLOWED_ORG_TYPE_CODES = new Set([
    'school','education','educational_institution','hospital','medical','medical_institution',
    'company','enterprise','bank','financial_institution','theater','road','building',
    'facility','internal_facility','government_agency'
  ]);
  const UNRELIABLE_SPATIAL_PRECISIONS = new Set(['unknown','text_only','text_only_no_coordinates','unresolved','unresolved_place','none']);
  const REQUIRED_FIELDS = Object.freeze({
    person:['id','name','aliases','source_summary','review_status','frontend_visible'],
    org:['id','name','source_summary','review_status','frontend_visible'],
    event:['id','title','source_summary','review_status','frontend_visible'],
    place:['id','name','aliases','source_summary','review_status','frontend_visible'],
    topic:['id','title','review_status','frontend_visible'],
    entity_link:['id','subject_type','subject_id','relation','object_type','object_id','source_summary','review_status']
  });

  const own = (value,key) => Object.prototype.hasOwnProperty.call(value||{},key);
  const hasValue = value => value!==null&&value!==undefined&&value!=='';
  const asArray = value => Array.isArray(value) ? value : (value == null ? [] : [value]);
  const integer = (value,fallback) => Number.isInteger(Number(value)) ? Number(value) : fallback;
  const unwrapData = payload => own(payload,'data') ? payload.data : payload;
  const flattenJsonApi = value => value && typeof value === 'object' && value.attributes && typeof value.attributes === 'object'
    ? {...value.attributes,id:value.id??value.attributes.id,type:value.type??value.attributes.type}
    : value;
  const responseShape = payload => {
    if(Array.isArray(payload))return 'array';
    if(Array.isArray(payload?.data))return 'data-array';
    if(Array.isArray(payload?.data?.items))return 'data-items';
    if(Array.isArray(payload?.items))return 'items';
    if(own(payload,'data'))return 'data-object';
    return payload && typeof payload === 'object' ? 'object' : typeof payload;
  };
  function normalizeRecord(type,value){
    const record=flattenJsonApi(value);
    if(!record||typeof record!=='object'||Array.isArray(record))return null;
    const next={...record};
    next.frontend_visible=own(next,'frontend_visible')?next.frontend_visible===true:null;
    next.scope_status=next.scope_status??next.organization_scope_status??null;
    next.content_maturity=next.content_maturity??next.content_maturity_status??next.maturity_status??null;
    next.featured=next.featured===true;
    if(['person','org','place'].includes(type))next.aliases=asArray(next.aliases).filter(Boolean);
    if(type==='person'){
      next.birth_year=next.birth_year??next.birth??null;
      next.birth_precision=next.birth_precision??next.birth_time_precision??'unknown';
      next.death_year=next.death_year??next.death??null;
      next.death_precision=next.death_precision??next.death_time_precision??'unknown';
      next.native_place_text=asArray(next.native_place_text??next.native_place_texts??next.native_place_display??next.native_place_raw).filter(Boolean);
      next.native_place_display=next.native_place_display??next.native_place_text[0]??null;
      next.residence_place_ids=asArray(next.residence_place_ids).filter(Boolean);
      next.residence_texts=asArray(next.residence_texts??next.residence_places).filter(Boolean);
      next.occupation=asArray(next.occupation??next.roles_titles).filter(value=>value&&value!=='华侨');
      next.honor_tags=asArray(next.honor_tags??next.honors).map(value=>typeof value==='string'?value:(value?.honor_name||value?.name||value?.label)).filter(Boolean);
      next.tags=Array.from(new Set([...asArray(next.tags).filter(Boolean),...next.honor_tags]));
      next.bio_short=next.bio_short??next.card_intro??null;
      next.bio_full=next.bio_full??next.biography_detail_deduped??null;
      next.timeline=asArray(next.timeline??next.person_deeds).filter(Boolean);
      next.life_span=next.life_span??[next.birth_year||'',next.death_year||''].join('-').replace(/^-$/,'');
    }
    if(type==='org'){
      next.historical_names=asArray(next.historical_names).filter(Boolean);
      next.location_texts=asArray(next.location_texts).filter(Boolean);
      next.leader_person_ids=asArray(next.leader_person_ids??next.leaders).filter(Boolean);
      next.member_person_ids=asArray(next.member_person_ids??next.members).filter(Boolean);
      next.related_events=asArray(next.related_events).filter(Boolean);
      next.timeline=asArray(next.timeline).filter(Boolean);
      next.scope_status=next.scope_status??next.organization_scope_status??null;
      next.scope_review_required=organizationScopeState(next)==='unknown';
    }
    if(type==='event'){
      next.tags=asArray(next.tags).filter(Boolean);
      next.place_ids=asArray(next.place_ids??next.place_id).filter(Boolean);
      next.participant_person_ids=asArray(next.participant_person_ids).filter(Boolean);
      next.participant_organization_ids=asArray(next.participant_organization_ids??next.participant_org_ids).filter(Boolean);
      next.participant_roles=asArray(next.participant_roles).filter(Boolean);
      next.numeric_values=asArray(next.numeric_values).filter(Boolean);
      next.fact_ids=asArray(next.fact_ids).filter(Boolean);
    }
    if(type==='place'){
      next.historical_names=asArray(next.historical_names).filter(Boolean);
      next.country=next.country??next.country_or_region??null;
      next.admin_path=asArray(next.admin_path).filter(Boolean);
      next.lat=next.lat==null?null:Number(next.lat);
      next.lng=next.lng==null?null:Number(next.lng);
      if(!Number.isFinite(next.lat))next.lat=null;
      if(!Number.isFinite(next.lng))next.lng=null;
    }
    if(type==='topic')next.linked_content_ids=asArray(next.linked_content_ids).filter(Boolean);
    return next;
  }
  function isPublicRecord(record){
    const status=String(record?.review_status||record?.publication_status||'').toLowerCase();
    if(record?.teacher_preview===true||record?.public===false||String(record?.data_status||'').toLowerCase()==='candidate')return false;
    return PUBLIC_REVIEW_STATUSES.has(status);
  }
  function isOrganizationInPublicScope(record){
    return organizationScopeState(record)!=='out_of_scope';
  }
  function organizationScopeState(record){
    const code=String(record?.type_code||record?.organization_type||'').toLowerCase();
    if(DISALLOWED_ORG_TYPE_CODES.has(code))return 'out_of_scope';
    const scope=String(record?.scope_status||'').toLowerCase();
    if(!scope)return 'unknown';
    if(/^in_scope(?:_|$)/.test(scope))return 'in_scope';
    if(/^out_of_scope(?:_|$)/.test(scope)||scope==='rejected'||scope==='ambiguous')return 'out_of_scope';
    return 'unknown';
  }
  function hasPublicTopicCuration(record){
    return Boolean(record?.curator_note||record?.selection_rationale);
  }
  function isVisibleRecord(record,mode='public',{requireFrontendVisible=true,type=null}={}){
    if(!record||!hasValue(record.id))return false;
    if(requireFrontendVisible&&record.frontend_visible!==true)return false;
    const status=String(record.review_status||record.publication_status||'').toLowerCase();
    if(HIDDEN_REVIEW_STATUSES.has(status))return false;
    if(type==='org'){
      const scope=organizationScopeState(record);
      if(scope==='out_of_scope')return false;
      if(mode!=='teacher_preview'&&scope!=='in_scope')return false;
    }
    if(type==='topic'&&String(record.theme_code||record.topic_kind||'').toLowerCase()==='structure_heading')return false;
    if(mode!=='teacher_preview'){
      if(type==='topic'&&!hasPublicTopicCuration(record))return false;
      return isPublicRecord(record);
    }
    return TEACHER_PREVIEW_REVIEW_STATUSES.has(status);
  }
  function modeOf(payload,fallback='public'){
    const value=payload?.meta?.publication_status||payload?.data?.meta?.publication_status||payload?.meta?.source_mode;
    return value==='teacher_preview'||value==='disk_preview'?'teacher_preview':fallback;
  }
  function normalizeCollection(payload,{type=null,filterUnsafe=true,mode=modeOf(payload),requireFrontendVisible=ENTITY_TYPES.includes(type)}={}){
    const root=unwrapData(payload);
    const itemsSource=Array.isArray(root)?root:(Array.isArray(root?.items)?root.items:(Array.isArray(payload?.items)?payload.items:[]));
    const normalized=itemsSource.map(item=>type?normalizeRecord(type,item):flattenJsonApi(item)).filter(Boolean);
    const items=filterUnsafe?normalized.filter(record=>isVisibleRecord(record,mode,{requireFrontendVisible,type})):normalized;
    const meta={...(payload?.meta||{}),...(root?.meta||{})};
    const declaredTotal=integer(root?.total??payload?.total??meta.total,normalized.length);
    const total=normalized.length===items.length?Math.max(0,declaredTotal):items.length;
    const page=integer(root?.page??payload?.page??meta.page,1);
    const pageSize=integer(root?.page_size??payload?.page_size??meta.page_size,items.length);
    const included=asArray(root?.included??payload?.included).map(flattenJsonApi).filter(Boolean);
    const facets=root?.facets&&typeof root.facets==='object'?root.facets:(payload?.facets||{});
    return {items,total,page,page_size:pageSize,meta,included,facets,response_shape:responseShape(payload),filtered_count:normalized.length-items.length,data_mode:mode};
  }
  function normalizeDetail(payload,{type=null,filterUnsafe=true,mode=modeOf(payload),requireFrontendVisible=ENTITY_TYPES.includes(type)}={}){
    const root=unwrapData(payload);
    const value=root?.item??root;
    const record=type?normalizeRecord(type,value):flattenJsonApi(value);
    if(!record||Array.isArray(record)||typeof record!=='object')return null;
    return filterUnsafe&&!isVisibleRecord(record,mode,{requireFrontendVisible,type})?null:record;
  }
  function includedIndex(included=[]){
    const index=new Map();
    const typeAliases={
      organization:'org',
      organizations:'org',
      county_city:'place',
      district_county:'place',
      province:'place',
      city:'place',
      overseas_place:'place',
      native_place:'place'
    };
    included.forEach(item=>{
      const id=item.id||item.entity_id;
      const declared=item.entity_type||item.resource_type||item.type;
      const prefix=String(id||'').split(/[_-]/,1)[0];
      const normalized=typeAliases[String(declared||'').toLowerCase()]||declared;
      const type=ENTITY_TYPES.includes(normalized)?normalized:(ENTITY_TYPES.includes(prefix)?prefix:null);
      if(type&&id)index.set(`${type}:${id}`,item);
    });
    return index;
  }
  function normalizeLinks(payload,{mode=modeOf(payload)}={}){
    const result=normalizeCollection(payload,{filterUnsafe:true,mode,requireFrontendVisible:false});
    const index=includedIndex(result.included);
    result.items=result.items.map(raw=>{
      const link=normalizeRecord('entity_link',raw);
      if(!link||!ENTITY_TYPES.includes(link.subject_type)||!ENTITY_TYPES.includes(link.object_type))return null;
      const subject=link.subject||index.get(`${link.subject_type}:${link.subject_id}`)||null;
      const object=link.object||index.get(`${link.object_type}:${link.object_id}`)||null;
      return {...link,subject,object};
    }).filter(Boolean);
    return result;
  }
  function sanitizeSearchTypes(types){
    const raw=Array.isArray(types)?types:String(types||'').split(',');
    const valid=raw.map(value=>String(value).trim().toLowerCase()).filter(type=>ENTITY_TYPES.includes(type));
    return valid.length?[...new Set(valid)]:[...ENTITY_TYPES];
  }
  function normalizeSearch(payload,{mode=modeOf(payload)}={}){
    const result=normalizeCollection(payload,{filterUnsafe:false,mode});
    const receivedCount=result.items.length;
    result.items=result.items.map(raw=>{
      if(raw?.item){
        const declared=raw.type||raw.entity_type||raw.item.entity_type||raw.item.type;
        const type=declared==='organization'?'org':declared;
        const item=ENTITY_TYPES.includes(type)?normalizeRecord(type,raw.item):null;
        const isOcrHit=String(raw.result_type||'').toLowerCase()==='ocr_text';
        if(isOcrHit&&!raw.evidence_id)return null;
        return item&&isVisibleRecord(item,mode,{type})?{...raw,type,item}:null;
      }
      const type=raw?.entity_type||raw?.type;
      const item=normalizeRecord(type,raw);
      return ENTITY_TYPES.includes(type)&&item&&isVisibleRecord(item,mode,{type})?{type,item}:null;
    }).filter(Boolean);
    result.total=Math.max(0,result.total-(receivedCount-result.items.length));
    if(result.facets?.type){
      result.facets={...result.facets,type:Object.fromEntries(Object.entries(result.facets.type).filter(([type])=>ENTITY_TYPES.includes(type)))};
    }
    return result;
  }
  function normalizeStats(payload){
    const root=unwrapData(payload)||{};
    const counts=root.counts&&typeof root.counts==='object'?root.counts:root;
    const normalized={};
    ENTITY_TYPES.forEach(type=>{
      const value=counts[type];
      normalized[type]=value&&typeof value==='object'
        ? {
            candidate:Math.max(0,integer(value.candidate,0)),
            needs_review:Math.max(0,integer(value.needs_review,0)),
            reviewed:Math.max(0,integer(value.reviewed,0)),
            public:Math.max(0,integer(value.public,0))
          }
        : {candidate:0,needs_review:0,reviewed:Math.max(0,integer(value,0)),public:Math.max(0,integer(value,0))};
    });
    return {
      mode:root.mode||modeOf(payload),
      counts:normalized,
      entity_links:root.entity_links||{candidate:0,reviewed:0,public:0},
      facts:root.facts||{evidence_supported:0,reviewed:0,public:0},
      coverage:root.coverage||{},
      pending_review:Math.max(0,integer(root.pending_review,0)),
      source_collection_candidates:Math.max(0,integer(root.source_collection_candidates,0))
    };
  }
  function validateRecord(type,record){
    const required=REQUIRED_FIELDS[type]||[];
    const missing=required.filter(field=>!own(record,field));
    const empty=required.filter(field=>own(record,field)&&(record[field]===null||record[field]===''||(Array.isArray(record[field])&&!record[field].length)));
    const unsafe=!isPublicRecord(record);
    return {valid:!missing.length&&!unsafe,missing,empty,unsafe};
  }

  function isReliableMapPoint(item){
    const precision=String(item?.spatial_precision||'').toLowerCase();
    return Number.isFinite(item?.lat)&&Number.isFinite(item?.lng)&&Boolean(precision)&&!UNRELIABLE_SPATIAL_PRECISIONS.has(precision);
  }

  function normalizeEvidence(payload){
    const result=normalizeCollection(payload,{filterUnsafe:false});
    result.items=result.items.map(item=>({
      ...item,
      entity_ids:asArray(item.entity_ids).filter(Boolean),
      book_title:item.book_title??item.source_collection_name??item.source_collection??null,
      chapter_title:item.chapter_title??item.chapter??null,
      ocr_snippet:item.ocr_snippet??item.source_excerpt??item.ocr_text??null,
      printed_page:item.printed_page??null,
      source_page:item.source_page??null,
      highlight:item.highlight??(
        item.char_start!=null||item.char_end!=null
          ? {kind:'text_offsets',char_start:item.char_start??null,char_end:item.char_end??null}
          : null
      )
    }));
    return result;
  }

  window.HQZ_API_ADAPTER=Object.freeze({
    entityTypes:ENTITY_TYPES,
    requiredFields:REQUIRED_FIELDS,
    responseShape,
    normalizeCollection,
    normalizeDetail,
    normalizeLinks,
    normalizeSearch,
    normalizeStats,
    normalizeEvidence,
    normalizeRecord,
    sanitizeSearchTypes,
    isReliableMapPoint,
    isOrganizationInPublicScope,
    organizationScopeState,
    isPublicRecord,
    isVisibleRecord,
    modeOf,
    validateRecord
  });
})();
