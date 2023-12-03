import * as core from '@actions/core'
import * as utils from './utils'
import * as fs from './file-abstraction'
import { env } from 'process'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  let valid = true
  const jsonSpace = 2

  function parseOrFail(path: string, context: string): utils.Pattern {
    const parsed = utils.parsePath(path)
    if (parsed) {
      return parsed
    }
    core.setFailed(`Invalid JSON path for ${context}: "${path}"`)
    valid = false
    return []
  }
  function parseSinglePathOrFail(name: string): utils.Pattern {
    return parseOrFail(core.getInput(name, { trimWhitespace: true }), name)
  }
  function parseMultiPathOrFail(name: string): utils.Pattern[] {
    return core
      .getMultilineInput(name, { trimWhitespace: true })
      .filter(it => it)
      .map(path => parseOrFail(path, name))
  }

  try {
    core.debug('Checking file args...')
    const sourceFile = core.getInput('source-file', {
      trimWhitespace: false,
      required: true
    })
    if (!fs.existsSync(sourceFile)) {
      core.setFailed(`source-file does not exist: "${sourceFile}"`)
      valid = false
    }

    const targetFile = core.getInput('target-file', {
      trimWhitespace: false,
      required: true
    })
    if (!targetFile) {
      core.setFailed(`target-file path is missing.`)
      valid = false
    }

    const substitutionFile = core.getInput('substitution-file', {
      trimWhitespace: false
    })
    if (substitutionFile && !fs.existsSync(substitutionFile)) {
      core.setFailed(`substitution-file does not exist: "${substitutionFile}"`)
      valid = false
    }

    core.debug('Parsing JSON paths...')
    const sourcePath = parseSinglePathOrFail('source-path')
    const targetPath = parseSinglePathOrFail('target-path')
    const skippedSourcePaths = parseMultiPathOrFail('skipped-source-paths')
    const skippedTargetPaths = parseMultiPathOrFail('skipped-target-paths')
    const appendedArrayPaths = parseMultiPathOrFail('appended-array-paths')

    if (valid) {
      core.debug('Reading & parsing substitutions...')
      let substitutions: { [key: string]: unknown }
      try {
        substitutions = substitutionFile
          ? JSON.parse(fs.readFileSync(substitutionFile, 'utf8'))
          : {}
      } catch (error) {
        core.setFailed(
          `Error loading substitution-file (${substitutionFile}): ${error}`
        )
        return
      }

      core.debug('Reading source file...')
      let template: string
      try {
        template = fs.readFileSync(sourceFile, 'utf8')
      } catch (error: unknown) {
        core.setFailed(`Error loading source-file (${sourceFile}): ${error}`)
        return
      }

      core.debug('Applying substitutions...')
      const sourceCode = utils.applyTemplate(template, key => {
        if (core.isDebug()) {
          core.debug(`Replacing key "{key}"...`)
        }
        let replacement = substitutions[key]
        if (replacement === undefined) {
          const parsedKey = utils.parsePath(key)
          if (parsedKey) {
            replacement = utils.getPath(substitutions, parsedKey)
          }
        }
        if (replacement === undefined) {
          replacement = env[key]
        }
        if (replacement === undefined) {
          replacement = ''
        }
        if (typeof replacement == 'string') {
          return replacement
        } else {
          return JSON.stringify(replacement)
        }
      })

      if (core.isDebug()) {
        core.debug(`Result:\n ${sourceCode}`)
      }

      core.debug('Parsing source...')
      let fullSource: unknown
      try {
        fullSource = JSON.parse(sourceCode)
      } catch (error: unknown) {
        core.setFailed(`Error loading source-file (${sourceFile}): ${error}`)
        return
      }

      core.debug('Reading & parsing target...')
      let fullTarget: unknown
      try {
        fullTarget = fs.existsSync(targetFile)
          ? JSON.parse(fs.readFileSync(targetFile, 'utf8'))
          : undefined
      } catch (error: unknown) {
        core.setFailed(
          `Error loading target-file with (${targetFile}): ${error}`
        )
        return
      }
      if (fullTarget === undefined) {
        core.info(
          `target-file (${targetFile}) does not exist yet and will be created from scratch.`
        )
      }

      core.debug('Determining workspace in hierarchy...')
      const focussedSource = utils.getPath(fullSource, sourcePath)
      const focussedTarget = utils.getPath(fullTarget, targetPath)
      if (core.isDebug()) {
        core.debug(
          `Source focus:\n${JSON.stringify(
            focussedSource,
            undefined,
            jsonSpace
          )}`
        )
        core.debug(
          `Target focus:\n${JSON.stringify(
            focussedTarget,
            undefined,
            jsonSpace
          )}`
        )
      }

      core.debug('Stripping skipped paths...')
      const strippedSource = utils.stripMatchingElements(
        focussedSource,
        skippedSourcePaths
      )
      const strippedTarget = utils.stripMatchingElements(
        focussedTarget,
        skippedTargetPaths
      )
      if (core.isDebug()) {
        core.debug(
          `Stripped source focus:\n${JSON.stringify(
            focussedSource,
            undefined,
            jsonSpace
          )}`
        )
        core.debug(
          `Stripped target focus:\n${JSON.stringify(
            focussedTarget,
            undefined,
            jsonSpace
          )}`
        )
      }

      core.debug('Merging...')
      const merged = utils.merge(
        strippedTarget,
        strippedSource,
        appendedArrayPaths
      )
      if (core.isDebug()) {
        core.debug(`Result:\n${JSON.stringify(merged, undefined, jsonSpace)}`)
      }

      if (merged !== undefined) {
        core.debug('Inserting merge result into target...')
        fullTarget = utils.setPath(fullTarget, targetPath, merged)
      } else {
        core.info(
          'Merge result is nothing => skipping insertion and writing output...'
        )
      }
      if (core.isDebug()) {
        core.debug(
          `Result:\n${JSON.stringify(fullTarget, undefined, jsonSpace)}`
        )
      }

      if (merged !== undefined) {
        core.debug('Writing target...')
        fs.writeFileSync(
          targetFile,
          JSON.stringify(fullTarget, undefined, jsonSpace)
        )
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error)
      if (error.stack) {
        core.error(error.stack)
      }
    } else {
      core.setFailed(`Unknown error: ${error}`)
    }
  }
}
