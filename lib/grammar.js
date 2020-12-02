// Generated automatically by nearley, version 2.19.9
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

const moo = require('moo')

const keywords = [
	//Targets
	"matches",
	// Keywords
	"where",
	"is",
	"and",
	"or",
	"not",
	// Subjects
	"someone",
]
const keywordsMap = Object.fromEntries(
	keywords.map(k => [k, k])
)

let lexer = moo.compile({
	nl: 		{match: /[\n\r]+/, lineBreaks: true},
	ws: 		{match: /[ \t\n\r]+/, lineBreaks: true},
	string: 	/"(?:\\["bfnrt\/\\]|\\u[a-fA-F0-9]{4}|[^"\\])*"/,
	literal: 	{match: /[a-zA-Z]+/, type: moo.keywords(keywordsMap)},
	lp:			"(",
	rp:			")",
})

const identity		= (a)			     	=> a
const query 		= ([target, _, expr])	=> ({target, expr})
const infix 		= ([lval, op, rval]) 	=> ({op, lval, rval})
const prefix 		= ([operator, rval]) 	=> ({operator, rval})
const removeFirst   = ([_, a]) 				=> a
const catWithRest 	= ([i, r])				=> [i, ...(r||[])]
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "query", "symbols": ["target", "where", "expression"], "postprocess": query},
    {"name": "expression", "symbols": ["boolean"], "postprocess": id},
    {"name": "boolean", "symbols": ["boolean", "and", "statement"], "postprocess": infix},
    {"name": "boolean", "symbols": ["boolean", "or", "statement"], "postprocess": infix},
    {"name": "boolean", "symbols": ["not", "boolean"], "postprocess": prefix},
    {"name": "boolean", "symbols": ["statement"], "postprocess": identity},
    {"name": "statement", "symbols": ["subject", "is", "value"], "postprocess": infix},
    {"name": "statement", "symbols": [(lexer.has("lp") ? {type: "lp"} : lp), "boolean", (lexer.has("rp") ? {type: "rp"} : rp)], "postprocess": removeFirst},
    {"name": "not", "symbols": ["__", (lexer.has("not") ? {type: "not"} : not)], "postprocess": removeFirst},
    {"name": "and", "symbols": ["__", (lexer.has("and") ? {type: "and"} : and), "__"], "postprocess": removeFirst},
    {"name": "or", "symbols": ["__", (lexer.has("or") ? {type: "or"} : or), "__"], "postprocess": removeFirst},
    {"name": "where", "symbols": ["__", (lexer.has("where") ? {type: "where"} : where), "__"], "postprocess": removeFirst},
    {"name": "is", "symbols": ["__", (lexer.has("is") ? {type: "is"} : is), "__"], "postprocess": removeFirst},
    {"name": "subject", "symbols": [(lexer.has("someone") ? {type: "someone"} : someone)], "postprocess": identity},
    {"name": "subject", "symbols": [(lexer.has("match") ? {type: "match"} : match)], "postprocess": identity},
    {"name": "subject", "symbols": ["value"], "postprocess": identity},
    {"name": "target", "symbols": [(lexer.has("matches") ? {type: "matches"} : matches)]},
    {"name": "value", "symbols": [(lexer.has("string") ? {type: "string"} : string)]},
    {"name": "__", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": null},
    {"name": "_$ebnf$1", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": id},
    {"name": "_$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": null}
]
  , ParserStart: "query"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
