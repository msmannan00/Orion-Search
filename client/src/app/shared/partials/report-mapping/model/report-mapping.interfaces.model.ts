import { UnknownRecord } from '../../../utils/type-guards.util';

export interface MappingVertex extends UnknownRecord {
  type?: string;
  title?: unknown;
  display_value?: unknown;
  label?: unknown;
  value?: unknown;
  summary?: unknown;
  cluster_id?: unknown;
  module?: unknown;
  source?: unknown;
  published?: unknown;
  source_reliability?: unknown;
  doc_id?: unknown;
  m_document_id?: unknown;
  _key?: unknown;
  _id?: unknown;
}

export interface MappingEdge extends UnknownRecord {
  _id?: string;
  _from?: string;
  _to?: string;
  label?: unknown;
  relationship_type?: unknown;
  edge_type?: unknown;
  type?: unknown;
}

export interface MappingGraphItem extends UnknownRecord {
  vertex?: MappingVertex;
  path?: { vertices?: MappingVertex[] };
  edge?: MappingEdge;
}
