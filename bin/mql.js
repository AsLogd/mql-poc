#! /usr/bin/env node
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
	["mario"],
	["fox"],
	["captain falcon", "falcon", "capt falcon"],
	["donkey kong", "dk"],
	["kirby"],
	["bowser"],
	["link"],
	["sheik"],
	["ness"],
	["peach"],
	["popo", "ice climbers"],
	["nana"],
	["pikachu"],
	["samus"],
	["yoshi"],
	["jigglypuff"],
	["mewtwo"],
	["luigi"],
	["marth"],
	["zelda"],
	["young link"],
	["dr mario"],
	["falco"],
	["pichu"],
	["mr game & watch", "game & watch", "game and watch", "mr game and watch", "g&w"],
	["ganondorf", "ganon"],
	["roy"],
	["master hand"],
	["crazy hand"],
	["wireframe male"],
	["wireframe female"],
	["giga bowser"],
	["sandbag"],
]

const util = require('util')
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
parser.addArgument(
  [ '-a', '--ast' ],
  {
    help: 'Show AST',
    const: true,
    action: "storeTrue"
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

if (args.ast) {
	Log.printAST(result.value)
}

const query_result = execute(result.value, args.path);

query_result.forEach((m) => {
	Log.info(`-${m}`)
})



function characterIdFromName(name) {
	const index = characterNames.findIndex((tuple) => 
		tuple.some(x => x === name)
	)

	return index !== -1 ? index : undefined
}

function attackIdFromName(name) {
	const index = attackNames.findIndex((tuple) => 
		tuple.some(x => x === name)
	)

	return index !== -1 ? index : undefined

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
	const id = attackIdFromName(name)
	return id && {
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
	//console.log("get", name, " with id ", characterIdFromName(name))
	//console.log("available ids", frame.players.map(p => p.post.internalCharacterId))
	const character = frame.players.find(p => 
		p.post.internalCharacterId === characterIdFromName(name)
	) 
	return character && {
		type:"character",
		character
	}
}

function parseValue(value, frame, data) {

	switch(value.type) {
		case "someone":
			return "someone"
		case "match":
			return data.settings
		case "string": {
			const content = value.text.slice(1, -1).toLowerCase()
			const val = getCharacter(content, frame, data) 
				|| getAttack(content)
				|| getPlayerFromName(content, frame, data)
			//character or player not found on this replay or unrecognized string
			if (!val) {
				return "unknown"
			}
			return val
		}
		case "number":
			return Number.parseFloat(value.text)
		case "port": {
			const portNumber = parseInt(val.slice(1))
			const val = getPlayer(portNumber)
			if (!val) {
				console.error("No player at port: ", value.text)
				return "error"
			}
			return {type:"port", portNumber, player: val}
		}
		case "ref": {
			if(data.scope.length === 0) {
				console.error("Undefined reference: ", value.name.text)
				return "error"
			}
			const scope = data.scope[data.scope.length - 1]

			if(!scope[value.name.text]) {
				console.error("Undefined reference: ", value.name.text)
				return "error"
			}
			return scope[value.name.text]
		}
	}
}

function processParameters(params, frame, data) {
	return params.map(p => parseValue(p, frame, data))
}

function scopeFromParams(names, values) {
	const scope = {}
	names.forEach((name, i) => {
		scope[name] = values[i]
	})
	return scope
}

function checkExpressionForFrame(expr, frame, data) {
	switch(expr.type) {
		case "infix": {
			let res = false 
			if(expr.type.op == "or") {
				res = checkExpressionForFrame(expr.lval, frame, data)
					|| checkExpressionForFrame(expr.rval, frame, data)
			} else { // and
				res = checkExpressionForFrame(expr.lval, frame, data)
					&& checkExpressionForFrame(expr.rval, frame, data)
			}
			return res
		}
		case "prefix":
			// Only not for now
			return !checkExpressionForFrame(expr.rval, frame, data)
		case "function":{
			if(data.functions[expr.name]) {
				return !!data.functions[expr.name](...processParameters(expr.params, frame, data))
			}
			console.error(`Function ${expr.name} is undefined`)
			return false
		}
		case "sentence": {
			const signature = []
			const params = []
			for (const word of expr.val) {
				if (word.type === "literal") {
					signature.push(word.text)
				} else {
					const val = parseValue(word, frame, data)
					if (val === "unknown") {
						return false
					}
					signature.push(val.type || val)
					params.push(val)
				}
			}
			const definition = data.definitions[signature.join("_")]
			//console.log("defs",data.definitions)
			//console.log("searching signature", signature.join("_"))
			//console.log("found", definition)
			const scope = scopeFromParams(
				definition.parameters,
				params
			)
			data.scope.push(scope)
			const res = definition.machine.feedFrame(frame, data)
			data.scope.pop()
			return res
		}
	}
}


function expressionFactory(expression, data) {
	let obj = {
		root: expression
	}
	obj.checkFrame = (frame, data) => {
		return checkExpressionForFrame(obj.root, frame, data)
	}
	return obj
}

function temporalFactory(temporal, data) {
	return {
		then: expressionFactory(temporal.then, data),
		before: temporal.before && expressionFactory(temporal.before, data)
	}
}

function temporalAutomataFactory(succession, data, name) {
	const machine = {
		temporals: succession.temporals.map((t) => temporalFactory(t, data)),
		accepted_intervals: [],
		matched_at: [],
		first_accepted: null,
		currentStep: 0,
		name
	}
	// returns true if there's a match of the last temporal on that frame
	machine.feedFrame = (frame, data) => {
		const thenExpr = machine.temporals[machine.currentStep].then
		const beforeExpr = machine.temporals[machine.currentStep].before
		if(beforeExpr && beforeExpr.checkFrame(frame, data)) {
			//console.log("<", name,">", "machine has triggered 'before' at frame", frame.frame)
			machine.currentStep = 0
			machine.first_accepted = null
		}
		if(thenExpr.checkFrame(frame, data)) {
			//console.log("<", name,">", "machine is advancing to step", machine.currentStep+1, " at frame", frame.frame)
			if (!machine.first_accepted) {
				machine.first_accepted = frame.frame
			}
			machine.currentStep += 1
			if(machine.currentStep === machine.temporals.length) {
				//console.log("and its a match")
				machine.accepted_intervals.push(
					[machine.first_accepted, frame.frame]
				)
				machine.first_accepted = null
				machine.matched_at.push(frame.frame)
				machine.currentStep = 0
				return true
			}
		}

		return false
	}

	return machine
}

function dfaConditionFactory(cond, data) {
	return {
		expression: expressionFactory(cond.expression, data),
		nextStateId: cond.result
	}
}

function dfaRuleFactory(rule, data) {
	const obj = {
		id: rule.id,
		isAccepting: rule.isAccepting,
		conditions: rule.if_expr.conditions.map(c => dfaConditionFactory(c, data)),
		else: rule.if_expr.else
	}

	obj.feedFrame = (frame, data) => {
		const nextState = obj.conditions.find(c => 
			c.expression.checkFrame(frame, data)
		)
		if (nextState) {
			return nextState.nextStateId
		}
		if (obj.else) {
			return obj.else
		}
		return null
	}

	return obj
}

function dfaFactory(dfadef, data, name) {
	const rules = dfadef.rules.map((t) => dfaRuleFactory(t, data))
	const dfa = {
		rules: rules,
		accepted_frames: [],
		currentState: rules[0],
		name
	}
	// returns true if the next state is accepting
	dfa.feedFrame = (frame, data) => {
		const nextStateId = dfa.currentState.feedFrame(frame, data)
		if (nextStateId) {
			const nextState = rules.find(r => r.id.text === nextStateId.text)
			if (!nextState) {
				console.info(`State \
${nextStateId.text} at ${nextStateId.line}:${nextStateId.col} \
doesn't exist`)
			} else {
				//console.log("<", name,">", "machine moves to state", nextState.id.text)
				dfa.currentState = nextState
			}
		}
		if (dfa.currentState.isAccepting) {
			//console.log("<", name,">", "is in an accepting state", dfa.currentState.id.text)
			dfa.accepted_frames.push(frame.frame)
		}

		return dfa.currentState.isAccepting
	}

	return dfa
}

function machineFromQuery(query, game, data) {
	switch(query.content.type) {
		case "succession": {
			return temporalAutomataFactory(
				query.content, 
				// all checks inherit this data
				{game, ...data},
				"root"
			)
		}
		case "dfa": {
			return dfaFactory(
				query.content,
				{game, ...data},
				"root"
			)
		}
	}
}

function getFirstOccurrence(data) {
	return (file) => {
		//console.log("file", file)
		const game = new SlippiGame(file)
		const frames = game.getFrames()
		const frameKeys = Object.keys(frames)
			.map(f => parseInt(f))
			.sort((a, b) => a-b)
		const rootMachine = machineFromQuery(data.query, game, data)
		const frame = frameKeys.find(f => 
			rootMachine.feedFrame(frames[f], {game, ...data})
		)
		//console.log(rootMachine)
		/*
		for(let i = -10; i < 0; i++){
			console.log("------",i,"------")
			console.log("-Falco")
			console.log({
				airborne: frames[i].players[0].post.isAirborne,
				state: frames[i].players[0].post.actionStateId
			})
			console.log("-Ganon")
			console.log({
				airborne: frames[i].players[1].post.isAirborne,
				state: frames[i].players[1].post.actionStateId
			})
		}
		*/		
		return frame
	}
}

function computeIntervals(frames) {
	const res = frames.reduce((pre, curr) => {
		if (curr - pre.last > 1) {
			pre.intervals.push([pre.start, pre.last])
			pre.start = curr
		}
		pre.last = curr
		return pre
	}, {
		intervals: [],
		start: frames[0],
		last: frames[0]
	})
	if (res.start !== res.last) {
		res.intervals.push([res.start, res.last])
	}
	return res.intervals
}

function getFrameIntervals(data) {
	return (file) => {
		//console.log("file", file)
		const game = new SlippiGame(file)
		const frames = game.getFrames()
		const frameKeys = Object.keys(frames)
			.map(f => parseInt(f))
			.sort((a, b) => a-b)
		const rootMachine = machineFromQuery(data.query, game, data)
		frameKeys.forEach(f => 
			rootMachine.feedFrame(frames[f], {game, ...data})
		)
		// for now, different for dfa and succession
		const intervals = rootMachine.accepted_intervals 
			|| computeIntervals(rootMachine.accepted_frames)
		return intervals
	}
}

function executeQuery(data) {
	const files = glob.sync(`${args.path}/**/*.slp`)
	if(files.length === 0) {
		Log.info(`No files found at ${args.path}`)
		return []
	}
	switch(data.query.target.text) {
		case "matches": {
			const gfo = getFirstOccurrence(data)
			return files.map(f => ({f, o: gfo(f)}))
				.filter(tuple => !!tuple.o)
				.map(tuple => `found occurrence in ${tuple.f} at frame ${tuple.o}`)
		}
		case "frames": {
			const gi = getFrameIntervals(data)
			return files.map(f => ({f, o: gi(f)}))
				.filter(tuple => tuple.o.length > 0)
				.map(tuple => {
					const intervals = tuple.o.reverse().reduce((pre, curr) =>
						curr[0] !== curr[1]
							? `[${curr[0]}, ${curr[1]}],\t${pre}`
							: `${curr[0]},\t\t${pre}`
					, "")
					return `found occurrence in ${tuple.f} at the following intervals:
${intervals}`
				})
		}
	}
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
				return `_error`
				console.error("Unknown token:", curr)
		}
	},"").slice(1)
	data.definitions[signature] = {
		machine: temporalAutomataFactory(definition.body, data, signature),
		parameters,
	}
}

function evaluateFunction(f, data) {
	const fparams = f.params.map(p => p.text)
	data.functions[f.name] = new Function(...fparams, f.body)
}

function execute(q, path) {
	let data = {
		query: null,
		definitions: {},
		functions: {},
		scope: []
	}
	q.forEach((stmt) => {
		switch(stmt.type) {
			case "query":
				data.query = stmt
				break;
			case "js_func": 				
				evaluateFunction(stmt, data)
				break;
			case "definition":
				evaluateDefinition(stmt, data)
				break;
		}
	})
	return executeQuery(data)
}

//future work:
//-find cool name
//-graphical DFA's
//-syntax highlight
//-move to typed lang (typescript or rescript)
//-better error detection and reporting

// TODO:
// - define => sentence, filter, verb, function
// - time
// - "someone" literal
// - aliases for subjects
// - "from" ("like" could be done with from?)
// - basic verbs (play, record, copy)