#! /usr/bin/env node
const util = require('util')
const fs = require("fs")
const path = require("path")
const glob = require("glob")
const grammarparser = require("../lib/index").default
const Log = require("../lib/Log").default
const Data = require("./data.js")
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
    defaultValue: './**/*.slp'
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
parser.addArgument(
  [ '-d', '--debug' ],
  {
    help: 'Show state machine changes',
    const: true,
    action: "storeTrue"
  }
);
parser.addArgument(
  [ '-i', '--inspect' ],
  {
    help: 'Show frame data in given interval. Add pre/post to limit scope e.g. -i "120,230,post"',
    defaultValue: null
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

execute(result.value, args.path);


function stateNameFromState(id) {
	return Data.stateNames[id]
}

function charNameFromId(id) {
	return Data.characterNames[id]
}

function inspectPost(p) {
	return {
		//port: p.post.playerIndex + 1,
		char: charNameFromId(p.post.internalCharacterId)[0],
		state: `${stateNameFromState(p.post.actionStateId)} ctr: ${p.post.actionStateCounter.toFixed(2)}`,
		percent: p.post.percent.toFixed(2),
		stocks: p.post.stocksRemaining,
		inAir: p.post.isAirborne,
		jmps: p.post.jumpsRemaining,
		//speed: p.post.selfInducedSpeeds,
		pos: `x:${p.post.positionX.toFixed(2)}, y:${p.post.positionY.toFixed(2)}`,
		dir: p.post.facingDirection, 
		shield: p.post.shieldSize,
		lAttLand: p.post.lastAttackLanded,
		lHitBy: p.post.lastHitBy
	}
}

function inspectPre(p) {
	return {
		//port: p.pre.playerIndex + 1,
		postchar: charNameFromId(p.post.internalCharacterId)[0],
		state: `${stateNameFromState(p.pre.state)} (${p.pre.actionStateCounter})`,
		pos: `x:${p.pre.positionX.toFixed(2)}, y:${p.pre.positionY.toFixed(2)}`,
		joystick: `[${p.pre.joystickX.toFixed(2)},${p.pre.joystickY.toFixed(2)}]`,
		cStick: `[${p.pre.cStickX.toFixed(2)},${p.pre.cStickY.toFixed(2)}]`,
		trigger: `${p.pre.trigger.toFixed(2)}  \
(L: ${p.pre.physicalLTrigger.toFixed(2)}, R: ${p.pre.physicalRTrigger.toFixed(2)},)`,
		//TODO: show button names?
		buttons: `${p.pre.buttons} (${p.pre.physicalButtons})`,
		percent: p.pre.percent.toFixed(2),
		dir: p.pre.facingDirection, 
	}
}

function checkDebug(f) {
	const interval = args.inspect && args.inspect.split(",").map(i => parseInt(i))	
	return args.debug 
		&& (!args.inspect 
			|| interval[0] < f && f < interval[1])
}

function characterIdFromName(name) {
	const index = Data.characterNames.findIndex((tuple) => 
		tuple.some(x => x === name)
	)

	return index !== -1 ? index : undefined
}

function attackIdFromName(name) {
	const index = Data.attackNames.findIndex((tuple) => 
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
		case "string_val": {
			const content = value.text.slice(1, -1).toLowerCase()
			const val = getCharacter(content, frame, data) 
				|| getAttack(content)
				|| getPlayerFromName(content, frame, data)
				|| {type: "string", val: content}

			return val
		}
		case "number_val":
			return {type:"number", val: Number.parseFloat(value.text)}
		case "port_val": {
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
				console.error("Undefined scope for: ", value.name.text)
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
			if(data.functions[expr.name.value]) {
				const automata = data.automata[data.automata.length - 1]
				return !!data.functions[expr.name.value](
					...processParameters(expr.params, frame, data),
					{game: data.game, frame, automata, data: Data}
				)
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
			const jsig = signature.join("_")
			const definition = data.sentences[jsig]
			//console.log("defs",data.definitions)
			//console.log("searching signature", signature.join("_"))
			//console.log("found", definition)
			if (!definition) {
				throw new Error(`Definition not found for signature "${jsig}"`)
			}
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
		//Assuming no match has -1000 frames
		inRuleSince: null,
		name
	}
	// returns true if there's a match of the last temporal on that frame
	machine.feedFrame = (frame, data) => {
		const thenExpr = machine.temporals[machine.currentStep].then
		const beforeExpr = machine.temporals[machine.currentStep].before
		if(!machine.inRuleSince) {
			machine.inRuleSince = frame.frame
		}
		data.automata.push({
			// exposed properties to user
			name: machine.name,
			inRuleSince: machine.inRuleSince
		})
		if(beforeExpr && beforeExpr.checkFrame(frame, data)) {
			if (checkDebug(frame.frame)) {
				console.log("<", name,">", "machine has triggered 'before' at frame", frame.frame, `(${frame.frame +123})`)
			}
			machine.currentStep = 0
			machine.first_accepted = null
			machine.inRuleSince = frame.frame
		}
		if(thenExpr.checkFrame(frame, data)) {
			if (checkDebug(frame.frame)) {
				console.log("<", name,">", "machine is advancing to step", machine.currentStep+1, " at frame", frame.frame, `(${frame.frame +123})`)
			}
			if (!machine.first_accepted) {
				machine.first_accepted = frame.frame
			}
			machine.currentStep += 1
			machine.inRuleSince = frame.frame
			if(machine.currentStep === machine.temporals.length) {
				if (checkDebug(frame.frame)) {
					console.log("and its a match")
				}
				machine.accepted_intervals.push(
					[machine.first_accepted, frame.frame]
				)
				machine.first_accepted = null
				machine.matched_at.push(frame.frame)
				machine.currentStep = 0
				data.automata.pop()
				return true
			}
		}
		data.automata.pop()

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
		else: rule.if_expr.else,
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
		name,
		//Assuming no match has -1000 frames
		inRuleSince: null,
	}
	// returns true if the next state is accepting
	dfa.feedFrame = (frame, data) => {
		if(!dfa.inRuleSince) {
			dfa.inRuleSince = frame.frame
		}
		data.automata.push({
			// exposed properties to user
			name: dfa.name,
			inRuleSince: dfa.inRuleSince,
			currentRule: dfa.currentState.id
		})
		const nextStateId = dfa.currentState.feedFrame(frame, data)
		data.automata.pop()
		if (nextStateId) {
			const nextState = rules.find(r => r.id.text === nextStateId.text)
			if (!nextState) {
				console.info(`State \
${nextStateId.text} at ${nextStateId.line}:${nextStateId.col} \
doesn't exist`)
			} else {
				if (checkDebug(frame.frame)) {
					console.log("<", name,">", "machine moves to state", nextState.id.text, "at frame", frame.frame, `(${frame.frame +123})`)
				}
				dfa.inRuleSince = frame.frame
				dfa.currentState = nextState
			}
		}
		if (dfa.currentState.isAccepting) {
			if (checkDebug(frame.frame)) {
				console.log("<", name,">", "is in an accepting state", dfa.currentState.id.text, "at frame",`(${frame.frame +123})`)
			}
			dfa.accepted_frames.push(frame.frame)
		}

		return dfa.currentState.isAccepting
	}

	return dfa
}

function machineFromDefinition(def, data, name) {
	switch(def.type) {
		case "succession": {
			return temporalAutomataFactory(
				def, 
				data,
				name
			)
		}
		case "dfa": {
			return dfaFactory(
				def,
				data,
				name
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
		const rootMachine = machineFromDefinition(
			data.query.content, 
			{game, ...data}, 
			"root"
		)
		const frame = frameKeys.find(f => 
			rootMachine.feedFrame(frames[f], {game, ...data})
		)
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
		const game = new SlippiGame(file)
		const frames = game.getFrames()
		const frameKeys = Object.keys(frames)
			.map(f => parseInt(f))
			.sort((a, b) => a-b)
		const rootMachine = machineFromDefinition(
			data.query.content, 
			{game, ...data},
			"root"
		)
		if(args.inspect || args.debug) {
			const eqs = "=".repeat(file.length+22)
			console.log(eqs)
			console.log("==========",file,"==========")
			console.log(eqs)
		}
		frameKeys.forEach(f => {
			if(args.inspect) {
				const parts = args.inspect.split(",")
				const interval = parts.map(n => parseInt(n))
				if( interval[0] < f && f < interval[1]) {
					console.log(`--------- Frame ${f} ---------`)
					if (!parts[2] || parts[2] == "pre") {
						console.group(`Pre:`)
						console.table(frames[f].players.map(p => inspectPre(p)))
						console.groupEnd()
					}
					if (!parts[2] || parts[2] == "post") {
						console.group(`Post:`)
						console.table(frames[f].players.map(p => inspectPost(p)))
						console.groupEnd()
					}
				}
			}
			rootMachine.feedFrame(frames[f], {game, ...data})
		})
		// for now, different for dfa and succession
		const intervals = rootMachine.accepted_intervals 
			|| computeIntervals(rootMachine.accepted_frames)
		return intervals
	}
}

function executeQuery(data) {
	const files = glob.sync(args.path)
	if(files.length === 0) {
		Log.info(`No files found at ${args.path}`)
		return []
	}
	let result
	switch(data.query.target.text) {
		case "matches": {
			const gfo = getFirstOccurrence(data)
			const fs = files.map(f => ({file:f, first_occurrence: gfo(f)}))
				.filter(tuple => !!tuple.first_occurrence)
				//.map(tuple => `found occurrence in ${tuple.f} at frame ${tuple.o}`)
			result = {target: "matches", files: fs}
		}
		case "frames": {
			const gi = getFrameIntervals(data)
			const fs = files.map(f => ({file:f, intervals: gi(f)}))
				.filter(tuple => tuple.intervals.length > 0)
				/*
				.map(tuple => {
					const intervals = tuple.o.reverse().reduce((pre, curr) =>
						curr[0] !== curr[1]
							? `[${curr[0]} (${curr[0]+123}), ${curr[1]} (${curr[1]+123})],\t${pre}`
							: `${curr[0]} (${curr[0]+123}),\t\t${pre}`
					, "")
					return `found occurrence in ${tuple.f} at the following intervals:
${intervals}`
				})*/
			result = {target: "frames", files: fs}
		}
	}
	if (data.query.verb.type === "function") {
		data.verbs[data.query.verb.name](result, ...processParameters(data.query.verb.params))
	} else {
		data.verbs[data.query.verb.text](result)
	}
}

function evaluateSentence(definition, data) {
	const parameters = []
	const signature = definition.signature.reduce((pre, curr) => {
		switch (curr.type) {
			case "infix":
				//TODO: do better? fix in grammar?
				const typename = curr.rval.value.includes("_val") 
					? curr.rval.value.slice(0, -4) 
					: curr.rval.value
				parameters.push(curr.lval)
				return `${pre}_${typename}`
			case "literal":
				return `${pre}_${curr.value}`
			default:
				return `_error`
				console.error("Unknown token:", curr)
		}
	},"").slice(1)
	data.sentences[signature] = {
		machine: machineFromDefinition(definition.body, data, signature),
		parameters,
	}

}

function evaluateFunction(f, data) {
	const fparams = f.params.map(p => p.text)
	data.functions[f.name.value] = new Function(...fparams, f.body.text)
}

function evaluateVerb(f, data) {
	const fparams = f.params.map(p => p.text)
	data.verbs[f.name.value] = new Function(...fparams, f.body.text)
}

function execute(q, path) {
	let data = {
		query: null,
		sentences: {},
		functions: {},
		verbs: {},
		scope: [],
		automata: []
	}
	q.forEach((stmt) => {
		switch(stmt.type) {
			case "query":
				data.query = stmt
				break;
			case "js_func": 
				evaluateFunction(stmt, data)
				break;
			case "verb":
				evaluateVerb(stmt, data)
				break;
			case "sentence":
				evaluateSentence(stmt, data)
				break;
		}
	})
	executeQuery(data)
}

//future work:
//-find cool name (Inspector Batra?)
//-graphical DFA's
//-syntax highlight
//-move to typed lang (typescript or rescript)
//-better error detection and reporting
//-better signatures to allow type hierarchy
//-templating system for definitions
//-exists vs forall behaviour (when searching for a frame match, 'always' keyword?)

// TODO:
// - "someone" literal
// - allow functions to write to global data
// - aliases for subjects
// - "from" ("like" could be done with from?)
// - basic verbs (play, record, copy)
// - import std