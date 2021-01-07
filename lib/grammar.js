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
	"and",
	"or",
	"not",
	"define",
	"then",
	"before",
	// Subjects
	"someone",
	// Types
	"match",
	"player",
	"character",
	"attack"
]

//TOOD: something happens when reading tabs from stdin
const keywordsMap = Object.fromEntries(
	keywords.map(k => [k, k])
)

let lexer = moo.compile({
	ws: 		{match: /[ \t\n\r]+/, lineBreaks: true},
	js: 		{match: /js\{[^]*\}/, lineBreaks: true},
	string: 	/"(?:\\["bfnrt\/\\]|\\u[a-fA-F0-9]{4}|[^"\\])*"/,
	literal: 	{match: /[a-zA-Z_]+/, type: moo.keywords(keywordsMap)},
	number: 	/[0-9]+(?:\.[0-9]+)?/,
	lp:			"(",
	rp:			")",
	co: 		":",
	eq: 		"=",
	dol: 		"$",
	comma:		","

})

const identity		= (a)			     	=> a
const takeFirst		= ([a])					=> a
const removeFirst   = ([_, a]) 				=> a
const removeTwo		= ([_, __, a]) 			=> a
const catWithRest 	= ([r, i])				=> [...(r||[]), i]
const removeSecond 	= ([a, _, b])			=> [a, b]
const removeSecondAndCat 	= ([a, _, b])	=> [...(a||[]), b]
const query 		= ([target, _, succ])	=> ({type: "query",target, succession: succ})
const succession 	= ([expr, succ])		=> ({type: "succession", expression: expr, temporals: succ})
const temporal 		= ([_, then, before])	=> ({type: "temporal", then, before})
const infix 		= ([lval, op, rval]) 	=> ({type: "infix", op, lval, rval})
const prefix 		= ([op, rval])		 	=> ({type: "prefix", op, rval})
const paramRef 		= ([_, name])			=> ({type: "ref", name})
const definition 	= ([_, __, s, ___, b])	=> ({type: "definition", signature: s, body: b})
const func 			= ([name, _, params])	=> ({type: "function", name, params})
const funcDef 		= ([_, __, head, body]) => ({type: "function_def", head, body})
const funcHeader 	= ([name, _, params]) 	=> ({type: "function_head", name, params}) 
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "start$ebnf$1", "symbols": ["statement"]},
    {"name": "start$ebnf$1", "symbols": ["start$ebnf$1", "statement"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "start", "symbols": ["_", "start$ebnf$1"], "postprocess": removeFirst},
    {"name": "statement", "symbols": ["definition", "_"], "postprocess": takeFirst},
    {"name": "statement", "symbols": ["js_block", "_"], "postprocess": takeFirst},
    {"name": "statement", "symbols": ["query", "_"], "postprocess": takeFirst},
    {"name": "js_block", "symbols": [(lexer.has("js") ? {type: "js"} : js)], "postprocess": takeFirst},
    {"name": "definition", "symbols": [(lexer.has("define") ? {type: "define"} : define), "__", "signature", "__", "body"], "postprocess": definition},
    {"name": "signature", "symbols": ["signature", "__", "param_def"], "postprocess": removeSecondAndCat},
    {"name": "signature", "symbols": ["signature", "__", (lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": removeSecondAndCat},
    {"name": "signature", "symbols": ["param_def", "__", (lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": removeSecond},
    {"name": "signature", "symbols": [(lexer.has("literal") ? {type: "literal"} : literal), "__", "param_def"], "postprocess": removeSecond},
    {"name": "param_def", "symbols": [(lexer.has("literal") ? {type: "literal"} : literal), (lexer.has("co") ? {type: "co"} : co), "type"], "postprocess": infix},
    {"name": "body", "symbols": [(lexer.has("eq") ? {type: "eq"} : eq), "_", "succession"], "postprocess": removeTwo},
    {"name": "query", "symbols": ["target", "where", "succession"], "postprocess": query},
    {"name": "succession$ebnf$1", "symbols": ["expression"], "postprocess": id},
    {"name": "succession$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "succession$ebnf$2", "symbols": []},
    {"name": "succession$ebnf$2", "symbols": ["succession$ebnf$2", "temporal"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "succession", "symbols": ["succession$ebnf$1", "succession$ebnf$2"], "postprocess": succession},
    {"name": "temporal$ebnf$1", "symbols": ["before_expr"], "postprocess": id},
    {"name": "temporal$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "temporal", "symbols": ["then", "expression", "temporal$ebnf$1"], "postprocess": temporal},
    {"name": "before_expr", "symbols": ["before", "expression"], "postprocess": removeFirst},
    {"name": "expression", "symbols": ["expression", "and", "term", "_"], "postprocess": infix},
    {"name": "expression", "symbols": ["expression", "or", "term", "_"], "postprocess": infix},
    {"name": "expression", "symbols": ["not", "expression", "_"], "postprocess": prefix},
    {"name": "expression", "symbols": ["term", "_"], "postprocess": takeFirst},
    {"name": "term", "symbols": ["sentence"], "postprocess": takeFirst},
    {"name": "term", "symbols": ["function_call"], "postprocess": takeFirst},
    {"name": "term", "symbols": [(lexer.has("lp") ? {type: "lp"} : lp), "_", "expression", "_", (lexer.has("rp") ? {type: "rp"} : rp)], "postprocess": removeTwo},
    {"name": "function_call", "symbols": [(lexer.has("literal") ? {type: "literal"} : literal), (lexer.has("lp") ? {type: "lp"} : lp), "param_values", (lexer.has("rp") ? {type: "rp"} : rp)], "postprocess": func},
    {"name": "sentence", "symbols": ["sentence", "__", "subject"], "postprocess": removeSecondAndCat},
    {"name": "sentence", "symbols": ["sentence", "__", (lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": removeSecondAndCat},
    {"name": "sentence", "symbols": ["subject", "__", (lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": removeSecond},
    {"name": "sentence", "symbols": [(lexer.has("literal") ? {type: "literal"} : literal), "__", "subject"], "postprocess": removeSecond},
    {"name": "param_values$subexpression$1", "symbols": [(lexer.has("comma") ? {type: "comma"} : comma), "_"]},
    {"name": "param_values", "symbols": ["param_values", "param_values$subexpression$1", "subject"], "postprocess": removeSecond},
    {"name": "param_values", "symbols": ["subject"], "postprocess": takeFirst},
    {"name": "not", "symbols": ["__", (lexer.has("not") ? {type: "not"} : not), "__"], "postprocess": removeFirst},
    {"name": "and", "symbols": ["__", (lexer.has("and") ? {type: "and"} : and), "__"], "postprocess": removeFirst},
    {"name": "or", "symbols": ["__", (lexer.has("or") ? {type: "or"} : or), "__"], "postprocess": removeFirst},
    {"name": "where", "symbols": ["__", (lexer.has("where") ? {type: "where"} : where), "__"], "postprocess": removeFirst},
    {"name": "then", "symbols": ["__", (lexer.has("then") ? {type: "then"} : then), "__"], "postprocess": removeFirst},
    {"name": "before", "symbols": ["__", (lexer.has("before") ? {type: "before"} : before), "__"], "postprocess": removeFirst},
    {"name": "param_ref", "symbols": [(lexer.has("dol") ? {type: "dol"} : dol), (lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": paramRef},
    {"name": "subject", "symbols": [(lexer.has("someone") ? {type: "someone"} : someone)], "postprocess": takeFirst},
    {"name": "subject", "symbols": [(lexer.has("match") ? {type: "match"} : match)], "postprocess": takeFirst},
    {"name": "subject", "symbols": [(lexer.has("string") ? {type: "string"} : string)], "postprocess": takeFirst},
    {"name": "subject", "symbols": [(lexer.has("number") ? {type: "number"} : number)], "postprocess": takeFirst},
    {"name": "subject", "symbols": ["param_ref"], "postprocess": takeFirst},
    {"name": "type", "symbols": [(lexer.has("match") ? {type: "match"} : match)], "postprocess": takeFirst},
    {"name": "type", "symbols": [(lexer.has("player") ? {type: "player"} : player)], "postprocess": takeFirst},
    {"name": "type", "symbols": [(lexer.has("character") ? {type: "character"} : character)], "postprocess": takeFirst},
    {"name": "type", "symbols": [(lexer.has("attack") ? {type: "attack"} : attack)], "postprocess": takeFirst},
    {"name": "target", "symbols": [(lexer.has("matches") ? {type: "matches"} : matches)], "postprocess": identity},
    {"name": "__", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": null},
    {"name": "_$ebnf$1", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": id},
    {"name": "_$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": null}
]
  , ParserStart: "start"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
