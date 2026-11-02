(() => {
  const common = {
    publicTypes: ['person', 'org', 'event', 'place'],
    supportedTypes: ['person', 'org', 'event', 'place', 'topic'],
    commonFields: [
      { key: 'id', label: '对象编号', type: 'text', internal: true },
      { key: 'review_status', label: '审核状态', type: 'status' },
      { key: 'frontend_visible', label: '前端可见', type: 'boolean', internal: true },
      { key: 'source_summary', label: '来源摘要', type: 'long_text' },
      { key: 'evidence_ids', label: '来源与依据', type: 'evidence' }
    ]
  };
  const schemas = {
    person: {
      type: 'person', plural: 'persons', titleField: 'name', listEndpoint: '/persons', detailEndpoint: '/persons/{id}',
      listFields: ['name', 'aliases', 'occupation', 'bio_short', 'review_status'],
      detailFields: ['name', 'aliases', 'birth_year', 'death_year', 'native_place_id', 'residence_place_ids', 'occupation', 'bio_full', 'timeline'],
      modules: ['overview', 'aliases', 'time', 'location', 'identity', 'body', 'timeline', 'relationships', 'evidence', 'review'],
      relationGroups: ['family', 'organization', 'event', 'place', 'other'], mapPolicy: 'reliable-only'
    },
    org: {
      type: 'org', plural: 'orgs', titleField: 'name', listEndpoint: '/orgs', detailEndpoint: '/orgs/{id}',
      listFields: ['name', 'aliases', 'type_label', 'founded', 'place_id', 'purpose', 'review_status'],
      detailFields: ['name', 'aliases', 'historical_names', 'type_label', 'founded', 'dissolved', 'place_id', 'purpose', 'history', 'timeline'],
      modules: ['overview', 'aliases', 'time', 'location', 'identity', 'body', 'timeline', 'relationships', 'evidence', 'review'],
      relationGroups: ['person', 'event', 'place', 'organization'], mapPolicy: 'reliable-only'
    },
    event: {
      type: 'event', plural: 'events', titleField: 'title', listEndpoint: '/events', detailEndpoint: '/events/{id}',
      listFields: ['title', 'type_label', 'date_start', 'date_end', 'place_ids', 'summary', 'review_status'],
      detailFields: ['title', 'type_label', 'date_start', 'date_end', 'date_precision', 'place_ids', 'summary', 'content', 'timeline', 'numeric_values'],
      modules: ['overview', 'time', 'location', 'body', 'participants', 'timeline', 'numeric_facts', 'relationships', 'evidence', 'review'],
      relationGroups: ['person', 'org', 'place', 'event'], mapPolicy: 'reliable-only'
    },
    place: {
      type: 'place', plural: 'places', titleField: 'name', listEndpoint: '/places', detailEndpoint: '/places/{id}',
      listFields: ['name', 'aliases', 'historical_names', 'type_label', 'country', 'admin_path', 'review_status'],
      detailFields: ['name', 'aliases', 'historical_names', 'type_label', 'country', 'admin_path', 'lat', 'lng', 'spatial_precision', 'intro'],
      modules: ['overview', 'aliases', 'administrative_path', 'location', 'map', 'relationships', 'migration', 'evidence', 'review'],
      relationGroups: ['person', 'org', 'event', 'place'], mapPolicy: 'reliable-only'
    },
    topic: {
      type: 'topic', plural: 'topics', titleField: 'title', listEndpoint: '/topics', detailEndpoint: '/topics/{id}',
      listFields: ['title', 'subtitle', 'cover', 'review_status'],
      detailFields: ['title', 'subtitle', 'curator_note', 'linked_content_ids', 'evidence_ids'],
      modules: ['overview', 'curation', 'relationships', 'evidence', 'review'],
      relationGroups: ['person', 'org', 'event', 'place'], mapPolicy: 'none'
    }
  };
  Object.values(schemas).forEach(schema => {
    schema.fields = [...common.commonFields, ...schema.detailFields.map(key => ({ key, label: key, type: 'auto' }))];
    Object.freeze(schema.fields);
    Object.freeze(schema.modules);
    Object.freeze(schema);
  });
  window.HQZ_OBJECT_SCHEMAS = Object.freeze({ ...common, schemas: Object.freeze(schemas) });
})();
