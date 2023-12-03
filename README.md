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
(contents override environment variables with the same name)

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

| Input                  | Default | Description                                |
| ---------------------- | ------- | ------------------------------------------ |
| `source-file`          | N/A | _template_ that will be merged into the target |
| `target-file`          | N/A | Target to merge into, created if missing       |
| `substitution-file`    | ``  | values that can be inserted into the template  |
| `source-path`          | ``  | Part of source to be copied from when merging  |
| `target-path`          | ``  | Part of target to be pasted into when merging  |
| `skipped-source-paths` | ``  | Parts of source to be removed before merging   |
| `skipped-target-paths` | ``  | Parts of target to be removed before merging   |
| `appended-array-paths` | ``  | Arrays to be merged by appending the values    |

Contents will be merged recursively relative to `source-path`/`target-path`.
All other paths are relative to the merging root.
Only arrays can be merged with arrays and only objects with objects.
All other elements will just be replaced.

A few example paths:

- `` (empty path)
- `abc`
- `abc.def`
- `[0].x` (array index `0` then object key `x`)
- `["\""]` (use double quotes to match non-standard keys)

Multi-line path*s* also allow globbing:

- `*` (matches all direct keys of an object or array)
- `[0].*.x` (matches all `x`-properties of the values within the first array entries)

Paths within the template allow access to values within the substitution file:
`$(some.path.within["substitution-file"])`

## Outputs

There are no outputs yet.
