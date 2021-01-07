#! /usr/bin/env node
const fs = require("fs")
const path = require("path")
const glob = require("glob")
const grammarparser = require("../lib/index").default
const Log = require("../lib/Log").default
var ArgumentParser = require('argparse').ArgumentParser;
const { default: SlippiGame } = require('@slippi/slippi-js');

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

const query_result = execute(result.value, args.path);

query_result.forEach((m) => {
	Log.info(`-${m}`)
})

// Index === attack id
// Values in second dimension are aliases for that attack
const attackNames = [
	["none"],
	["non staling"],
	["jab 1"],
	["jab 2"],
	["jab 3"],
	["rapid jabs"],
	["dash attack"],
	["side tilt"],
	["up tilt"],
	["down tilt"],
	["side smash"],
	["up smash"],
	["down smash"],
	["nair"],
	["fair"],
	["bair"],
	["uair"],
	["dair"],
	["neutral special"],
	["side special"],
	["up special"],
	["down special"],
]

// Index === character id
// Values in second dimension are aliases for that character
const characterNames = [
	["captain falcon", "falcon", "capt falcon"],
	["donkey kong", "dk"],
	["fox"],
	["mr game & watch", "game & watch", "game and watch", "mr game and watch", "g&w"],
	["kirby"],
	["bowser"],
	["link"],
	["luigi"],
	["mario"],
	["marth"],
	["mewtwo"],
	["ness"],
	["peach"],
	["pikachu"],
	["ice climbers", "climbers"],
	["jigglypuff"],
	["samus"],
	["yoshi"],
	["zelda"],
	["sheik"],
	["falco"],
	["young link"],
	["dr mario"],
	["roy"],
	["pichu"],
	["ganondorf", "ganon"],
	["master hand"],
	["wireframe male"],
	["wireframe female"],
	["giga bowser"],
	["crazy hand"],
	["sandbag"],
]

function characterIdFromName(name) {
	characterNames.findIndex((tuple) => 
		tuple.some(x => x === name)
	)
}

function attackIdFromName(name) {
	attackNames.findIndex((tuple) => 
		tuple.some(x => x === name)
	)
}

function getCurrentCharacters(id, frame, data) {
	return frame.filter(playerFrame => playerFrame.pre.playerIndex === id)
}

function getPlayerFromName(name, frame, data) {
	const metadata = data.game.getMetadata()
	for (const key in metadata.players) {
		if(metadata.players[key].names.netplay === name
		|| metadata.players[key].names.code === name) {
			return {
				type:"player",
				names: metadata.players[key].names,
				currentCharacters: getCurrentCharacters(key, frame, data)
			}
		}
	}
}

function getAttack(name) {
	return {
		type: "attack",
		id: attackIdFromName(name)
	}
}

function getPlayer(id, frame, data) {
	const metadata = data.game.getMetadata()
	return {
		type:"player",
		names: metadata.players[id].names,
		currentCharacters: getCurrentCharacters(id, frame, data)
	}	
}

// Gets the pre and post of a character the characters called <name>
// NOTE: this only gets the first matched character, this doesn't work for dittos
function getCharacter(name, frame, data) {
	return frame.players.find(p => 
		p.post.internalCharacterId === characterIdFromName(name)
	) 
}

function parseValue(value, frame, data) {
	switch(value.type) {
		case "someone":
			return "someone"
		case "match":
			return data.settings
		case "string":
			const val = getCharacters(value.text, frame, data) 
				|| getAttack(value.text)
				|| getPlayerFromName(value.text, frame, data)
			if (!val) {
				console.error("Unrecognized string: ", value.text)
				return "error"
			}
			return val
		case "number":
			return Number.parseFloat(value.text)
		case "port":
			const portNumber = parseInt(val.slice(1))
			const val = getPlayer(portNumber)
			if (!val) {
				console.error("No player at port: ", value.text)
				return "error"
			}
			return {type:"port", portNumber, player: val}
		case "ref":
			if(data.scope.length === 0) {
				console.error("Undefined reference: ", value.name.text)
				return "error"
			}
			const scope = data.scope[data.scope.length - 1]
			if(!scope[ref.name.text]) {
				console.error("Undefined reference: ", value.name.text)
				return "error"
			}
			return data.scope[value.name.text]
	}
}

