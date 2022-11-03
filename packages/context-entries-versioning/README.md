# Comunica Context Entries for Versioning

[![npm version](https://badge.fury.io/js/%40comunica%2Fcontext-entries-versioning.svg)](https://www.npmjs.com/package/@comunica/context-entries-versioning)

A collection of reusable Comunica context key definitions for versioning.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/context-entries-versioning
```

## Usage

```typescript
import { KeysRdfResolveQuadPattern } from '@comunica/context-entries-versioning';

// ...

const versionContext = context.get(KeysRdfResolveQuadPattern.version);
```

All available keys are available in [`Keys`](https://github.com/comunica/comunica-feature-versioning/blob/master/packages/context-entries-versioning/lib/Keys.ts).
