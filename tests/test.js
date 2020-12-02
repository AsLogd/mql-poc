const fs = require('fs')
const path = require('path')
const glob = require("glob")
const nearley = require("nearley")
const grammar = require("../lib/grammar.js")
const Log = require("../lib/Log.js").default
const execSync = require('child_process').execSync;
const spawn = require('child_process').spawn;

const validFolder = path.join(__dirname, './valid/')
const invalidFolder = path.join(__dirname, './invalid/')
const outputFolder =  path.join(__dirname, './output/')
//const expectedOutputFolder =  path.join(__dirname, './expected_output/')
function dumpTest(path, results) {
	Log.info("Results for ("+path+"):")
	Log.dump(results)
}

Log.info("========================")
Log.info("--grammar and semantic--")

Log.info("Testing valid inputs:")
fs.readdirSync(validFolder).forEach(file => {
	const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
	const testName = path.basename(file, path.extname(file))
	const validFilePath = path.join(validFolder, file)
	const data = fs.readFileSync(validFilePath, 'utf8');
	try {
		parser.feed(data);
	} catch (err) {
		Log.error(" - "+testName+"- KO")
		Log.info("The parser gave the following error:")
		Log.error(err);
		return
	}
	if (parser.results.length > 1) {
		Log.warn(" - "+testName+" - Ambiguous!")
		dumpTest(validFilePath, parser.results)
		return
	}
	if (parser.results.length === 0) {
		Log.error(" - "+testName+" - KO (No matching)")
		dumpTest(validFilePath, parser.results)
		return
	}

	/*
	const semanticError = semanticCheck(parser.results[0])
	if (semanticError) {
		Log.error(" - "+testName+" - KO (semantic)")
		Log.error("Error:")
		Log.error(semanticError.reason)
		Log.info("--------------------------")
		return
	}
	*/

	Log.ok(" - "+testName+" - OK")
});

Log.info("Testing invalid inputs:")
fs.readdirSync(invalidFolder).forEach(file => {
	const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
	const testName = path.basename(file, path.extname(file))
	const invalidPathFile = path.join(invalidFolder, file)
	const data = fs.readFileSync(invalidPathFile, 'utf8');
	try {
		parser.feed(data);
	} catch (err) {
		Log.ok(" - "+testName+" - OK")
		return
	}

	if (parser.results && parser.results.length === 0) {
		Log.ok(" - "+testName+" - OK")
		return
	}
	/*
	const semanticError = semanticCheck(parser.results[0])
	if (semanticError) {
		Log.ok(" - "+testName+" - OK")
		return
	}
	*/

	Log.error(" - "+testName+" - KO")
	dumpTest(invalidPathFile, parser.results)
});
/*
Log.info("==============")
Log.info("--executable--")
if (fs.existsSync(outputFolder)) {
	Log.info(`Removing existing output folder "${outputFolder}"...`)
	execSync(`rm -rf ${outputFolder}`)
}
Log.info("Testing raw export:")
testExport(parserawSubFolder, true)
Log.info("Testing export:")
testExport(parseSubFolder, false)
*/