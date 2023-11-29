const fs = require('fs');
const core = require('@actions/core');
const { assert } = require('console');
//const github = require('@actions/github');

//semi-strict path parser, permits no whitespace between/within tokens and no double quotes
function parsePath(path) {
    let fail = function () {
        console.error(`Invalid path '${path}'`)
        return null
    }

    let result = []
    let afterDot = false
    let first = true
    let tokens = [...path.matchAll(/\.|[^\.\[]+|\[[0-9]+\]|\["(?:[^"]|\\.)*"\]/g)].map(it => it[0])
    if (tokens.join('') != path) {
        return fail();
    }
    for (let token of tokens) {
        if (token == ".") {
            if (afterDot || first) {
                return fail()
            }
            afterDot = true
            continue
        } else if (token.endsWith("]")) {
            if (afterDot) {
                return fail()
            }
            token = JSON.parse(token.slice(1, -1))
        } else {
            if (!afterDot && !first) {
                return fail()
            }
        }
        result.push(token)
        afterDot = false
        first = false
    }
    if (afterDot || first) {
        return fail()
    }
    return result
}

function getPath(obj, parsedPath) {
    for (const key of parsedPath) {
        if (typeof obj != "object") {
                return undefined
            }
        }
        obj = obj[key]
    }
    return obj
}

function forcePath(root, parsedPath, leafValue) {
    var obj = root
    var parent = undefined, parentKey = undefined
    for (const i in parsedPath) {
        const key = parsedPath[i]
        if (typeof key == "number" && !Array.isArray(obj)) {
            obj = []
        } else if (typeof key == "string" && typeof obj != "object") {
            obj = {}
        }
        if (i == 0) {
            root = obj
        } else {
            parent[parentKey] = obj
        }
        parent = obj
        parentKey = key
        obj = obj[key]
    }
    if (obj == undefined) {
        if (parentKey != undefined) {
            parent[parentKey] = leafValue
        }
        obj = leafValue
    }
    return [root, obj]
}


function matchPath(matchedPath, patternPath) {
    if (matchedPath.length != patternPath.length) {
        return false
    }
    for (const i in matchedPathPrefix) {
        let matchedKey = String(matchedPath[i])
        let patternKey = String(patternPath[i])
        if (patternKey != "*" && patternKey != matchedKey) {
            return false
        }
    }
    return true
}


function traverseHierarchy(obj, onEnter, onExit, parentStack, pathStack) {
    parentStack = parentStack || []
    pathStack = pathStack || []
    const result = undefined
    if (onEnter) {
        result = onEnter(obj, parentStack, pathStack)
    }
    if (typeof (obj) == "object") {
        if (result == true || result == undefined) {
            for (const key in obj) {
                parentStack.push(obj)
                pathStack.push(key)
                traverseHierarchy(obj[key], callback, parentStack, pathStack)
                pathStack.pop(key)
                parentStack.pop(obj)
            }
        }
    }
    if (onExit) {
        onExit(obj, parentStack, pathStack)
    }
}

try {
    const sourceFile = core.getInput("source-file")
    const targetFile = core.getInput("target-file")
    const sourcePath = parsePath(core.getInput("source-path"))
    const targetPath = parsePath(core.getInput("target-path"))
    const skippedSourcePaths = core.getMultilineInput("skipped-source-paths")
        .filter(it => it)
        .map(parsePath)
    const skippedTargetPaths = core.getMultilineInput("skipped-target-paths")
        .filter(it => it)
        .map(parsePath)
    const substitutionFile = core.getInput("substitution-file")
    
    const sourceFileExists = fs.existsSync(sourceFile);
    const targetFileExists = fs.existsSync(targetFile);
    const substitutionFileExists = fs.existsSync(substitutionFile);
    

    if (sourceFileExists && targetFile && (!substitutionFile || substitutionFileExists)) {
        //TODO: templating

        const fullSource = JSON.parse(fs.readFileSync(sourceFile))
        var fullTarget = JSON.parse(fs.readFileSync(targetFile)) //TODO: default to undefined

        const focussedSource = getPath(fullSource, sourcePath)
        //TODO: path not found
        const focussedTarget
        [fullTarget, focussedTarget] = forcePath(fullTarget, targetPath, () => {
            if (typeof focussedSource == "object") {
                return Array.isArray(focussedSource) ? [] : {}
            }
        })



        traverseHierarchy(focussedTarget, (obj, parents, keys) => {
            if (keys && skippedTargetPaths.some(pattern => matchPath(keys, pattern))) {
                parents[parents.length - 1][keys[keys - 1]] = undefined
                //don't iterate children
                return false
            }
        }, undefined)

        let writeStack = []
        traverseHierarchy(focussedSource, (obj, parents, keys) => {
            //TODO: selective copying
            if (keys) {
                if (skippedSourcePaths.some(pattern => matchPath(keys, pattern))) {
                    //don't iterate children
                    return false
                }
                const existing = writeStack[writeStack.length - 1][keys[keys - 1]]
                if (writeStack[writeStack.length - 1][keys[keys - 1]])

                writeStack[writeStack.length - 1][keys[keys - 1]] = undefined

            }
        }, () => writeStack.pop())

        fs.writeFileSync(targetFile, JSON.stringify(fullTarget))
    } else {

    }
} catch (error) {
    core.setFailed(error.message);
}