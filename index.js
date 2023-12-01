const fs = require('fs');
const core = require('@actions/core');
const { assert } = require('console');
const utils = require('./utils.js');
const { env } = require('process');


try {
    const sourceFile = core.getInput("source-file")
    const targetFile = core.getInput("target-file")
    const sourcePath = utils.parsePath(core.getInput("source-path"))
    const targetPath = utils.parsePath(core.getInput("target-path"))
    const skippedSourcePaths = core.getMultilineInput("skipped-source-paths")
        .filter(it => it)
        .map(utils.parsePath)//TODO: error handling
    const skippedTargetPaths = core.getMultilineInput("skipped-target-paths")
        .filter(it => it)
        .map(utils.parsePath)//TODO: error handling
    const skippedTargetPaths = core.getMultilineInput("appended-array-paths")
        .filter(it => it)
        .map(utils.parsePath)//TODO: error handling
    const substitutionFile = core.getInput("substitution-file")
    
    const sourceFileExists = fs.existsSync(sourceFile);
    const targetFileExists = fs.existsSync(targetFile);
    const substitutionFileExists = fs.existsSync(substitutionFile);
    

    if (sourceFileExists && targetFile && (!substitutionFile || substitutionFileExists)) {
        const substitutions = substitutionFileExists ? JSON.parse(fs.readFileSync(targetFile)) : {}
        const template = fs.readFileSync(sourceFile)
        template = template.replaceAll(/\$\$|\$\w+|\$\((?:[^\)\$]|\$.)+\)/g, (match) => {
            const key
            if (match == "$$") {
                return "$"
            } else if (match.startsWith("$(")) {
                key = match.slice(2, -1)
                key.replace(/\$(.)/g, "$1")
            } else {
                key = match.slice(1)
            }
            var replacement = substitutions[key]
            if (replacement == undefined) {
                parsedKey = utils.parsePath(key)
                if (typeof parsedKey == "object") {
                    replacement = utils.getPath(substitutions, parsedKey)
                }
            }
            if (replacement == undefined) {
                replacement = env[key]
            }
            if (replacement == undefined) {
                replacement = ""
            }
            if (typeof replacement != "string") {
                replacement = JSON.stringify(replacement)
            }
            
            return replacement
        })

        const fullSource = JSON.parse(template)
        var fullTarget = targetFileExists ? JSON.parse(fs.readFileSync(targetFile)) : undefined

        const focussedSource = utils.getPath(fullSource, sourcePath)
        const focussedTarget = utils.getPath(fullTarget, targetPath)
        
        var result = utils.stripMatchingElements(focussedTarget, skippedTargetPaths)
        result = utils.merge(result, utils.stripMatchingElements(focussedSource, skippedSourcePaths))

        if (result != undefined) {
            fullTarget = utils.setPath(fullTarget, targetPath, result)
        }

        fs.writeFileSync(targetFile, JSON.stringify(fullTarget))
    } else {
        //TODO: error handling
    }
} catch (error) {
    core.setFailed(error.message);
}