
//semi-strict path parser, permits no whitespace between/within tokens and no double quotes
let parsePath = function(path) {
    let fail = function () {
        return undefined
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
            try {
                token = JSON.parse(token.slice(1, -1))
            } catch (e) {
                return undefined
            }
        } else {
            if (!afterDot && !first) {
                return fail()
            }
        }
        result.push(token)
        afterDot = false
        first = false
    }
    if (afterDot) {
        return fail()
    }
    return result
}

let getPath = function(obj, parsedPath) {
    for (const key of parsedPath) {
        if (typeof obj != "object") {
            return undefined
        }
        obj = obj[key]
    }
    return obj
}

let setPath = function (obj, path, value, forcePathType, i) {
    i = i || 0
    if (i >= path.length) {
        return value
    }
    const key = path[i]
    if (forcePathType || typeof obj != "object") {
        if (typeof key == "number" && !Array.isArray(obj)) {
            obj = []
        } else if (typeof key == "string" && (typeof obj != "object" || Array.isArray(obj))) {
            obj = {}
        }
    }
    obj[key] = setPath(obj[key], path, value, forcePathType, i+1)
    return obj
}

let matchPath = function(matchedPath, patternPath) {
    if (matchedPath.length != patternPath.length) {
        return false
    }
    for (const i in patternPath) {
        let matchedKey = String(matchedPath[i])
        let patternKey = String(patternPath[i])
        if (patternKey != "*" && patternKey != matchedKey) {
            return false
        }
    }
    return true
}

let stripMatchingElements = function(obj, patterns, pathStack) {
    pathStack = pathStack || []
    if (patterns.some(pattern => matchPath(pathStack, pattern))) {
        return undefined
    }
    if (typeof (obj) == "object") {
        const newArray = []
        for (const key in obj) {
            pathStack.push(key)
            const newValue = stripMatchingElements(obj[key], patterns, pathStack)
            if (newValue === undefined) {
                delete obj[key]
            } else {
                if (Array.isArray(obj)) {
                    newArray.push(newValue)
                } else {
                    obj[key] = newValue
                }
            }
            pathStack.pop(key)
        }
        if (Array.isArray(obj)) {
            obj = newArray
        }
    }
    return obj
}

let merge = function (target, source, arraysToAppend, pathStack) {
    pathStack = pathStack || []
    if (source == undefined) {
        return target
    }
    if (typeof target != "object" || typeof source != "object" || Array.isArray(target) != Array.isArray(source)) {
        return source
    }
    if (arraysToAppend && Array.isArray(target) && arraysToAppend.some(pattern => matchPath(pathStack, pattern))) {
        for (const value of source) {
            target.push(value)
        }
    } else {
        for (const key in source) {
            pathStack.push(key)
            target[key] = merge(target[key], source[key], arraysToAppend, pathStack)
            pathStack.pop(key)
        }
    }
    return target
}

module.exports = {
    parsePath: parsePath,
    getPath: getPath,
    setPath: setPath,
    matchPath: matchPath,
    stripMatchingElements: stripMatchingElements,
    merge: merge
}