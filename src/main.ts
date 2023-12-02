import * as core from '@actions/core'
import * as utils from './utils'
import * as fs from 'fs'
import { env } from 'process'


/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
    var valid = true
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
    function parseSinglePathOrFail(name: string) {
        return parseOrFail(core.getInput(name, { trimWhitespace: true }), name)
    }
    function parseMultiPathOrFail(name: string) {
        return core.getMultilineInput(name, { trimWhitespace: true })
            .filter(it => it)
            .map(path => parseOrFail(path, name))
    }

    try {
        core.debug("Checking file args...")
        const sourceFile = core.getInput("source-file", { trimWhitespace: false, required: true })
        if (!fs.existsSync(sourceFile)) {
            core.setFailed(`source-file does not exist: "${sourceFile}"`)
            valid = false
        }

        const targetFile = core.getInput("target-file", { trimWhitespace: false, required: true })
        if (!targetFile) {
            core.setFailed(`target-file path is missing."`)
            valid = false
        }

        const substitutionFile = core.getInput("substitution-file", { trimWhitespace: false })
        if (substitutionFile && !fs.existsSync(substitutionFile)) {
            core.setFailed(`substitution-file does not exist: "${substitutionFile}"`)
            valid = false
        }

        core.debug("Parsing JSON paths...")
        const sourcePath = parseSinglePathOrFail("source-path")
        const targetPath = parseSinglePathOrFail("target-path")
        const skippedSourcePaths = parseMultiPathOrFail("skipped-source-paths")
        const skippedTargetPaths = parseMultiPathOrFail("skipped-target-paths")
        const appendedArrayPaths = parseMultiPathOrFail("appended-array-paths")

        if (valid) {
            core.debug("Reading & parsing substitutions...")
            const substitutions = substitutionFile ? JSON.parse(fs.readFileSync(substitutionFile, "utf8")) : {}

            core.debug("Reading source file...")
            const template = fs.readFileSync(sourceFile, "utf8")

            core.debug("Applying substitutions...")
            const sourceCode = utils.applyTemplate(template, (key) => {
                if (core.isDebug()) {
                    core.debug(`Replacing key "{key}"...`)
                }
                let replacement = substitutions[key]
                if (replacement === undefined) {
                    let parsedKey = utils.parsePath(key)
                    if (parsedKey) {
                        replacement = utils.getPath(substitutions, parsedKey)
                    }
                }
                if (replacement === undefined) {
                    replacement = env[key]
                }
                if (replacement === undefined) {
                    replacement = ""
                }
                if (typeof replacement != "string") {
                    replacement = JSON.stringify(replacement)
                }

                return replacement
            })
            
            if (core.isDebug()) {
                core.debug("Result:\n" + sourceCode)
            }

            core.debug("Parsing source...")
            const fullSource = JSON.parse(sourceCode)

            core.debug("Reading & parsing target...")
            var fullTarget = fs.existsSync(targetFile) ? JSON.parse(fs.readFileSync(targetFile, "utf8")) : undefined
            if (fullTarget === undefined) {
                core.info("Target file does not exist yet and will be created from scratch.")
            }

            core.debug("Determining workspace in hierarchy...")
            const focussedSource = utils.getPath(fullSource, sourcePath)
            const focussedTarget = utils.getPath(fullTarget, targetPath)
            if (core.isDebug()) {
                core.debug("Source focus:\n" + JSON.stringify(focussedSource, undefined, jsonSpace))
                core.debug("Target focus:\n" + JSON.stringify(focussedTarget, undefined, jsonSpace))
            }

            core.debug("Stripping skipped paths...")
            const strippedSource = utils.stripMatchingElements(focussedSource, skippedSourcePaths)
            const strippedTarget = utils.stripMatchingElements(focussedTarget, skippedTargetPaths)
            if (core.isDebug()) {
                core.debug("Stripped source focus:\n" + JSON.stringify(focussedSource, undefined, jsonSpace))
                core.debug("Stripped target focus:\n" + JSON.stringify(focussedTarget, undefined, jsonSpace))
            }

            core.debug("Merging...")
            const merged = utils.merge(
                strippedTarget,
                strippedSource,
                appendedArrayPaths
            )
            if (core.isDebug()) {
                core.debug("Result:\n" + JSON.stringify(merged, undefined, jsonSpace))
            }

            core.debug("Inserting merge result into target...")
            if (merged !== undefined) {
                fullTarget = utils.setPath(fullTarget, targetPath, merged)
            } else {
                core.info("Merge result is nothing, skipping insertion...")
            }
            if (core.isDebug()) {
                core.debug("Result:\n" + JSON.stringify(fullTarget, undefined, jsonSpace))
            }

            core.debug("Writing target...")
            fs.writeFileSync(targetFile, JSON.stringify(fullTarget, undefined, jsonSpace))
        }
    } catch (error: any) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        } else {
            core.setFailed("Unknown error: " + String(error))
        }
    }
}
