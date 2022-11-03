import { ActionContextKey } from '@comunica/core';
import type { VersionContext } from '@comunica/types-versioning';

/**
 * When adding entries to this file, also add a shortcut for them in the contextKeyShortcuts TSDoc comment in
 * ActorIniQueryBase in @comunica/actor-init-query if it makes sense to use this entry externally.
 * Also, add this shortcut to IQueryContextCommon in @comunica/types.
 */

export const KeysRdfResolveQuadPattern = {
  /**
   * A flag for representing the version of a source.
   */
  version: new ActionContextKey<VersionContext>('@comunica/bus-rdf-resolve-quad-pattern:version'),
};
