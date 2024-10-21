import type { IQuadSource } from '@comunica/bus-rdf-resolve-quad-pattern';
import type { VersionContext } from '@comunica/types-versioning';
import type { AsyncIterator } from 'asynciterator';
import type { BufferedOstrichStore, OstrichStore } from 'ostrich-bindings';
import type * as RDF from 'rdf-js';
import { makeIterator } from './OstrichIterator';

export class OstrichQuadSource implements IQuadSource {
  protected readonly store: OstrichStore | BufferedOstrichStore;
  protected readonly versionContext: VersionContext;

  public constructor(store: OstrichStore | BufferedOstrichStore, versionContext: VersionContext) {
    this.store = store;
    this.versionContext = versionContext;
  }

  public match(subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term): AsyncIterator<RDF.Quad> {
    if (graph && graph.termType !== 'DefaultGraph' && graph.termType !== 'Variable') {
      throw new Error('OstrichQuadSource only supports triple pattern queries within the default graph or variable.');
    }
    const it = makeIterator(this.store, this.versionContext, subject, predicate, object, { autoStart: false });
    this.count(subject, predicate, object)
      .then(countResult => it.setProperty('metadata', {
        cardinality: { type: countResult.exactCardinality ? 'exact' : 'estimate', value: countResult.cardinality },
      }))
      .catch(error => it.destroy(error));
    return it;
  }

  public count(subject: RDF.Term, predicate: RDF.Term, object: RDF.Term): Promise<{
    cardinality: number;
    exactCardinality: boolean;
  }> {
    switch (this.versionContext.type) {
      case 'version-materialization':
        return this.store.countTriplesVersionMaterialized(subject,
          predicate,
          object,
          this.versionContext.version);
      case 'delta-materialization':
        return this.store.countTriplesDeltaMaterialized(subject,
          predicate,
          object,
          this.versionContext.versionStart,
          this.versionContext.versionEnd);
      case 'version-query':
        return this.store.countTriplesVersion(subject, predicate, object);
    }
  }
}
