import type { IActionRdfResolveQuadPattern,
  IActorRdfResolveQuadPatternOutput } from '@comunica/bus-rdf-resolve-quad-pattern';
import { ActorRdfResolveQuadPattern } from '@comunica/bus-rdf-resolve-quad-pattern';
import { KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import { KeysRdfResolveQuadPattern as KeysRdfResolveQuadPatternVersioning } from '@comunica/context-entries-versioning';
import type { IActorTest } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import type { VersionContext } from '@comunica/types-versioning';
import arrayifyStream from 'arrayify-stream';
import type { OstrichStore } from 'ostrich-bindings';
import type { Algebra } from 'sparqlalgebrajs';
import { ActorRdfResolveQuadPatternOstrich } from '../lib/ActorRdfResolveQuadPatternOstrich';
import { MockedOstrichStore } from '../mocks/MockedOstrichStore';
const quad = require('rdf-quad');

describe('ActorRdfResolveQuadPatternOstrich', () => {
  let bus: Bus<ActorRdfResolveQuadPatternOstrich,
  IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfResolveQuadPatternOstrich module', () => {
    it('should be a function', () => {
      expect(ActorRdfResolveQuadPatternOstrich).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfResolveQuadPatternOstrich constructor', () => {
      expect(new (<any> ActorRdfResolveQuadPatternOstrich)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveQuadPatternOstrich);
      expect(new (<any> ActorRdfResolveQuadPatternOstrich)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveQuadPattern);
    });

    it('should not be able to create new ActorRdfResolveQuadPatternOstrich objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfResolveQuadPatternOstrich)(); }).toThrow();
    });
  });

  describe('An ActorRdfResolveQuadPatternOstrich instance', () => {
    let actor: ActorRdfResolveQuadPatternOstrich;
    let ostrichDocument: MockedOstrichStore;
    let version: VersionContext;
    let pattern: Algebra.Pattern;

    beforeEach(() => {
      actor = new ActorRdfResolveQuadPatternOstrich({ name: 'actor', bus });
      ostrichDocument = new MockedOstrichStore({
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
      require('ostrich-bindings').__setMockedDocument(ostrichDocument);
      version = { type: 'version-materialization', version: 0 };
      pattern = quad('?', '?', '?');
    });

    it('should test', () => {
      return expect(actor.test({
        context: new ActionContext({
          [KeysRdfResolveQuadPattern.source.name]: { type: 'ostrichFile', value: 'abc' }, version,
        }),
        pattern,
      })).resolves.toBeTruthy();
    });

    it('should not test on the non-default graph', () => {
      return expect(actor.test({
        context: new ActionContext({
          [KeysRdfResolveQuadPattern.source.name]: { type: 'ostrichFile', value: 'abc' }, version,
        }),
        pattern: quad('?', '?', '?', 'G'),
      })).rejects.toBeTruthy();
    });

    it('should not test without a context', () => {
      return expect(actor.test({ pattern, context: new ActionContext() })).rejects.toBeTruthy();
    });

    it('should not test without a version context', () => {
      return expect(actor.test({
        context: new ActionContext({ [KeysRdfResolveQuadPattern.source.name]: { type: 'ostrichFile', value: 'abc' }}),
        pattern: <any> null,
      })).rejects.toBeTruthy();
    });

    it('should not test with an invalid a version context', () => {
      return expect(actor.test({
        context: new ActionContext({
          [KeysRdfResolveQuadPattern.source.name]: { type: 'ostrichFile', value: 'abc' },
          [KeysRdfResolveQuadPatternVersioning.version.name]: { type: 'wrong' },
        }),
        pattern,
      })).rejects.toBeTruthy();
    });

    it('should not test without a file', () => {
      return expect(actor.test({ pattern, context: new ActionContext({}) })).rejects.toBeTruthy();
    });

    it('should not test on an invalid file', () => {
      return expect(actor.test({
        context: new ActionContext({ [KeysRdfResolveQuadPattern.source.name]: { type: 'ostrichFile', value: null }}),
        pattern,
      })).rejects.toBeTruthy();
    });

    it('should not test on no file', () => {
      return expect(actor.test({
        context: new ActionContext({ [KeysRdfResolveQuadPattern.source.name]: { type: 'entrypoint', value: null }}),
        pattern,
      })).rejects.toBeTruthy();
    });

    it('should not test on no source', () => {
      return expect(actor.test({ pattern,
        context: new ActionContext({
          [KeysRdfResolveQuadPattern.source.name]: null,
        }) }))
        .rejects.toBeTruthy();
    });

    it('should allow OSTRICH initialization with a valid file', () => {
      return expect(actor.initializeOstrich('myfile')).resolves.toBeTruthy();
    });

    it('should fail on OSTRICH initialization with an invalid file', () => {
      return expect(actor.initializeOstrich(<any>null)).rejects.toBeTruthy();
    });

    it('should allow a OSTRICH quad source to be created for a context with a valid file', () => {
      return expect((<any> actor).getSource(new ActionContext(
        { [KeysRdfResolveQuadPattern.source.name]: { type: 'ostrichFile', value: 'myFile' }},
      ))).resolves.toBeTruthy();
    });

    it('should create only a OSTRICH quad source only once per file', () => {
      let doc1: OstrichStore;
      return (<any> actor).getSource(new ActionContext(
        { [KeysRdfResolveQuadPattern.source.name]: { type: 'ostrichFile', value: 'myFile' }},
      ))
        .then((file: any) => {
          doc1 = file.store;
          return (<any> actor).getSource(new ActionContext(
            { [KeysRdfResolveQuadPattern.source.name]: { type: 'ostrichFile', value: 'myFile' }},
          ));
        }).then((file: any) => {
          expect(file.store).toBe(doc1);
        });
    });

    it('should create different documents in OSTRICH quad source for different files', () => {
      let doc1: OstrichStore;
      return (<any> actor).getSource(new ActionContext(
        { [KeysRdfResolveQuadPattern.source.name]: { type: 'ostrichFile', value: 'myFile1' }},
      ))
        .then((file: any) => {
          doc1 = file.store;
          require('ostrich-bindings').__setMockedDocument(new MockedOstrichStore({}));
          return (<any> actor).getSource(new ActionContext(
            { [KeysRdfResolveQuadPattern.source.name]: { type: 'ostrichFile', value: 'myFile2' }},
          ));
        }).then((file: any) => {
          expect(file.store).not.toBe(doc1);
        });
    });

    it('should initialize OSTRICH sources when passed to the constructor', async() => {
      const myActor = new ActorRdfResolveQuadPatternOstrich({ name: 'actor', bus, ostrichFiles: [ 'myFile' ]});
      await myActor.initialize();
      await expect(myActor.stores.myFile).resolves.toBeInstanceOf(MockedOstrichStore);
    });

    it('should run on ? ? ?', () => {
      return actor.run({ context: new ActionContext(
        {
          [KeysRdfResolveQuadPattern.source.name]: { type: 'ostrichFile', value: 'abc' },
          [KeysRdfResolveQuadPatternVersioning.version.name]: version,
        },
      ),
      pattern })
        .then(async output => {
          expect(await new Promise(resolve => output.data.getProperty('metadata', resolve)))
            .toEqual({ cardinality: { value: 2, type: 'exact' }});
          expect(await arrayifyStream(output.data)).toEqual([
            quad('s0', 'p1', 'o1'),
            quad('s0', 'p1', 'o2'),
          ]);
        });
    });

    it('should run on ? ? ? with a falsy version context', () => {
      return actor.run({ context: new ActionContext(
        { [KeysRdfResolveQuadPattern.source.name]: { type: 'ostrichFile', value: 'abc' },
          [KeysRdfResolveQuadPatternVersioning.version.name]: null },
      ),
      pattern })
        .then(async output => {
          expect(await new Promise(resolve => output.data.getProperty('metadata', resolve)))
            .toEqual({ cardinality: { value: 2, type: 'exact' }});
          expect(await arrayifyStream(output.data)).toEqual([
            quad('s2', 'p1', 'o1'),
            quad('s2', 'p1', 'o2'),
          ]);
        });
    });

    it('should run on ? ? ? without data', () => {
      return actor.run({ context: new ActionContext(
        { [KeysRdfResolveQuadPattern.source.name]: { type: 'ostrichFile', value: 'abc' },
          [KeysRdfResolveQuadPatternVersioning.version.name]: version },
      ),
      pattern })
        .then(async output => {
          expect(await new Promise(resolve => output.data.getProperty('metadata', resolve)))
            .toEqual({ cardinality: { value: 2, type: 'exact' }});
        });
    });

    it('should run on s0 ? ?', () => {
      const patternThis = quad('s0', '?', '?');
      return actor.run(
        {
          context: new ActionContext(
            { [KeysRdfResolveQuadPattern.source.name]: { type: 'ostrichFile', value: 'abc' },
              [KeysRdfResolveQuadPatternVersioning.version.name]: version },
          ),
          pattern: patternThis,
        },
      )
        .then(async output => {
          expect(await new Promise(resolve => output.data.getProperty('metadata', resolve)))
            .toEqual({ cardinality: { value: 2, type: 'exact' }});
          expect(await arrayifyStream(output.data)).toEqual([
            quad('s0', 'p1', 'o1'),
            quad('s0', 'p1', 'o2'),
          ]);
        });
    });

    it('should run on s3 ? ?', () => {
      const patternThis = quad('s3', '?', '?');
      return actor.run(
        {
          context: new ActionContext(
            { [KeysRdfResolveQuadPattern.source.name]: { type: 'ostrichFile', value: 'abc' },
              [KeysRdfResolveQuadPatternVersioning.version.name]: version },
          ),
          pattern: patternThis,
        },
      )
        .then(async output => {
          expect(await new Promise(resolve => output.data.getProperty('metadata', resolve)))
            .toEqual({ cardinality: { value: 0, type: 'exact' }});
          expect(await arrayifyStream(output.data)).toEqual([]);
        });
    });

    it('should be closeable when no queries were running', () => {
      actor.close();
      return expect(actor.closed).toBe(true);
    });

    it('should be closeable when queries were running', () => {
      (<any> actor).queries++;
      actor.close();
      expect(actor.closed).toBe(false);
      (<any> actor).queries--;
      expect((<any> actor).shouldClose).toBe(true);
      const patternThis = quad('s3', '?', '?');
      return actor.run(
        {
          context: new ActionContext(
            { [KeysRdfResolveQuadPattern.source.name]: { type: 'ostrichFile', value: 'abc' },
              [KeysRdfResolveQuadPatternVersioning.version.name]: version },
          ),
          pattern: patternThis,
        },
      )
        .then(async output => {
          expect(await arrayifyStream(output.data)).toBeTruthy();
          expect((<any> actor).shouldClose).toBe(false);
          expect(actor.closed).toBe(true);
        });
    });

    it('should only be closeable once', () => {
      actor.close();
      return expect(() => actor.close()).toThrow();
    });

    it('should be initializable', () => {
      return expect(() => actor.initialize()).not.toThrow();
    });

    it('should be deinitializable', () => {
      return expect(() => actor.deinitialize()).not.toThrow();
    });

    it('should close on process.exit', async() => {
      await actor.deinitialize();
      process.emit('exit', 0);
      expect(actor.closed).toBe(true);
      actor.closed = false;
    });

    it('should close on process.SIGINT', async() => {
      await actor.deinitialize();
      process.emit(<any> 'SIGINT');
      expect(actor.closed).toBe(true);
      actor.closed = false;
    });
  });
});
