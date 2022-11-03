import type { VersionContext } from '@comunica/types-versioning';
import type { BufferedIteratorOptions } from 'asynciterator';
import { BufferedIterator } from 'asynciterator';
import type { OstrichStore } from 'ostrich-bindings';
import type * as RDF from 'rdf-js';

export class OstrichIterator extends BufferedIterator<RDF.Quad> {
  protected readonly store: OstrichStore;
  protected readonly versionContext: VersionContext;
  protected readonly subject?: RDF.Term;
  protected readonly predicate?: RDF.Term;
  protected readonly object?: RDF.Term;

  protected reading: boolean;

  public constructor(
    store: OstrichStore,
    versionContext: VersionContext,
    subject?: RDF.Term,
    predicate?: RDF.Term,
    object?: RDF.Term,
    options?: BufferedIteratorOptions,
  ) {
    super(options);
    this.store = store;
    this.versionContext = versionContext;
    this.subject = subject;
    this.predicate = predicate;
    this.object = object;

    this.reading = false;
  }

  public _read(count: number, done: () => void): void {
    if (this.store.closed) {
      this.close();
      return done();
    }
    if (this.reading) {
      return done();
    }
    this.reading = true;

    switch (this.versionContext.type) {
      case 'version-materialization':
        this.store.searchTriplesVersionMaterialized(
          this.subject,
          this.predicate,
          this.object,
          { version: this.versionContext.version },
        )
          .then(({ triples }) => {
            triples.forEach(t => this._push(t));
            this.reading = false;
            this.close();
            done();
          })
          .catch(error => this.destroy(error));
        break;
      case 'delta-materialization':
        // eslint-disable-next-line no-case-declarations
        const queryAdditions = this.versionContext.queryAdditions;
        this.store.searchTriplesDeltaMaterialized(
          this.subject,
          this.predicate,
          this.object,
          { versionEnd: this.versionContext.versionEnd, versionStart: this.versionContext.versionStart },
        )
          .then(({ triples }) => {
            triples = triples.filter(t => (<any> t).addition === queryAdditions);
            triples.forEach(t => this._push(t));
            this.reading = false;
            this.close();
            done();
          })
          .catch(error => this.destroy(error));
        break;
      case 'version-query':
        this.store.searchTriplesVersion(this.subject, this.predicate, this.object)
          .then(({ triples }) => {
            triples.forEach(t => this._push(t));
            this.reading = false;
            this.close();
            done();
          })
          .catch(error => this.destroy(error));
        break;
    }
  }
}
