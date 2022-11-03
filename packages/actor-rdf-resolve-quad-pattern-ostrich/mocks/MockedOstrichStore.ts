import type * as RDF from '@rdfjs/types';
import type { IQuadDelta, IQuadVersion } from 'ostrich-bindings/lib/utils';
import { quadDelta, quadVersion } from 'ostrich-bindings/lib/utils';
import { matchPattern } from 'rdf-terms';

export class MockedOstrichStore {
  public _closed = false;

  private readonly triples: Record<number, RDF.Quad[]>;
  private error: Error | null = null;

  public constructor(triples: Record<number, RDF.Quad[]>) {
    this.triples = triples;
  }

  public searchTriplesVersionMaterialized(
    subject: RDF.Term | undefined,
    predicate: RDF.Term | undefined,
    object: RDF.Term | undefined,
    options?: {
      offset?: number;
      limit?: number;
      version?: number;
    },
  ): Promise<{
      triples: RDF.Quad[];
      cardinality: number;
      exactCardinality: boolean;
    }> {
    return new Promise<{ triples: RDF.Quad[]; cardinality: number; exactCardinality: boolean }>((resolve, reject) => {
      if (this.error) {
        return reject(this.error);
      }
      const version = options?.version === -1 || options?.version === undefined ?
        Object.keys(this.triples).length - 1 :
        options?.version;
      let i = 0;
      const triples: RDF.Quad[] = [];
      for (const triple of this.triples[version]) {
        if (matchPattern(triple, subject, predicate, object)) {
          triples.push(triple);
          i++;
        }
      }
      resolve({ triples, cardinality: i, exactCardinality: true });
    });
  }

  public async countTriplesVersionMaterialized(
    subject: RDF.Term | undefined,
    predicate: RDF.Term | undefined,
    object: RDF.Term | undefined,
    version: number,
  ): Promise<{
      cardinality: number;
      exactCardinality: boolean;
    }> {
    const ret: any = await this.searchTriplesVersionMaterialized(
      subject,
      predicate,
      object,
      { version },
    );
    delete ret.triples;
    return ret;
  }

  public searchTriplesDeltaMaterialized(
    subject: RDF.Term | undefined,
    predicate: RDF.Term | undefined,
    object: RDF.Term | undefined,
    options: {
      offset?: number;
      limit?: number;
      versionStart: number;
      versionEnd: number;
    },
  ): Promise<{
      triples: IQuadDelta[];
      cardinality: number;
      exactCardinality: boolean;
    }> {
    return new Promise<{ triples: IQuadDelta[]; cardinality: number; exactCardinality: boolean }>((resolve, reject) => {
      if (this.error) {
        return reject(this.error);
      }
      const versionStart = options.versionStart;
      const versionEnd = options.versionEnd;

      const triplesStart: RDF.Quad[] = [];
      for (const triple of this.triples[versionStart]) {
        if (matchPattern(triple, subject, predicate, object)) {
          triplesStart.push(triple);
        }
      }
      const triplesEnd: RDF.Quad[] = [];
      for (const triple of this.triples[versionEnd]) {
        if (matchPattern(triple, subject, predicate, object)) {
          triplesEnd.push(triple);
        }
      }

      const triplesDiff: IQuadDelta[] = [];
      // Find deletions
      for (const tripleStart of triplesStart) {
        let found = false;
        for (const tripleEnd of triplesEnd) {
          if (tripleStart.equals(tripleEnd)) {
            found = true;
            break;
          }
        }
        if (!found) {
          triplesDiff.push(quadDelta(tripleStart, false));
        }
      }
      // Find additions
      for (const tripleEnd of triplesEnd) {
        let found = false;
        for (const tripleStart of triplesStart) {
          if (tripleStart.equals(tripleEnd)) {
            found = true;
            break;
          }
        }
        if (!found) {
          triplesDiff.push(quadDelta(tripleEnd, true));
        }
      }

      resolve({ triples: triplesDiff, cardinality: triplesDiff.length, exactCardinality: true });
    });
  }

  public async countTriplesDeltaMaterialized(
    subject: RDF.Term | undefined,
    predicate: RDF.Term | undefined,
    object: RDF.Term | undefined,
    versionStart: number,
    versionEnd: number,
  ): Promise<{
      cardinality: number;
      exactCardinality: boolean;
    }> {
    const ret: any = await this.searchTriplesDeltaMaterialized(subject,
      predicate,
      object,
      { versionStart, versionEnd });
    delete ret.triples;
    return ret;
  }

  public searchTriplesVersion(
    subject: RDF.Term | undefined,
    predicate: RDF.Term | undefined,
    object: RDF.Term | undefined,
    options?: {
      offset?: number;
      limit?: number;
    },
  ): Promise<{
      triples: IQuadVersion[];
      cardinality: number;
      exactCardinality: boolean;
    }> {
    return new Promise<{
      triples: IQuadVersion[];
      cardinality: number;
      exactCardinality: boolean;
    }>((resolve, reject) => {
      if (this.error) {
        return reject(this.error);
      }
      let i = 0;
      const triples: IQuadVersion[] = [];
      for (const version in this.triples) {
        for (const triple of this.triples[version]) {
          if (matchPattern(triple, subject, predicate, object)) {
            triples.push(quadVersion(triple, [ Number.parseInt(version, 10) ]));
            i++;
          }
        }
      }
      resolve({ triples, cardinality: i, exactCardinality: true });
    });
  }

  public async countTriplesVersion(
    subject: RDF.Term | undefined,
    predicate: RDF.Term | undefined,
    object: RDF.Term | undefined,
  ): Promise<{
      cardinality: number;
      exactCardinality: boolean;
    }> {
    const ret: any = await this.searchTriplesVersion(subject, predicate, object, {});
    delete ret.triples;
    return ret;
  }

  public async close(): Promise<void> {
    this._closed = true;
  }

  public get closed(): boolean {
    return this._closed;
  }

  public setError(error: Error): void {
    this.error = error;
  }
}
