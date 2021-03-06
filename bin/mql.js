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
const https = require('https');

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
	return frame.players.filter(playerFrame => playerFrame.pre.playerIndex === id)
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

function getPlayerFromNameRef(name, data) {
	const metadata = data.game.getMetadata()
	for (const key in metadata.players) {
		if(metadata.players[key].names.netplay === name
		|| metadata.players[key].names.code === name) {
			return {
				type:"player",
				name
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
function getCharacter(id, frame, data) {
	//console.log("get", name, " with id ", characterIdFromName(name))
	//console.log("available ids", frame.players.map(p => p.post.internalCharacterId))
	const character = frame.players.find(p => 
		p.post.internalCharacterId === id
	) 
	return character && {
		type:"character",
		character
	}
}

function getPlayerRef(id, data) {
	const metadata = data.game.getMetadata()
	if(!metadata.players[id]) {
		return false
	}
	return {
		type:"player",
		id
	}	
}
function getCharacterRef(name) {
	const id = characterIdFromName(name)
	if(!id) {
		return false
	}
	return {
		type:"character",
		name,
		id
	}
}

function parseValue(value, data) {

	switch(value.type) {
		case "someone":
			return "someone"
		case "match":
			return data.settings
		case "obj_val": {
			const content = value.text.slice(1, -1).toLowerCase()
			const val = getCharacterRef(content) 
				|| getAttack(content)
				|| getPlayerFromNameRef(content, data)
				|| {type: "unknown", val: content}
			if (args.debug && val.type === "unknown") {
				console.warn("Couldn't find object ", content)
			}
			return val
		}
		case "string_val": {
			const content = value.text.slice(1, -1).toLowerCase()
			return {type: "string", val: content}
		}
		case "number_val":
			return {type:"number", val: Number.parseFloat(value.text)}
		case "port_val": {
			const portNumber = parseInt(value.value.slice(1))
			const val = getPlayerRef(portNumber-1, data)
			if (!val) {
				console.error("No player at port: ", value.text)
				return "error"
			}
			return {type:"port", portNumber}
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
		default: {
			return {type: "unknown"}
		}
	}
}

function resolveValue(value, frame, data) {

	switch(value.type) {
		case "character": {
			return getCharacter(value.id,frame, data)
		}
		case "player": {
			return getPlayerFromName(value.name, frame, data)
		}
		case "port_val": {
			const portNumber = parseInt(value.value.slice(1))
			const val = getPlayer(portNumber-1, frame, data)
			if (!val) {
				console.error("No player at port: ", value.text)
				return "error"
			}
			return {type:"port", portNumber, player: val}
		}
		case "ref": {
			console.error("trying to resolve a ref")
			return "error"
		}
		default: {
			return value
		}
	}
}

function resolveValues(values, frame, data) {
	return values 
		? values.map(v => resolveValue(v,frame, data))
		: []
}

function processParameters(params, data) {
	return params 
		? params.map(p => parseValue(p, data))
		: []
}

function scopeFromParams(names, values) {
	const scope = {}
	names.forEach((name, i) => {
		scope[name] = values[i]
	})
	return scope
}

//TODO this needs frames
function checkExpressionForFrame(expr, frame, data) {
	//console.log("checking", expr)
	switch(expr.type) {
		case "infix": {
			let res = false 
			if(expr.op == "or") {
				res = checkExpressionForFrame(expr.lval, frame, data)
					|| checkExpressionForFrame(expr.rval, frame, data)
			} else { // and
				res = checkExpressionForFrame(expr.lval, frame, data)
					&& checkExpressionForFrame(expr.rval, frame, data)
			}
	//console.log("result", res)

			return res
		}
		case "prefix":
			// Only not for now
			return !checkExpressionForFrame(expr.rval, frame, data)
		case "function":{
			if(data.functions[expr.name.value]) {
				const automata = data.automata[data.automata.length - 1]
				const processed = processParameters(expr.params, data)
				const values = resolveValues(
					processed, 
					frame, 
					data
				)
				const unresolved = values.findIndex(v => !v)
				if (unresolved >= 0) {
					if(args.debug) {
						console.info("Couldn't resolve value", processed[unresolved], "in the current file")
					}
					return false
				}
				return !!data.functions[expr.name.value](
					...values,
					{
						game: data.game, 
						frame, 
						automata, 
						constants: Data,
						// TODO: should this depend on context? (i.e. automata), on frame num?
						global: {
							setValue: (name, value) => {
								data.global[name] = value
							},
							//TODO: only for 'effect's
							getValue: (name) => {
								return data.global[name]
							},
						}
					}
				)
			}
			console.error(`Function ${expr.name} is undefined`)
			return false
		}
		case "sentence": {
			const signature = []
			const instance = []
			const params = []
			for (const word of expr.val) {
				if (word.type === "literal") {
					signature.push(word.text)
					instance.push(word.text)
				} else {
					const val = parseValue(word, data)
					if (val.type === "unknown") {
						return false
					}
					instance.push(word.text || val.id)
					signature.push(val.type || val)
					params.push(val)
				}
			}
			const jsig = signature.join("_")
			const isig = instance.join("_")
			const definition = data.sentences[jsig]
			//console.log("defs",data.definitions)
			//console.log("searching signature", signature.join("_"))
			//console.log("found", definition)
			if (!definition) {
				throw new Error(`Definition not found for signature "${jsig}"`)
			}
			if (!definition.instances[isig]) {
				definition.instances[isig] = machineFromDefinition(definition.machineDefinition, data, isig)
			}
			const scope = scopeFromParams(
				definition.parameters,
				params
			)
			data.scope.push(scope)
			const res = definition.instances[isig].feedFrame(frame.frame, data, data.game.getFrames())
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
		inRuleSince: null,
		name
	}
	// returns true if there's a match of the last temporal on that frame
	machine.feedFrame = (fi, data, frames) => {
		const thenExpr = machine.temporals[machine.currentStep].then
		const beforeExpr = machine.temporals[machine.currentStep].before
		if(!machine.inRuleSince) {
			machine.inRuleSince = fi
		}
		data.automata.push({
			// exposed properties to user
			name: machine.name,
			inRuleSince: machine.inRuleSince
		})
		if(beforeExpr && beforeExpr.checkFrame(frames[fi], data)) {
			if (checkDebug(fi)) {
				console.log("<", name,">", "machine has triggered 'before' at frame", fi, `(${fi +123})`)
			}
			machine.currentStep = 0
			machine.first_accepted = null
			machine.inRuleSince = fi
		}
		if(thenExpr.checkFrame(frames[fi], data)) {
			if (checkDebug(fi)) {
				console.log("<", name,">", "machine is advancing to step", machine.currentStep+1, " at frame", fi, `(${fi +123})`)
			}
			if (!machine.first_accepted) {
				machine.first_accepted = fi
			}
			machine.currentStep += 1
			machine.inRuleSince = fi
			if(machine.currentStep === machine.temporals.length) {
				if (checkDebug(fi)) {
					console.log("and its a match")
				}
				machine.accepted_intervals.push(
					[machine.first_accepted, fi]
				)
				machine.first_accepted = null
				machine.matched_at.push(fi)
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
		nextId: cond.result.nextId,
		lookahead: cond.result.lookahead
	}
}

function dfaRuleFactory(rule, data) {
	const obj = {
		id: rule.id,
		isAccepting: rule.isAccepting,
		conditions: rule.if_expr.conditions.map(c => dfaConditionFactory(c, data)),
		else: rule.if_expr.else,
	}

	obj.feedFrame = (fi, data, frames) => {
		const nextState = obj.conditions.find(c => 
			c.expression.checkFrame(frames[fi], data)
		)

		if (nextState) {
			return nextState
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
		currentStateIndex: 0,
		name,
		inRuleSince: null,
		lastLookaheadValue: false,
		cachedResults: {},
		lookingAhead: false
	}
	dfa.clone = () => {
		const newdfa = dfaFactory(dfadef, data, "__"+name)
		newdfa.currentStateIndex = dfa.currentStateIndex
		newdfa.accepted_frames = [...dfa.accepted_frames]
		newdfa.inRuleSince = dfa.inRuleSince
		newdfa.lastLookaheadValue = dfa.lastLookaheadValue
		newdfa.cachedResults = {...dfa.cachedResults}
		return newdfa
	}
	// TODO pls refactor
	// returns true if the next state is accepting
	dfa.feedFrame = (fi, data, frames) => {
		if (dfa.cachedResults[fi] !== undefined) {
			if (checkDebug(fi)) {
				console.log("<", name,">", "returns a cached result at frame", fi, `(${fi +123}):`, dfa.cachedResults[fi])
			}
			if (dfa.cachedResults[fi]) {
				dfa.accepted_frames.push(fi)
			}
			return dfa.cachedResults[fi]
		}
		if(!dfa.inRuleSince) {
			dfa.inRuleSince = fi
		}
		let currentState = dfa.rules[dfa.currentStateIndex]
		data.automata.push({
			// exposed properties to user
			name: dfa.name,
			inRuleSince: dfa.inRuleSince,
			currentRule: currentState.id
		})
		const prevla = currentState.lookahead
		const ns = currentState.feedFrame(fi, data, frames)
		data.automata.pop()
		let lookaheadAccept = null
		if (ns) {
			const nextStateIndex = rules.findIndex(r => r.id.text === ns.nextId.text)
			const nextState = dfa.rules[nextStateIndex]
			if (!nextState) {
				console.info(`State \
${nextStateId.text} at ${nextStateId.line}:${nextStateId.col} \
doesn't exist`)
				return false
			} 
			if (checkDebug(fi)) {
				const la = dfa.lookingAhead ? "\u2551" : ""
				console.log(la, "<", name,">", "currently at state",currentState.id.text," moves to state", nextState.id.text, "at frame", fi, `(${fi +123})`)
			}
			if(!dfa.lookingAhead && !nextState.isAccepting){
				if (ns.lookahead) {
					if (checkDebug(fi)) {
						console.log("\u2554"," <", name,">", "is performing a lookahead search at frame", fi, `(${fi +123}) `, "======")
					}
					dfa.lastLookaheadValue = true
					const ladfa = dfa.clone()
					ladfa.lookingAhead = true
					lookaheadAccept = false
					let acceptFrame
					let i = fi+1
					// while a frame exists, didnt find an accept state and didnt transition with arrow
					while(frames[i] && !lookaheadAccept && ladfa.lastLookaheadValue) {
						lookaheadAccept = ladfa.feedFrame(i, data, frames)
						i += 1;
					}
					if (checkDebug(fi)) {
						console.log("\u255A <", name,">", " the lookahead finished (",lookaheadAccept,"). Resuming at frame ", fi, `(${fi +123})`, "======")
					}
					// infer result for frames
					for (let j = fi+1; j < i-1; j++) {
						dfa.cachedResults[j] = lookaheadAccept
					}
				} else {
					dfa.lastLookaheadValue = false
				}
			} else {
				if(checkDebug(fi)) {
					inspectFrame(fi, frames)
				}
				dfa.lastLookaheadValue = ns.lookahead
			}			
			dfa.inRuleSince = fi
			dfa.currentStateIndex = nextStateIndex
		}
		currentState = dfa.rules[dfa.currentStateIndex]
		if (checkDebug(fi)) {
			if (currentState.isAccepting) {
				const la = dfa.lookingAhead ? "\u2551" : ""
				console.log(la, "<", name,">", "is in an accepting state", currentState.id.text, "at frame",fi,`(${fi +123})`)
			}
			if (lookaheadAccept) {
				console.log("<", name,">", "currently at state", currentState.id.text, ", will be accepted because it leads to a match in the future")
			}
		}
		// I assume its absurd to do lookahead in an accepting state
		const accept = lookaheadAccept || currentState.isAccepting
		if (accept) {
			dfa.accepted_frames.push(fi)
		}

		return accept
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

function getFirstOccurrence(query, data) {
	return (file, game) => {
		data.global = {}
		//console.log("file", file)
		//TODO: debug/inspect
		const frames = game.getFrames()
		const frameKeys = Object.keys(frames)
			.map(f => parseInt(f))
			.sort((a, b) => a-b)
		const rootMachine = machineFromDefinition(
			query.content, 
			{game, ...data}, 
			"root"
		)
		const frame = frameKeys.find(f => 
			rootMachine.feedFrame(f, {game, ...data}, frames)
		)

		return {frame, global: {...data.global}}
	}
}

function cleanIntervals(intervals) {
	const frames = []
	if(intervals.length === 0) {
		return []
	}
	intervals.forEach(itval => {
		for(let i = itval[0]; i <= itval[1]; i++) {
			frames.push(i)
		}
	})
	return computeIntervals(frames)
}

function computeIntervals(frames) {
	if(frames.length === 0) {
		return []
	}
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
	} else {
		res.intervals.push([res.start, res.start])
	}
	return res.intervals
}

function inspectFrame(f, frames) {
	if(!args.inspect)
		return
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

function getFrameIntervals(query, data) {
	return (file, game) => {
		data.global = {}
		const frames = game.getFrames()
		const frameKeys = Object.keys(frames)
			.map(f => parseInt(f))
			.sort((a, b) => a-b)
		const rootMachine = machineFromDefinition(
			query.content, 
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
				inspectFrame(f, frames)
			}
			rootMachine.feedFrame(f, {game, ...data}, frames)
		})
		// for now, different for dfa and succession
		const intervals = rootMachine.accepted_intervals
			? cleanIntervals(rootMachine.accepted_intervals)
			: computeIntervals(rootMachine.accepted_frames)
		return {intervals, global: {...data.global}}
	}
}

function getQueryResult(query, data, files) {
	let inputFiles = files
	if (query.from) {
		const fromResult = getQueryResult(query.from, data, files)
		inputFiles = fromResult.matches.map(file => file.file)
	}
	switch(query.target.text) {
		case "matches": {
			const gfo = getFirstOccurrence(query, data)
			const fs = inputFiles.map(f => {
				const game = new SlippiGame(f)
				const res = gfo(f, game)
				return {game, file:f, first_occurrence: res.frame, global: res.global}
			})
			return {
				target: "matches", 
				matches: fs.filter(tuple => 
					tuple.first_occurrence !== undefined 
					&& tuple.first_occurrence !== null
				),
				files: fs
			}
		}
		case "frames": {
			const gi = getFrameIntervals(query, data)
			const fs = inputFiles.map(f => {
				const game = new SlippiGame(f)
				const res = gi(f, game)
				return {game, file:f, intervals: res.intervals, global: res.global}
			})
			return {
				target: "frames", 
				matches: fs.filter(tuple => tuple.intervals.length > 0), 
				files: fs,
			}
		}
	}
}

function executeQuery(data) {
	const files = glob.sync(args.path)
	if(files.length === 0) {
		Log.info(`No files found at ${args.path}`)
		return []
	}
	const result = getQueryResult(data.query, data, files)

	if (data.query.verb.type === "function") {
		data.verbs[data.query.verb.name](
			result, 
			...processParameters(
				data.query.verb.params, 
				data
			)
		)
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
		machineDefinition: definition.body,
		instances: {},
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

function evaluateImport(imp, data) {
	let imppath = imp.path.text.slice(1, -1)
	let p
	if (imppath.includes("http")) {
		p = getRequest(imppath)
	} else {
		if(imppath === "std") {
			imppath = path.resolve(__dirname, "lib/std")
		}
		p = fs.promises.readFile(imppath, 'utf8');
	}
	return p.then((content) => {
		const parsed = grammarparser.parse(content)
		if (!parsed.ok) {
			throw new Error(parsed.reason)
		}
		return loadInto(parsed.value, data)
	})
}

function getRequest(url) {
	return new Promise((res, rej) => {
		https.get(url, (resp) => {
			let data = ''

			// A chunk of data has been received.
			resp.on('data', (chunk) => {
				data += chunk;
			})

			// The whole response has been received. Print out the result.
			resp.on('end', () => {
				res(data)
			})

		}).on("error", (err) => {
			rej(err)
			console.error("Error: " + err.message);
		})
	})
}

function loadInto(q, data) {
	// Async
	return Promise.all(
		q.map(stmt => {
			switch(stmt.type) {
				case "import":
					return evaluateImport(stmt, data)
				default:
					return Promise.resolve()
			}
		})
	).then(() => {
		q.forEach((stmt) => {
			switch(stmt.type) {
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
	})
}

function execute(q, path) {
	let data = {
		query: null,
		sentences: {},
		functions: {},
		verbs: {},
		scope: [],
		automata: [],
		global: {}
	}
	Promise.all(
		q.map(stmt => {
			switch(stmt.type) {
				case "import":
					return evaluateImport(stmt, data)
				default:
					return Promise.resolve()
			}
		})
	).then(() => {
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
	})
	
}

//future work:
//-rewrite and move to typed lang (for web and cli)
//-everything is nfas
//-find cool name (Anuralogist, Inspector Anura, Peppi)
//-graphical graphs
//-syntax highlight
//-better error detection and reporting
//-better signatures to allow type hierarchy
//-templating/preprocessing system for definitions
//-"someone" literal
//-show ast
//-formalization

// TODO:
// - remove temporalmachine
// - catchup
// - what happens with interior machines when looking ahead? cache that?
// - dont use machines if content is only one expression
// - make verbs definitions with one function call (or add verb alias)
// - verb -> action, sentence -> fact, effect (@disable-lookahead)
// - allos objects as params on verbs
// - create std
// - basic verbs (record, copy)