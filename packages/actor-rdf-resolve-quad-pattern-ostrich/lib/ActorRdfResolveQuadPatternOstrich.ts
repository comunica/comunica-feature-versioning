import type {
  IActionRdfResolveQuadPattern,
  IActorRdfResolveQuadPatternOutput, IQuadSource,
} from '@comunica/bus-rdf-resolve-quad-pattern';
import {
  ActorRdfResolveQuadPatternSource, hasContextSingleSourceOfType,
} from '@comunica/bus-rdf-resolve-quad-pattern';
import { getContextSource } from '@comunica/bus-rdf-resolve-quad-pattern/lib/utils';
import { KeysRdfResolveQuadPattern } from '@comunica/context-entries-versioning';
import type { IActorArgs, IActorTest, ActionContext } from '@comunica/core';
import type { VersionContext } from '@comunica/types-versioning';
import type * as RDF from '@rdfjs/types';
import type { OstrichStore } from 'ostrich-bindings';
import { fromPath } from 'ostrich-bindings';
import { OstrichQuadSource } from './OstrichQuadSource';

/**
 * A comunica OSTRICH RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternOstrich extends ActorRdfResolveQuadPatternSource
  implements IActorRdfResolveQuadPatternOstrichArgs {
  public readonly ostrichFiles?: string[];
  public stores: Record<string, Promise<OstrichStore>> = {};
  public closed = false;

  protected shouldClose: boolean;
  protected queries = 0;

  public constructor(args: IActorRdfResolveQuadPatternOstrichArgs) {
    super(args);
  }

  public initializeOstrich(ostrichPath: string): Promise<any> {
    // eslint-disable-next-line no-return-assign
    return this.stores[ostrichPath] = fromPath(ostrichPath, { readOnly: true });
  }

  public async initialize(): Promise<any> {
    (this.ostrichFiles || []).forEach(ostrichFile => this.initializeOstrich(ostrichFile));
    return null;
  }

  public async deinitialize(): Promise<any> {
    process.on('exit', () => this.safeClose());
    process.on('SIGINT', () => this.safeClose());
    return null;
  }

  public close(): void {
    if (this.closed) {
      throw new Error('This actor can only be closed once.');
    }
    if (!this.queries) {
      this.shouldClose = false;
      Object.keys(this.stores).forEach(
        async ostrichFile => (await this.stores[ostrichFile]).close(),
      );
      this.closed = true;
    } else {
      this.shouldClose = true;
    }
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    if (!hasContextSingleSourceOfType('ostrichFile', action.context)) {
      throw new Error(`${this.name} requires a single source with a ostrichFile to be present in the context.`);
    }
    if (action.pattern.graph.termType !== 'DefaultGraph') {
      throw new Error(`${this.name} can only perform versioned queries in the default graph.`);
    }
    if (action.context.has(KeysRdfResolveQuadPattern.version) &&
      (action.context.getSafe<VersionContext>(KeysRdfResolveQuadPattern.version).type !== 'version-materialization' &&
        action.context.getSafe<VersionContext>(KeysRdfResolveQuadPattern.version).type !== 'delta-materialization' &&
        action.context.getSafe<VersionContext>(KeysRdfResolveQuadPattern.version).type !== 'version-query')) {
      throw new Error(`${this.name} requires a version context.`);
    }
    return true;
  }

  protected safeClose(): void {
    if (!this.closed) {
      this.close();
    }
  }

  protected async getSource(context: ActionContext): Promise<IQuadSource> {
    const ostrichFile: string = (<any> getContextSource(context)).value;
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    if (!this.stores[ostrichFile]) {
      await this.initializeOstrich(ostrichFile);
    }
    return new OstrichQuadSource(
      await this.stores[ostrichFile],
      context.get(KeysRdfResolveQuadPattern.version) || { type: 'version-materialization', version: -1 },
    );
  }

  protected async getOutput(
    source: IQuadSource,
    pattern: RDF.Quad,
    context: ActionContext,
  ): Promise<IActorRdfResolveQuadPatternOutput> {
    // Attach totalItems to the output
    this.queries++;

    const output: IActorRdfResolveQuadPatternOutput = await super.getOutput(source, pattern, context);
    output.data.on('end', () => {
      this.queries--;
      if (this.shouldClose) {
        this.close();
      }
    });
    return output;
  }
}

export interface IActorRdfResolveQuadPatternOstrichArgs
  extends IActorArgs<IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput> {
  /**
   * The OSTRICH files to preload.
   */
  ostrichFiles?: string[];
}
