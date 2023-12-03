/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as fs from '../src/file-abstraction'
import * as main from '../src/main'
import { env } from 'process'

// Mock the action's main function
const runMock = jest.spyOn(main, 'run')

// Mock the GitHub Actions core library
let getInputMock: jest.SpyInstance
let getMultilineInputMock: jest.SpyInstance
let isDebugMock: jest.SpyInstance
let setFailedMock: jest.SpyInstance

// Mock fs library
let existsSyncMock: jest.SpyInstance
let readFileSyncMock: jest.SpyInstance
let writeFileSyncMock: jest.SpyInstance

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    getMultilineInputMock = jest
      .spyOn(core, 'getMultilineInput')
      .mockImplementation()
    isDebugMock = jest.spyOn(core, 'isDebug').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()

    existsSyncMock = jest.spyOn(fs, 'existsSync').mockImplementation()
    readFileSyncMock = jest.spyOn(fs, 'readFileSync').mockImplementation()
    writeFileSyncMock = jest.spyOn(fs, 'writeFileSync').mockImplementation()
  })

  const SOURCE_FILE = 'source.json'
  const TARGET_FILE = 'target.json'
  const SUBSTITUTION_FILE = 'config.json'

  function mockForArgs(args: {
    debug: boolean
    source: string | undefined //file content
    target: string | undefined //file content
    substitution: string | undefined //file content
    'source-file': string | undefined
    'target-file': string | undefined
    'substitution-file': string | undefined
    'source-path': string | undefined
    'target-path': string | undefined
    'skipped-source-paths': string[] | undefined
    'skipped-target-paths': string[] | undefined
    'appended-array-paths': string[] | undefined
  }): void {
    isDebugMock.mockImplementation(() => args.debug)
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'source-file':
          return args['source-file'] ?? ''
        case 'target-file':
          return args['target-file'] ?? ''
        case 'substitution-file':
          return args['substitution-file'] ?? ''
        case 'source-path':
          return args['source-path'] ?? ''
        case 'target-path':
          return args['target-path'] ?? ''
        default:
          throw expect(`Tried to access unknown input ${name}`).toBeFalsy()
      }
    })
    getMultilineInputMock.mockImplementation((name: string): string[] => {
      switch (name) {
        case 'skipped-source-paths':
          return args['skipped-source-paths'] ?? []
        case 'skipped-target-paths':
          return args['skipped-target-paths'] ?? []
        case 'appended-array-paths':
          return args['appended-array-paths'] ?? []
        default:
          throw expect(`Tried to access unknown input ${name}`).toBeFalsy()
      }
    })
    existsSyncMock.mockImplementation((file: string) => {
      switch (file) {
        case '':
          return false
        case SOURCE_FILE:
          return args.source !== undefined
        case TARGET_FILE:
          return args.target !== undefined
        case SUBSTITUTION_FILE:
          return args.substitution !== undefined
        default:
          throw expect(`Tried to access unknown file ${file}`).toBeFalsy()
      }
    })
    readFileSyncMock.mockImplementation((file: string) => {
      let result: string | undefined = undefined
      switch (file) {
        case SOURCE_FILE:
          result = args.source
          break
        case TARGET_FILE:
          result = args.target
          break
        case SUBSTITUTION_FILE:
          result = args.substitution
          break
      }
      return (
        result ??
        expect(`Tried to read unknown/non-existing file "${file}"`).toBeFalsy()
      )
    })
  }

  it('fails without source-file', async () => {
    mockForArgs({
      debug: false,
      source: '{}',
      target: '{}',
      substitution: '{}',
      'source-file': undefined,
      'target-file': TARGET_FILE,
      'substitution-file': undefined,
      'source-path': undefined,
      'target-path': undefined,
      'skipped-source-paths': undefined,
      'skipped-target-paths': undefined,
      'appended-array-paths': undefined
    })

    await main.run()
    expect(runMock).toHaveReturned()

    expect(setFailedMock).toHaveBeenCalledTimes(1)
    expect(setFailedMock).toHaveBeenCalledWith(
      expect.stringContaining('source-file')
    )
  })

  it('fails without target-file', async () => {
    mockForArgs({
      debug: false,
      source: '{}',
      target: '{}',
      substitution: '{}',
      'source-file': SOURCE_FILE,
      'target-file': undefined,
      'substitution-file': undefined,
      'source-path': undefined,
      'target-path': undefined,
      'skipped-source-paths': undefined,
      'skipped-target-paths': undefined,
      'appended-array-paths': undefined
    })

    await main.run()
    expect(runMock).toHaveReturned()

    expect(setFailedMock).toHaveBeenCalledTimes(1)
    expect(setFailedMock).toHaveBeenCalledWith(
      expect.stringContaining('target-file')
    )
  })

  it('fails when given source-file does not exist', async () => {
    mockForArgs({
      debug: false,
      source: undefined,
      target: '{}',
      substitution: undefined,
      'source-file': SOURCE_FILE,
      'target-file': TARGET_FILE,
      'substitution-file': undefined,
      'source-path': undefined,
      'target-path': undefined,
      'skipped-source-paths': undefined,
      'skipped-target-paths': undefined,
      'appended-array-paths': undefined
    })

    await main.run()
    expect(runMock).toHaveReturned()

    expect(setFailedMock).toHaveBeenCalledTimes(1)
    expect(setFailedMock).toHaveBeenCalledWith(
      expect.stringContaining('source-file')
    )
  })

  it('completes when given target-file does not exist', async () => {
    mockForArgs({
      debug: false,
      source: '{}',
      target: undefined,
      substitution: undefined,
      'source-file': SOURCE_FILE,
      'target-file': TARGET_FILE,
      'substitution-file': undefined,
      'source-path': undefined,
      'target-path': undefined,
      'skipped-source-paths': undefined,
      'skipped-target-paths': undefined,
      'appended-array-paths': undefined
    })
    await main.run()
    expect(runMock).toHaveReturned()

    expect(setFailedMock).not.toHaveBeenCalled()
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1)
    expect(writeFileSyncMock).toHaveBeenCalledWith(TARGET_FILE, '{}')
  })

  it('fails when given substitution-file does not exist', async () => {
    mockForArgs({
      debug: false,
      source: '{}',
      target: '{}',
      substitution: undefined,
      'source-file': SOURCE_FILE,
      'target-file': TARGET_FILE,
      'substitution-file': SUBSTITUTION_FILE,
      'source-path': undefined,
      'target-path': undefined,
      'skipped-source-paths': undefined,
      'skipped-target-paths': undefined,
      'appended-array-paths': undefined
    })

    await main.run()
    expect(runMock).toHaveReturned()

    expect(setFailedMock).toHaveBeenCalledTimes(1)
    expect(setFailedMock).toHaveBeenCalledWith(
      expect.stringContaining('substitution-file')
    )
  })

  it('fails when given source-file is invalid', async () => {
    mockForArgs({
      debug: false,
      source: 'no json',
      target: '{}',
      substitution: undefined,
      'source-file': SOURCE_FILE,
      'target-file': TARGET_FILE,
      'substitution-file': undefined,
      'source-path': undefined,
      'target-path': undefined,
      'skipped-source-paths': undefined,
      'skipped-target-paths': undefined,
      'appended-array-paths': undefined
    })

    await main.run()
    expect(runMock).toHaveReturned()

    expect(setFailedMock).toHaveBeenCalledTimes(1)
    expect(setFailedMock).toHaveBeenCalledWith(
      expect.stringContaining('source-file')
    )
  })

  it('fails when given target-file is invalid', async () => {
    mockForArgs({
      debug: false,
      source: '{}',
      target: 'no json',
      substitution: undefined,
      'source-file': SOURCE_FILE,
      'target-file': TARGET_FILE,
      'substitution-file': undefined,
      'source-path': undefined,
      'target-path': undefined,
      'skipped-source-paths': undefined,
      'skipped-target-paths': undefined,
      'appended-array-paths': undefined
    })
    await main.run()
    expect(runMock).toHaveReturned()

    expect(setFailedMock).toHaveBeenCalledTimes(1)
    expect(setFailedMock).toHaveBeenCalledWith(
      expect.stringContaining('target-file')
    )
  })

  it('fails when given substitution-file is invalid', async () => {
    mockForArgs({
      debug: false,
      source: '{}',
      target: '{}',
      substitution: 'nojson',
      'source-file': SOURCE_FILE,
      'target-file': TARGET_FILE,
      'substitution-file': SUBSTITUTION_FILE,
      'source-path': undefined,
      'target-path': undefined,
      'skipped-source-paths': undefined,
      'skipped-target-paths': undefined,
      'appended-array-paths': undefined
    })

    await main.run()
    expect(runMock).toHaveReturned()

    expect(setFailedMock).toHaveBeenCalledTimes(1)
    expect(setFailedMock).toHaveBeenCalledWith(
      expect.stringContaining('substitution-file')
    )
  })

  it('fails when source-path is invalid', async () => {
    mockForArgs({
      debug: false,
      source: '{}',
      target: '{}',
      substitution: undefined,
      'source-file': SOURCE_FILE,
      'target-file': TARGET_FILE,
      'substitution-file': undefined,
      'source-path': '..',
      'target-path': undefined,
      'skipped-source-paths': undefined,
      'skipped-target-paths': undefined,
      'appended-array-paths': undefined
    })

    await main.run()
    expect(runMock).toHaveReturned()

    expect(setFailedMock).toHaveBeenCalledTimes(1)
    expect(setFailedMock).toHaveBeenCalledWith(
      expect.stringContaining('source-path')
    )
  })

  it('fails when target-path is invalid', async () => {
    mockForArgs({
      debug: false,
      source: '{}',
      target: '{}',
      substitution: undefined,
      'source-file': SOURCE_FILE,
      'target-file': TARGET_FILE,
      'substitution-file': undefined,
      'source-path': undefined,
      'target-path': '..',
      'skipped-source-paths': undefined,
      'skipped-target-paths': undefined,
      'appended-array-paths': undefined
    })

    await main.run()
    expect(runMock).toHaveReturned()

    expect(setFailedMock).toHaveBeenCalledTimes(1)
    expect(setFailedMock).toHaveBeenCalledWith(
      expect.stringContaining('target-path')
    )
  })

  it('fails when a skipped-source-paths is invalid', async () => {
    mockForArgs({
      debug: false,
      source: '{}',
      target: '{}',
      substitution: undefined,
      'source-file': SOURCE_FILE,
      'target-file': TARGET_FILE,
      'substitution-file': undefined,
      'source-path': undefined,
      'target-path': undefined,
      'skipped-source-paths': ['..'],
      'skipped-target-paths': undefined,
      'appended-array-paths': undefined
    })

    await main.run()
    expect(runMock).toHaveReturned()

    expect(setFailedMock).toHaveBeenCalledTimes(1)
    expect(setFailedMock).toHaveBeenCalledWith(
      expect.stringContaining('skipped-source-paths')
    )
  })

  it('fails when skipped-target-paths is invalid', async () => {
    mockForArgs({
      debug: false,
      source: '{}',
      target: '{}',
      substitution: undefined,
      'source-file': SOURCE_FILE,
      'target-file': TARGET_FILE,
      'substitution-file': undefined,
      'source-path': undefined,
      'target-path': undefined,
      'skipped-source-paths': undefined,
      'skipped-target-paths': ['..'],
      'appended-array-paths': undefined
    })

    await main.run()
    expect(runMock).toHaveReturned()

    expect(setFailedMock).toHaveBeenCalledTimes(1)
    expect(setFailedMock).toHaveBeenCalledWith(
      expect.stringContaining('skipped-target-paths')
    )
  })

  it('fails when appended-array-paths is invalid', async () => {
    mockForArgs({
      debug: false,
      source: '{}',
      target: '{}',
      substitution: undefined,
      'source-file': SOURCE_FILE,
      'target-file': TARGET_FILE,
      'substitution-file': undefined,
      'source-path': undefined,
      'target-path': undefined,
      'skipped-source-paths': undefined,
      'skipped-target-paths': undefined,
      'appended-array-paths': ['..']
    })

    await main.run()
    expect(runMock).toHaveReturned()

    expect(setFailedMock).toHaveBeenCalledTimes(1)
    expect(setFailedMock).toHaveBeenCalledWith(
      expect.stringContaining('appended-array-paths')
    )
  })

  it('completes without touching the output file when nothing matches source and target path', async () => {
    mockForArgs({
      debug: false,
      source: '{"a": "A"}',
      target: '{"b": "B"}',
      substitution: undefined,
      'source-file': SOURCE_FILE,
      'target-file': TARGET_FILE,
      'substitution-file': undefined,
      'source-path': 'c',
      'target-path': 'c',
      'skipped-source-paths': undefined,
      'skipped-target-paths': undefined,
      'appended-array-paths': undefined
    })

    await main.run()
    expect(runMock).toHaveReturned()

    expect(setFailedMock).not.toHaveBeenCalled()
    expect(writeFileSyncMock).not.toHaveBeenCalled()
  })

  it('has all required functionality', async () => {
    mockForArgs({
      debug: true,
      source: `
      [{}, {
        "a": "$EXISTING_ENV",
        "b": "$(MISSING ENV)",
        "$var": 3,
        "c": ["Replacing"],
        "d": [["Appending 1"], ["Appending 2"]],
        "f": $(json.wow),
        "ignored1": "test",
        "notIgnored1": "test"
      }]
        `,
      target: `{
        "a": {
          "c": {
            "a": "Replaced",
            "c": ["Replaced"],
            "d": [["Appended"], ["Also appended"]],
            "ignored2": "test",
            "notIgnored2": "test"
          },
          "e": "Hello"
        },
        "f": "World"
      }`,
      substitution: '{"var": "x", "json": {"wow": {"it": true}}}',
      'source-file': SOURCE_FILE,
      'target-file': TARGET_FILE,
      'substitution-file': SUBSTITUTION_FILE,
      'source-path': '[1]',
      'target-path': 'a.c',
      'skipped-source-paths': ['notIgnored2', 'ignored1'],
      'skipped-target-paths': ['ignored2', 'notIgnored1'],
      'appended-array-paths': ['d.*']
    })
    env['EXISTING_ENV'] = 'Hello env!'
    env['var'] = 'Ignored' //overridden by substitution file
    delete env['MISSING_ENV']

    await main.run()
    expect(runMock).toHaveReturned()

    expect(setFailedMock).not.toHaveBeenCalled()
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1)
    expect(writeFileSyncMock).toHaveBeenCalledWith(
      TARGET_FILE,
      `{
  "a": {
    "c": {
      "a": "Hello env!",
      "c": [
        "Replacing"
      ],
      "d": [
        [
          "Appended",
          "Appending 1"
        ],
        [
          "Also appended",
          "Appending 2"
        ]
      ],
      "notIgnored2": "test",
      "b": "",
      "x": 3,
      "f": {
        "it": true
      },
      "notIgnored1": "test"
    },
    "e": "Hello"
  },
  "f": "World"
}`
    )
  })
})