function processParameters(params, data) {
	params.map(parseValue, data)
}

function scopeFromParams(names, values) {
	const scope = {}
	names.forEach((name, i) => {
		scope[name] = values[i]
	})
	return scope
}

function checkExpressionForFrame(expr, frome, data) {
	switch(expr.type) {
		case "infix": 
			let res = false 
			if(expr.type.op == "or") {
				res = checkExpressionForFrame(expr.lval, frame, data)
					|| checkExpressionForFrame(expr.rval, frame, data)
			} else { // and
				res = checkExpressionForFrame(expr.lval, frame, data)
					&& checkExpressionForFrame(expr.rval, frame, data)
			}
			return res
		case "prefix":
			// Only not for now
			return !checkExpressionForFrame(expr.rval, frame, data)
		case "function":
			if(data.functions[expr.name]) {
				return !!data.functions[expr.name](...processParameters(expr.params, data))
			}
			console.error(`Function ${expr.name} is undefined`)
			return false
		case "sentence":
			const signature = []
			const params = []
			for (const word of expr.val) {
				if (word.type === "literal") {
					signature.push(word.text)
				} else {
					const val = parseValue(word, frame, data)
					signature.push(val.type)
					params.push(val)
				}
			}
			const definition = data.definitions[signature.join("_")]
			const scope = scopeFromParams(
				definition.parameters,
				params
			)
			data.scope.push(scope)
			res = checkExpressionForFrame(definition.machine, frame, data)
			data.scope.pop()
			return res
	}
}


function expressionFactory(expression, data) {
	let obj = {
		root: expression
	}
	obj.checkFrame = (frame) => {
		checkExpressionForFrame(obj.root, frame, data)
	}
}

function temporalFactory(temporal, data) {
	return {
		then: expressionFactory(temporal.then, data),
		before: expressionFactory(temporal.before, data)
	}
}

function machineFactory(succession, data) {
	const machine = {
		temporals: succession.map((t) => temporalFactory(t, data)),
		matched_at: [],
		currentStep: 0,
	}
	// returns true if there's a match of the last temporal on that frame
	machine.feedFrame = (frame) => {
		const thenExpr = machine.temporals[machine.currentStep].then
		const beforeExpr = machine.temporals[machine.currentStep].before
		if(thenExpr.checkFrame(frame, data)) {
			machine.currentStep += 1
			if(machine.currentStep === machine.temporals.length) {
				return true
			}
		}
		if(beforeExpr.checkFrame(frame, data)) {
			machine.currentStep = 0
		}

		return false
	}
	return machine
}

function checkFile(data) {
	return (file) => {
		const game = new SlippiGame(file)
		const frames = game.getFrames()
		const rootMachine = machineFactory(
			data.query.succession, 
			// all checks inherit this data
			{game, definitions: data.definitions}
		)
		return frames.some(rootMachine.feedFrame)
	}
}
function executeQuery(data) {
	// TODO: frames target
	const files = glob.sync(`${args.path}/**/*.slp`)
	if(files.length === 0) {
		Log.info(`No files found at ${args.path}`)
		return []
	}
	const check = checkFile(data.query.succession, data)
	return files.filter(check)
}

function evaluateDefinition(definition, data) {
	const parameters = []
	const signature = definition.signature.reduce((pre, curr) => {
		switch (curr.type) {
			case "infix":
				parameters.push(curr.lval)
				return `${pre}_${curr.rval}`
			case "literal":
				return `${pre}_${curr.value}`
			default:
				return `error`
				console.error("Unknown token:", curr)
		}
	})
	data.definitions[signature] = {
		machine: machineFactory(definition.body, data),
		parameters,
	}
}

function evaluateFunction(f, data) {
	data.functions[f.name] = new Function(...f.params, f.body)
}

function execute(q, path) {
	let data = {
		query: null,
		definitions: {},
		functions: {}
	}
	q.forEach((stmt) => {
		switch(stmt.type) {
			case "query": 
				state.query = stmt
				break;
			case "js_func": 
				evaluateFunction(stmt, data)
			case "definition":
				evaluateDefinition(stmt, data)

		}
	})
	return executeQuery(state)
}

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

