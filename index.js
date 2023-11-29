const fs = require('fs');
const core = require('@actions/core');
//const github = require('@actions/github');

function parsePath(path) {
    
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
        //JSON.parse(fs.readFileSync(inputFile))
        //console.log()
        //eval()
        //JSON.stringify()
    } else {

    }
} catch (error) {
    core.setFailed(error.message);
}