import arrayifyStream from 'arrayify-stream';
import type { OstrichStore } from 'ostrich-bindings';
import { DataFactory } from 'rdf-data-factory';
import { OstrichIterator } from '../lib/OstrichIterator';
import { OstrichQuadSource } from '../lib/OstrichQuadSource';
import { MockedOstrichStore } from '../mocks/MockedOstrichStore';
const DF = new DataFactory();
const quad = require('rdf-quad');
const VAR = DF.variable('var');

describe('OstrichQuadSource', () => {
  let store: MockedOstrichStore & OstrichStore;

  beforeEach(() => {
    store = <any> new MockedOstrichStore({
      0: [
        quad('s0', 'p1', 'o1'),
        quad('s0', 'p1', 'o2'),
      ],
      1: [
        quad('s1', 'p1', 'o1'),
        quad('s1', 'p1', 'o2'),
      ],
      2: [
        quad('s2', 'p1', 'o1'),
        quad('s2', 'p1', 'o2'),
      ],
      3: [
        quad('s2', 'p1', 'o1'),
        quad('s2', 'p1', 'o2'),
      ],
    });
  });

  describe('The OstrichQuadSource module', () => {
    it('should be a function', () => {
      expect(OstrichQuadSource).toBeInstanceOf(Function);
    });

    it('should be a OstrichQuadSource constructor', () => {
      expect(new OstrichQuadSource(store, { type: 'version-materialization', version: 0 }))
        .toBeInstanceOf(OstrichQuadSource);
    });
  });

  describe('A OstrichQuadSource instance', () => {
    let source: OstrichQuadSource;

    beforeEach(() => {
      source = new OstrichQuadSource(store, { type: 'version-materialization', version: 0 });
    });

    it('should throw an error when queried on the non-default graph', () => {
      return expect(() => source.match(VAR, VAR, VAR, DF.namedNode('http://ex.org'))).toThrow();
    });

    it('should return an OstrichIterator', async() => {
      const it = source.match(DF.variable('v'), DF.variable('v'), DF.variable('v'), DF.defaultGraph());
      expect(await new Promise(resolve => it.getProperty('metadata', resolve)))
        .toEqual({ cardinality: { type: 'exact', value: 2 }});
      expect(it).toBeInstanceOf(OstrichIterator);
    });

    it('should return an OstrichIterator with estimated count', async() => {
      (<any> source).store.countTriplesVersionMaterialized = async() => ({
        cardinality: 2,
        exactCardinality: false,
      });

      const it = source.match(DF.variable('v'), DF.variable('v'), DF.variable('v'), DF.defaultGraph());
      expect(await new Promise(resolve => it.getProperty('metadata', resolve)))
        .toEqual({ cardinality: { type: 'estimate', value: 2 }});
      expect(it).toBeInstanceOf(OstrichIterator);
    });

    it('should count VM', () => {
      return expect(source.count(DF.variable('v'), DF.variable('v'), DF.variable('v'))).resolves.toEqual({
        cardinality: 2,
        exactCardinality: true,
      });
    });

    it('should count DM', () => {
      source = new OstrichQuadSource(
        store,
        { type: 'delta-materialization', versionStart: 0, versionEnd: 1, queryAdditions: false },
      );
      return expect(source.count(DF.variable('v'), DF.variable('v'), DF.variable('v'))).resolves.toEqual({
        cardinality: 4,
        exactCardinality: true,
      });
    });

    it('should count VQ', () => {
      source = new OstrichQuadSource(
        store,
        { type: 'version-query' },
      );
      return expect(source.count(DF.variable('v'), DF.variable('v'), DF.variable('v'))).resolves.toEqual({
        cardinality: 8,
        exactCardinality: true,
      });
    });

    it('should delegate count errors', () => {
      source = new OstrichQuadSource(
        store,
        { type: 'version-query' },
      );
      store.countTriplesVersion = async() => {
        throw new Error('e');
      };
      return expect(source.count(DF.variable('v'), DF.variable('v'), DF.variable('v'))).rejects.toEqual(new Error('e'));
    });

    it('should delegate count errors to match', () => {
      source = new OstrichQuadSource(
        store,
        { type: 'version-query' },
      );
      store.countTriplesVersion = async() => {
        throw new Error('e');
      };
      return expect(arrayifyStream(source
        .match(DF.variable('v'), DF.variable('v'), DF.variable('v'), DF.defaultGraph())))
        .rejects.toEqual(new Error('e'));
    });
  });
});
