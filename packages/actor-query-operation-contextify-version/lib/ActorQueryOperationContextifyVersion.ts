import type { IActionQueryOperation,
  IActorQueryOperationTypedMediatedArgs, MediatorQueryOperation } from '@comunica/bus-query-operation';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysRdfResolveQuadPattern } from '@comunica/context-entries-versioning';
import type { IActorTest } from '@comunica/core';
import type { IQueryOperationResult } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';

/**
 * A comunica Contextify Version Query Operation Actor.
 */
export class ActorQueryOperationContextifyVersion extends ActorQueryOperation
  implements IActorQueryOperationContextifyVersionArgs {
  protected static readonly FACTORY: Factory = new Factory();

  public readonly mediatorQueryOperation: MediatorQueryOperation;

  public readonly baseGraphUri: string;
  public readonly numericalVersions: boolean;

  public constructor(args: IActorQueryOperationContextifyVersionArgs) {
    super(args);
  }

  /**
   * Unwrap a project operation, and do nothing if it's any other operation.
   * @param {Operation} operation Any kind of operation.
   * @return {Operation} An operation.
   */
  public static unwrapProject(operation: Algebra.Operation): Algebra.Operation {
    if (operation.type === 'project') {
      operation = operation.input;
    }
    return operation;
  }

  /**
   * Check if the given operation is a BGP operation with a single pattern.
   * @param {Operation} operation Any kind of operation.
   * @return {boolean} If the operation was a BGP operation with a single pattern.
   */
  public static isSingularBgp(operation: Algebra.Operation): boolean {
    return operation.type === 'bgp' && operation.patterns.length === 1;
  }

  /**
   * Convert a graph to a version string or a number.
   * @param baseGraphUri The base graph URI, can be falsy.
   * @param numericalVersions If the graph should be converted to a number.
   * @param {string} graph A graph URI string.
   * @return {any} A version string or number.
   */
  public static graphToStringOrNumber(baseGraphUri: string, numericalVersions: boolean, graph: string): any {
    if (baseGraphUri && graph.startsWith(baseGraphUri)) {
      graph = graph.slice(baseGraphUri.length);
    }
    if (numericalVersions) {
      return Number.parseInt(graph, 10);
    }
    return graph;
  }

  /**
   * Convert a graph to a version string or a number, based on the settings of this actor.
   * @param {string} graph A graph URI string.
   * @return {any} A version string or number.
   */
  public graphToStringOrNumber(graph: string): any {
    return ActorQueryOperationContextifyVersion.graphToStringOrNumber(this.baseGraphUri, this.numericalVersions, graph);
  }

  /**
   * Rewrite the given operation to an operation with a version context.
   * @param {IActionQueryOperation} action An operation action.
   * @return {IActionQueryOperation} A version operation action or null if no rewriting could be done.
   */
  public getContextifiedVersionOperation(action: IActionQueryOperation): IActionQueryOperation | undefined {
    let operation: Algebra.Operation | undefined;
    const versionContext: any = {};
    let valid = false;
    if (action.operation.type === 'pattern' && action.operation.graph.termType === 'Variable') {
      // Version query
      valid = true;
      operation = action.operation;
      versionContext.type = 'version-query';
    } else if (action.operation.type === 'pattern' && action.operation.graph.termType !== 'DefaultGraph') {
      // Version materialization
      valid = true;

      // Create operation
      operation = ActorQueryOperationContextifyVersion.FACTORY.createPattern(
        action.operation.subject,
        action.operation.predicate,
        action.operation.object,
      );

      // Create version context
      const version = this.graphToStringOrNumber(action.operation.graph.value);
      versionContext.type = 'version-materialization';
      versionContext.version = version;
    } else if (action.operation.type === 'filter' &&
      action.operation.expression.expressionType === 'existence' &&
      action.operation.expression.not) {
      // Delta materialization
      const left = action.operation.input;
      const right = action.operation.expression.input;

      // Detect not-exists filter of the same pattern over two graphs
      if (ActorQueryOperationContextifyVersion.isSingularBgp(left) &&
        ActorQueryOperationContextifyVersion.isSingularBgp(right)) {
        // Remove graph from patterns
        const patterns: Algebra.Pattern[] = [
          left.patterns[0],
          right.patterns[0],
        ].map(pattern => ActorQueryOperationContextifyVersion.FACTORY.createPattern(
          pattern.subject, pattern.predicate, pattern.object,
        ));

        // Check if patterns are equal
        if (patterns[0].equals(patterns[1])) {
          valid = true;
          // Sort start and end graph lexicographically
          let [ versionStart, versionEnd ] = [
            left.patterns[0].graph.value,
            right.patterns[0].graph.value,
          ];
          const queryAdditions: boolean = versionStart > versionEnd;
          if (queryAdditions) {
            [ versionStart, versionEnd ] = [ versionEnd, versionStart ];
          }

          // Create operation
          operation = patterns[0];

          // Create version context
          versionContext.type = 'delta-materialization';
          versionContext.versionStart = this.graphToStringOrNumber(versionStart);
          versionContext.versionEnd = this.graphToStringOrNumber(versionEnd);
          versionContext.queryAdditions = queryAdditions;
        }
      }
    }

    if (!valid || !operation) {
      return;
    }

    const context = action.context.set(KeysRdfResolveQuadPattern.version, versionContext);

    return { operation, context };
  }

  public async test(action: IActionQueryOperation): Promise<IActorTest> {
    if (action.context &&
      !action.context.has(KeysRdfResolveQuadPattern.version) &&
      this.getContextifiedVersionOperation(action)) {
      return { httpRequests: 0 };
    }
    throw new Error('Version contextification is not applicable for this context.');
  }

  public async run(action: IActionQueryOperation): Promise<IQueryOperationResult> {
    return await this.mediatorQueryOperation.mediate(this.getContextifiedVersionOperation(action)!);
  }
}

export interface IActorQueryOperationContextifyVersionArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * @default {version:}
   */
  baseGraphUri: string;
  /**
   * @default {true}
   */
  numericalVersions: boolean;
}
