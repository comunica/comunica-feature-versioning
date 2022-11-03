export type VersionContext = IVersionContextVersionMaterialization | IVersionContextDm | IVersionContextVersionQuery;

/**
 * Context for a single version.
 */
export interface IVersionContextVersionMaterialization {
  type: 'version-materialization';
  version: number;
}

/**
 * Context for the delta between two versions.
 */
export interface IVersionContextDm {
  type: 'delta-materialization';
  versionStart: number;
  versionEnd: number;
  /**
   * If only additions must be returned, otherwise, only deletions will be returned.
   */
  queryAdditions: boolean;
}

/**
 * Context for all versions.
 */
export interface IVersionContextVersionQuery {
  type: 'version-query';
}
