# Merge JSON with template

[![GitHub Super-Linter](https://github.com/mpmxyz/merge-json-with-template/actions/workflows/linter.yml/badge.svg)](https://github.com/mpmxyz/merge-json-with-template/actions/workflows/linter.yml)
[![CI](https://github.com/mpmxyz/merge-json-with-template/actions/workflows/ci.yml/badge.svg)](https://github.com/mpmxyz/merge-json-with-template/actions/workflows/ci.yml)
[![Check dist/](https://github.com/mpmxyz/merge-json-with-template/actions/workflows/check-dist.yml/badge.svg)](https://github.com/mpmxyz/merge-json-with-template/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/mpmxyz/merge-json-with-template/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/mpmxyz/merge-json-with-template/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

This actions merges two JSON files together. (source is merged into target)

The source JSON file is read as a template:

- `$VAR` or `$(VAR)` will be replaced by the value of the environment variable `VAR`.
- `$$` becomes `$`

It is also possible to supply more replacements within another JSON file.

## Usage

Here's an example of how to use this action in a workflow file:

```yaml
name: Example Workflow

on:
  workflow_dispatch:

jobs:
  demo:
    name: Merge some JSON
    runs-on: ubuntu-latest

    steps:
      - name: Get example files
        id: checkout
        uses: actions/checkout@v4
        repository: mpmxyz/merge-json-with-template
      - name: Merge b into a
        id: execute
        uses: mpmxyz/merge-json-with-template@latest
        with:
          source-file: "samples/b.json"
          target-file: "samples/a.json"
      - name: Show result
        id: output
        run: cat "samples/a.json"
```

## Inputs

| Input                  | Default | Description                     |
| ---------------------- | ------- | ------------------------------- |
| `source-file`          | N/A | JSON file _template_ that will be merged into the target |
| `target-file`          | N/A | Target JSON file that will will be merged into |
| `substitution-file`    | ``  | JSON File with values that can be inserted into the template, (optional, overrides environment variables) |
| `source-path`          | ``  | Part of source that will be copied from when merging. (optional, single-line path) |
| `target-path`          | ``  | Part of target that will be pasted into when merging. (optional, single-line path) |
| `skipped-source-paths` | ``  | Parts of source that should be removed before merging (optional, multi-line path, relative to `source-path`)|
| `skipped-target-paths` | ``  | Parts of target that should be removed before merging (optional, multi-line path, relative to `target-path`)|
| `appended-array-paths` | ``  | Arrays that should be merged by appending new values instead of overwriting the first elements (optional, multi-line path, relative to merging)|

Contents will be merged recursively relative to `source-path`/`target-path`.
Only arrays can be merged with arrays and only objects with objects.
All other elements will just be replaced.

A few example paths:

- `` (empty path)
- `abc`
- `abc.def`
- `[0].x` (array index `0` then object key `x`)
- `["\""]` (use double quotes to match non-standard keys)

Multi-line paths also allow globbing:

- `*` (matches all direct keys of an object or array)
- `[0].*.x` (matches all `x`-properties of the values within the first array entries)

Paths can also be used in the template file to access values deep within the substitution file:
`$(some.path.within["substitution-file"])`

## Outputs

There are no outputs yet.
