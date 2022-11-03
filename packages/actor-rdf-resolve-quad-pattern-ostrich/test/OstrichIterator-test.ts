import arrayifyStream from 'arrayify-stream';
import type { OstrichStore } from 'ostrich-bindings';
import { quadDelta, quadVersion } from 'ostrich-bindings/lib/utils';
import { DataFactory } from 'rdf-data-factory';
import type { VersionContext } from '../lib/ActorRdfResolveQuadPatternOstrich';
import { OstrichIterator } from '../lib/OstrichIterator';
import { MockedOstrichStore } from '../mocks/MockedOstrichStore';
const quad = require('rdf-quad');
const DF = new DataFactory();

describe('OstrichIterator', () => {
  const vm0: VersionContext = { type: 'version-materialization', version: 0 };
  const dm01A: VersionContext = { type: 'delta-materialization', versionStart: 0, versionEnd: 1, queryAdditions: true };
  const dm23A: VersionContext = { type: 'delta-materialization', versionStart: 2, versionEnd: 3, queryAdditions: true };
  const dm01D: VersionContext = {
    type: 'delta-materialization',
    versionStart: 0,
    versionEnd: 1,
    queryAdditions: false,
  };
  const dm23D: VersionContext = {
    type: 'delta-materialization',
    versionStart: 2,
    versionEnd: 3,
    queryAdditions: false,
  };
  const vq: VersionContext = { type: 'version-query' };
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

  it('should be instantiatable', () => {
    return expect(() => new OstrichIterator(store,
      vm0,
      DF.namedNode('s1'),
      DF.namedNode('p1'),
      DF.namedNode('o1'))).not.toThrow();
  });

  it('should return the correct stream for ? ? ? VM 0', async() => {
    expect(await arrayifyStream(new OstrichIterator(store,
      vm0,
      DF.variable('s'),
      DF.variable('p'),
      DF.variable('o'),
      {}))).toEqual([
      quad('s0', 'p1', 'o1'),
      quad('s0', 'p1', 'o2'),
    ]);
  });

  it('should return the correct stream for ? ? ? DM 0-1 (+)', async() => {
    expect(await arrayifyStream(new OstrichIterator(store,
      dm01A,
      DF.variable('s'),
      DF.variable('p'),
      DF.variable('o'),
      {}))).toEqual([
      quadDelta(quad('s1', 'p1', 'o1'), true),
      quadDelta(quad('s1', 'p1', 'o2'), true),
    ]);
  });

  it('should return the correct stream for s0 ? ? DM 0-1 (+)', async() => {
    expect(await arrayifyStream(new OstrichIterator(store,
      dm01A,
      DF.namedNode('s0'),
      DF.variable('p'),
      DF.variable('o'),
      {}))).toEqual([]);
  });

  it('should return the correct stream for s1 ? ? DM 0-1 (+)', async() => {
    expect(await arrayifyStream(new OstrichIterator(store,
      dm01A,
      DF.namedNode('s1'),
      DF.variable('p'),
      DF.variable('o'),
      {}))).toEqual([
      quadDelta(quad('s1', 'p1', 'o1'), true),
      quadDelta(quad('s1', 'p1', 'o2'), true),
    ]);
  });

  it('should return the correct stream for ? ? ? DM 2-3 (+)', async() => {
    expect(await arrayifyStream(new OstrichIterator(store,
      dm23A,
      DF.variable('s'),
      DF.variable('p'),
      DF.variable('o'),
      {}))).toEqual([]);
  });

  it('should return the correct stream for ? ? ? DM 0-1 (-)', async() => {
    expect(await arrayifyStream(new OstrichIterator(store,
      dm01D,
      DF.variable('s'),
      DF.variable('p'),
      DF.variable('o'),
      {}))).toEqual([
      quadDelta(quad('s0', 'p1', 'o1'), false),
      quadDelta(quad('s0', 'p1', 'o2'), false),
    ]);
  });

  it('should return the correct stream for s0 ? ? DM 0-1 (-)', async() => {
    expect(await arrayifyStream(new OstrichIterator(store,
      dm01D,
      DF.namedNode('s0'),
      DF.variable('p'),
      DF.variable('o'),
      {}))).toEqual([
      quadDelta(quad('s0', 'p1', 'o1'), false),
      quadDelta(quad('s0', 'p1', 'o2'), false),
    ]);
  });

  it('should return the correct stream for s1 ? ? DM 0-1 (-)', async() => {
    expect(await arrayifyStream(new OstrichIterator(store,
      dm01D,
      DF.namedNode('s1'),
      DF.variable('p'),
      DF.variable('o'),
      {}))).toEqual([]);
  });

  it('should return the correct stream for ? ? ? DM 2-3 (-)', async() => {
    expect(await arrayifyStream(new OstrichIterator(store,
      dm23D,
      DF.variable('s'),
      DF.variable('p'),
      DF.variable('o'),
      {}))).toEqual([]);
  });

  it('should return the correct stream for s0 VQ', async() => {
    expect(await arrayifyStream(new OstrichIterator(store,
      vq,
      DF.namedNode('s0'),
      DF.variable('p'),
      DF.variable('o'),
      {}))).toEqual([
      quadVersion(quad('s0', 'p1', 'o1'), [ 0 ]),
      quadVersion(quad('s0', 'p1', 'o2'), [ 0 ]),
    ]);
  });

  it('should not return anything when the document is closed', async() => {
    await store.close();
    expect(await arrayifyStream(new OstrichIterator(store,
      vq,
      DF.variable('s'),
      DF.variable('p'),
      DF.variable('o'),
      {}))).toEqual([]);
  });

  it('should resolve to an error if the document emits an error in VM', async() => {
    const e = new Error('OSTRICH error');
    store.setError(e);
    await expect(arrayifyStream(new OstrichIterator(store,
      vm0,
      DF.variable('s'),
      DF.variable('p'),
      DF.variable('o'),
      {}))).rejects.toBe(e);
  });

  it('should resolve to an error if the document emits an error in DM', async() => {
    const e = new Error('OSTRICH error');
    store.setError(e);
    await expect(arrayifyStream(new OstrichIterator(store,
      dm01A,
      DF.variable('s'),
      DF.variable('p'),
      DF.variable('o'),
      {}))).rejects.toBe(e);
  });

  it('should resolve to an error if the document emits an error in VQ', async() => {
    const e = new Error('OSTRICH error');
    store.setError(e);
    await expect(arrayifyStream(new OstrichIterator(store,
      vq,
      DF.variable('s'),
      DF.variable('p'),
      DF.variable('o'),
      {}))).rejects.toBe(e);
  });

  it('should only call query once', async() => {
    const iterator = new OstrichIterator(store,
      vm0,
      DF.variable('s'),
      DF.variable('p'),
      DF.variable('o'),
      {});
    const spy = jest.spyOn(store, 'searchTriplesVersionMaterialized');
    iterator._read(1, () => {
      // Do nothing
    });
    iterator._read(1, () => {
      // Do nothing
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
