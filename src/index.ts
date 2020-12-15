import Nearley from "nearley"
//the grammar module will be available after build step
//@ts-ignore
import grammar from "./grammar"


import {
	Failable,
	Failure,
	Success
} from "./Failable"

export * as Failable 	from "./Failable"

function executeParser(text: string): Failable<any, any> {
	const parser = new Nearley.Parser(
		Nearley.Grammar.fromCompiled(grammar)
	)

	try {
		parser.feed(text)
	} catch (err) {
		return Failure({reason: err})
	}

	if (parser.results.length < 1) {
		return Failure({reason: "Invalid Chart file"})
	} else if(parser.results.length > 1) {
		console.warn("mql: Ambiguous input")
	}

	return Success(parser.results[0])
}

export default class Parser {
	static parse(text: string): Failable<any, any> {
		const parseResult = executeParser(text)
		if (!parseResult.ok) {
			return parseResult
		}

		return Success(parseResult.value)
	}
}