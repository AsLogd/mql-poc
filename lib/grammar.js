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
	"js",
	"func",
	"then",
	"before",
	// Subjects
	"someone",
	// Types
	"player",
	"character",
	"attack",
]

//TOOD: something happens when reading tabs from stdin
const keywordsMap = Object.fromEntries(
	keywords.map(k => [k, k])
)

let lexer = moo.compile({
	ws: 		{match: /[ \t\n\r]+/, lineBreaks: true},
	block: 		{match: /\{[^]*?\}/, lineBreaks: true},
	string: 	/"(?:\\["bfnrt\/\\]|\\u[a-fA-F0-9]{4}|[^"\\])*"/,
	literal: 	{match: /[a-zA-Z_]+/, type: moo.keywords(keywordsMap)},
	port:		/p[1-4]/,
	number: 	/[0-9]+(?:\.[0-9]+)?/,
	lp:			"(",
	rp:			")",
	co: 		":",
	eq: 		"=",
	dol: 		"$",
	comma:		","

})

function cleanBody(body) {
	return {
		...body,
		text: body.text.slice(1, -1)
	}
}

//TODO: refactor
const identity		= (a)			     	=> a
const takeFirst		= ([a])					=> a
const removeFirst   = ([_, a]) 				=> a
const removeTwo		= ([_, __, a]) 			=> a
const takeNth 		= (n) => (vals)			=> vals[n]
const catWithRest 	= ([r, i])				=> [...(r||[]), i]
const removeSecond 	= ([a, _, b])			=> [a, b]
const removeSecondAndCat 	= ([a, _, b])	=> [...(a||[]), b]
const query 		= ([target, _, succ])	=> ({type: "query",target, succession: succ})
const succession 	= ([expr, succ])		=> ({type: "succession", temporals: [expr, ...succ]})
const temporal 		= ([_, then, before])	=> ({type: "temporal", then, before})
const specialTemporal = ([then, before])	=> ({type: "temporal", then, before})
const infix 		= ([lval, op, rval]) 	=> ({type: "infix", op, lval, rval})
const prefix 		= ([op, rval])		 	=> ({type: "prefix", op, rval})
const sentence 		= ([val])				=> ({type: "sentence", val})
const paramRef 		= ([_, name])			=> ({type: "ref", name})
const definition 	= ([_, __, s, ___, b])	=> ({type: "definition", signature: s, body: b})
const js_func 		= ([name, p, _, body])	=> ({type: "js_func", name, params: p, body: cleanBody(body)})
const func 			= ([name, _, params])	=> ({type: "function", name, params})
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "start$ebnf$1", "symbols": ["statement"]},
    {"name": "start$ebnf$1", "symbols": ["start$ebnf$1", "statement"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "start", "symbols": ["_", "start$ebnf$1"], "postprocess": removeFirst},
    {"name": "statement", "symbols": ["definition", "_"], "postprocess": takeFirst},
    {"name": "statement", "symbols": ["js_func", "_"], "postprocess": takeFirst},
    {"name": "statement", "symbols": ["query", "_"], "postprocess": takeFirst},
    {"name": "js_func", "symbols": ["js_header", "js_params", "_", "js_body"], "postprocess": js_func},
    {"name": "js_header", "symbols": [(lexer.has("js") ? {type: "js"} : js), "__", (lexer.has("func") ? {type: "func"} : func), "__", (lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": takeNth(4)},
    {"name": "js_params$ebnf$1", "symbols": ["js_plist"], "postprocess": id},
    {"name": "js_params$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "js_params", "symbols": [(lexer.has("lp") ? {type: "lp"} : lp), "_", "js_params$ebnf$1", "_", (lexer.has("rp") ? {type: "rp"} : rp)], "postprocess": takeNth(2)},
    {"name": "js_plist$subexpression$1", "symbols": [(lexer.has("comma") ? {type: "comma"} : comma), "_"]},
    {"name": "js_plist", "symbols": ["js_plist", "js_plist$subexpression$1", (lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": removeSecondAndCat},
    {"name": "js_plist", "symbols": [(lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": identity},
    {"name": "js_body", "symbols": [(lexer.has("block") ? {type: "block"} : block)], "postprocess": takeFirst},
    {"name": "definition", "symbols": [(lexer.has("define") ? {type: "define"} : define), "__", "signature", "__", "body"], "postprocess": definition},
    {"name": "signature", "symbols": ["signature", "__", "param_def"], "postprocess": removeSecondAndCat},
    {"name": "signature", "symbols": ["signature", "__", (lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": removeSecondAndCat},
    {"name": "signature", "symbols": ["param_def"], "postprocess": identity},
    {"name": "signature", "symbols": [(lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": identity},
    {"name": "param_def", "symbols": [(lexer.has("literal") ? {type: "literal"} : literal), (lexer.has("co") ? {type: "co"} : co), "type"], "postprocess": infix},
    {"name": "body", "symbols": [(lexer.has("eq") ? {type: "eq"} : eq), "_", "succession"], "postprocess": removeTwo},
    {"name": "query", "symbols": ["target", "where", "succession"], "postprocess": query},
    {"name": "succession$ebnf$1", "symbols": []},
    {"name": "succession$ebnf$1", "symbols": ["succession$ebnf$1", "temporal"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "succession", "symbols": ["special_temporal", "succession$ebnf$1"], "postprocess": succession},
    {"name": "temporal$ebnf$1", "symbols": ["before_expr"], "postprocess": id},
    {"name": "temporal$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "temporal", "symbols": ["then", "expression", "temporal$ebnf$1"], "postprocess": temporal},
    {"name": "special_temporal$ebnf$1", "symbols": ["before_expr"], "postprocess": id},
    {"name": "special_temporal$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "special_temporal", "symbols": ["expression", "special_temporal$ebnf$1"], "postprocess": specialTemporal},
    {"name": "before_expr", "symbols": ["before", "expression"], "postprocess": removeFirst},
    {"name": "expression", "symbols": ["expression", "and", "term", "_"], "postprocess": infix},
    {"name": "expression", "symbols": ["expression", "or", "term", "_"], "postprocess": infix},
    {"name": "expression", "symbols": ["not", "expression", "_"], "postprocess": prefix},
    {"name": "expression", "symbols": ["term", "_"], "postprocess": takeFirst},
    {"name": "term", "symbols": ["sentence"], "postprocess": sentence},
    {"name": "term", "symbols": ["function_call"], "postprocess": takeFirst},
    {"name": "term", "symbols": [(lexer.has("lp") ? {type: "lp"} : lp), "_", "expression", "_", (lexer.has("rp") ? {type: "rp"} : rp)], "postprocess": removeTwo},
    {"name": "function_call", "symbols": [(lexer.has("literal") ? {type: "literal"} : literal), (lexer.has("lp") ? {type: "lp"} : lp), "param_values", (lexer.has("rp") ? {type: "rp"} : rp)], "postprocess": func},
    {"name": "sentence", "symbols": ["sentence", "__", "subject"], "postprocess": removeSecondAndCat},
    {"name": "sentence", "symbols": ["sentence", "__", (lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": removeSecondAndCat},
    {"name": "sentence", "symbols": ["subject"], "postprocess": identity},
    {"name": "sentence", "symbols": [(lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": identity},
    {"name": "param_values$subexpression$1", "symbols": [(lexer.has("comma") ? {type: "comma"} : comma), "_"]},
    {"name": "param_values", "symbols": ["param_values", "param_values$subexpression$1", "subject"], "postprocess": removeSecond},
    {"name": "param_values", "symbols": ["subject"], "postprocess": identity},
    {"name": "not", "symbols": ["__", (lexer.has("not") ? {type: "not"} : not), "__"], "postprocess": removeFirst},
    {"name": "and", "symbols": ["__", (lexer.has("and") ? {type: "and"} : and), "__"], "postprocess": removeFirst},
    {"name": "or", "symbols": ["__", (lexer.has("or") ? {type: "or"} : or), "__"], "postprocess": removeFirst},
    {"name": "where", "symbols": ["__", (lexer.has("where") ? {type: "where"} : where), "__"], "postprocess": removeFirst},
    {"name": "then", "symbols": ["__", (lexer.has("then") ? {type: "then"} : then), "__"], "postprocess": removeFirst},
    {"name": "before", "symbols": ["__", (lexer.has("before") ? {type: "before"} : before), "__"], "postprocess": removeFirst},
    {"name": "param_ref", "symbols": [(lexer.has("dol") ? {type: "dol"} : dol), (lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": paramRef},
    {"name": "subject", "symbols": [(lexer.has("someone") ? {type: "someone"} : someone)], "postprocess": takeFirst},
    {"name": "subject", "symbols": [(lexer.has("string") ? {type: "string"} : string)], "postprocess": takeFirst},
    {"name": "subject", "symbols": [(lexer.has("number") ? {type: "number"} : number)], "postprocess": takeFirst},
    {"name": "subject", "symbols": [(lexer.has("port") ? {type: "port"} : port)], "postprocess": takeFirst},
    {"name": "subject", "symbols": ["param_ref"], "postprocess": takeFirst},
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
