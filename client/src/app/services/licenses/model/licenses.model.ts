export interface CombinedRule {
    modules: Set<string> | 'all';
    cti_graph: boolean;
    mapping: boolean;
    scanning: boolean;
    maintainer: boolean;
}
