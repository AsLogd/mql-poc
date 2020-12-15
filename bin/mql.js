#! /usr/bin/env node
const fs = require("fs")
const path = require("path")
const glob = require("glob")
const grammarparser = require("../lib/index").default
const Log = require("../lib/Log").default
var ArgumentParser = require('argparse').ArgumentParser;

var parser = new ArgumentParser({
  version: '0.0.1',
  prog: "mql-cli",
  addHelp:true,
  description: "Example:\nmql -q query.mql -p 'replays/*.slp' -o result.json"
});
parser.addArgument(
  [ '-q', '--query' ],
  {
    help: 'Query file',
    required: true
  },
);
parser.addArgument(
  [ '-o', '--output' ],
  {
    help: 'Output file',
    defaultValue: "result.json"
  },
);
parser.addArgument(
  [ '-p', '--path' ],
  {
    help: 'Replays path',
    defaultValue: '.'
  }
);
var args = parser.parseArgs();

const files = glob.sync(args.query)

Log.info("Query:")
Log.info(args.query)
const content = fs.readFileSync(args.query, 'utf8');
Log.info("Content:")
Log.info(content)

const result = grammarparser.parse(content)
if (!result.ok) {
  Log.error(result.reason)
}
Log.printAST(result.value)
/*
Log.info("Parsing...")
let parsed = 0
files.forEach(filePath => {
	const parser = args.raw ? Parser.parseRaw : Parser.parse
	const check = !args.skip
	const result = parser(content, check)
	const baseName = path.basename(filePath, path.extname(filePath))
	switch(result.ok) {
		case true:
			fs.mkdirSync(args.output, {recursive: true})
			const outputPath = path.join(args.output, `${baseName}.json`)
			const output = args.prettify
				? JSON.stringify(result.value, null, args.prettify)
				: JSON.stringify(result.value)
			fs.writeFileSync(outputPath, output)
			Log.ok(`	- ${filePath} - OK`)
			parsed += 1
			break
		case false:
			Log.error(`	- ${filePath} - KO`)
			Log.error(result.reason.error.reason)
			break
	}
})
*/

