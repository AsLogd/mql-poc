// Generated automatically by nearley, version 2.19.9
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

const moo = require('moo')

const keywords = [
	//Targets
	"matches",
	"frames",
	// Keywords
	"where",
	"from",
	"and",
	"or",
	"not",
	"then",
	"before",
	"if",
	"elseif",
	"else",
	"sentence",
	"verb",
	"function",
	// Subjects
	"someone",
	// Types
	"player",
	"character",
	"attack",
	"port",
	"string",
	"number",
]

//TOOD: something happens when reading tabs from stdin
const keywordsMap = Object.fromEntries(
	keywords.map(k => [k, k])
)

let lexer = moo.compile({
	ws: 		{match: /[ \t\n\r]+/, lineBreaks: true},
	block: 		{match: /\#\{[^]*?\}\#/, lineBreaks: true},
	obj_val: 	/"(?:\\["bfnrt\/\\]|\\u[a-fA-F0-9]{4}|[^"\\])*"/,
	string_val: /'(?:\\['bfnrt\/\\]|\\u[a-fA-F0-9]{4}|[^'\\])*'/,
	port_val:	/p[1-4]/,
	number_val: /[0-9]+(?:\.[0-9]+)?/,
	literal: 	{match: /[a-zA-Z_]+/, type: moo.keywords(keywordsMap)},
	lp:			"(",
	rp:			")",
	arrow:		"->",
	co: 		":",
	eq: 		"=",
	dol: 		"$",
	plus: 		"+",
	comma:		","

})

//TODO: do the same with "port" and "string"?
function cleanBody(body) {
	return {
		...body,
		text: body.text.slice(2, -2)
	}
}

//TODO: refactor, separate types on def and value?
const identity		= (a)			     	=> a
const takeFirst		= ([a])					=> a
const removeFirst   = ([_, a]) 				=> a
const removeTwo		= ([_, __, a]) 			=> a
const takeNth 		= (n) => (vals)			=> vals[n]
const catWithRest 	= ([r, i])				=> [...(r||[]), i]
const removeSecond 	= ([a, _, b])			=> [a, b]
const removeSecondAndCat 	= ([a, _, b])	=> [...(a||[]), b]
const query 		= ([verb, [t,c], from]) => ({type: "query", target: t, content: c, verb, from})
const fromExpr 		= ([_, [t,c], from]) 	=> ({type: "from", target: t, content: c, from})
const succession 	= ([expr, succ])		=> ({type: "succession", temporals: [expr, ...succ]})
const temporal 		= ([_, then, before])	=> ({type: "temporal", then, before})
const specialTemporal = ([then, before])	=> ({type: "temporal", then, before})
const infix 		= ([lval, op, rval]) 	=> ({type: "infix", op, lval, rval})
const prefix 		= ([op, rval])		 	=> ({type: "prefix", op, rval})
const sentence 		= ([val])				=> ({type: "sentence", val})
const paramRef 		= ([_, name])			=> ({type: "ref", name})
const definition 	= ([_, __, s, ___, b])	=> ({type: "sentence", signature: s, body: b})
const jsFunc 		= ([name, p, _, body])	=> ({type: "js_func", name, params: p, body: cleanBody(body)})
const verb 			= ([name, p, _, body])	=> ({type: "verb", name, params: p, body: cleanBody(body)})
const func 			= ([name, _, params])	=> ({type: "function", name, params})
const dfa 			= ([a]) 				=> ({type: "dfa", rules: [a]})
const addRule		= ([dfa, _, rule]) 		=> ({type: "dfa", rules: [...dfa.rules, rule]})
const dfaRule 		= ([t, _, id, __, ife]) => ({type: "dfa_rule", isAccepting: !!t, id, if_expr: ife})
const ifExpr 		= ([_, cont, elifs, el])=> ({type: "if_expr", conditions: [cont, ...elifs], else: el})
const ifContent 	= ([_, expr, res]) 		=> ({type: "if_content", expression: expr, result: res})
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "start$ebnf$1", "symbols": ["statement"]},
    {"name": "start$ebnf$1", "symbols": ["start$ebnf$1", "statement"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "start", "symbols": ["_", "start$ebnf$1"], "postprocess": removeFirst},
    {"name": "statement", "symbols": ["sentence_def", "_"], "postprocess": takeFirst},
    {"name": "statement", "symbols": ["js_func", "_"], "postprocess": takeFirst},
    {"name": "statement", "symbols": ["verb", "_"], "postprocess": takeFirst},
    {"name": "statement", "symbols": ["query", "_"], "postprocess": takeFirst},
    {"name": "js_func", "symbols": ["js_header", "js_params", "_", "js_body"], "postprocess": jsFunc},
    {"name": "js_header", "symbols": [(lexer.has("function") ? {type: "function"} : "function"), "__", (lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": takeNth(2)},
    {"name": "js_params$ebnf$1", "symbols": ["js_plist"], "postprocess": id},
    {"name": "js_params$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "js_params", "symbols": [(lexer.has("lp") ? {type: "lp"} : lp), "_", "js_params$ebnf$1", "_", (lexer.has("rp") ? {type: "rp"} : rp)], "postprocess": takeNth(2)},
    {"name": "js_plist$subexpression$1", "symbols": [(lexer.has("comma") ? {type: "comma"} : comma), "_"]},
    {"name": "js_plist", "symbols": ["js_plist", "js_plist$subexpression$1", (lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": removeSecondAndCat},
    {"name": "js_plist", "symbols": [(lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": identity},
    {"name": "js_body", "symbols": [(lexer.has("block") ? {type: "block"} : block)], "postprocess": takeFirst},
    {"name": "sentence_def", "symbols": [(lexer.has("sentence") ? {type: "sentence"} : sentence), "__", "signature", "__", "body"], "postprocess": definition},
    {"name": "signature", "symbols": ["signature", "__", "param_def"], "postprocess": removeSecondAndCat},
    {"name": "signature", "symbols": ["signature", "__", (lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": removeSecondAndCat},
    {"name": "signature", "symbols": ["param_def"], "postprocess": identity},
    {"name": "signature", "symbols": [(lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": identity},
    {"name": "verb", "symbols": ["verb_header", "js_params", "_", "js_body"], "postprocess": verb},
    {"name": "verb_header", "symbols": [(lexer.has("verb") ? {type: "verb"} : verb), "__", (lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": takeNth(2)},
    {"name": "param_def", "symbols": [(lexer.has("literal") ? {type: "literal"} : literal), (lexer.has("co") ? {type: "co"} : co), "type"], "postprocess": infix},
    {"name": "body", "symbols": [(lexer.has("eq") ? {type: "eq"} : eq), "_", "query_content"], "postprocess": removeTwo},
    {"name": "query$ebnf$1", "symbols": ["from_expr"], "postprocess": id},
    {"name": "query$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "query", "symbols": ["verb_call", "where_expr", "query$ebnf$1"], "postprocess": query},
    {"name": "where_expr", "symbols": ["target", "where", "query_content"], "postprocess": removeSecond},
    {"name": "from_expr$ebnf$1$subexpression$1", "symbols": ["__", "from_expr"]},
    {"name": "from_expr$ebnf$1", "symbols": ["from_expr$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "from_expr$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "from_expr", "symbols": ["from", "where_expr", "from_expr$ebnf$1"], "postprocess": fromExpr},
    {"name": "verb_call", "symbols": [(lexer.has("literal") ? {type: "literal"} : literal), "__"], "postprocess": takeFirst},
    {"name": "verb_call", "symbols": ["function_call", "__"], "postprocess": func},
    {"name": "query_content", "symbols": ["succession"], "postprocess": takeFirst},
    {"name": "query_content", "symbols": ["dfa"], "postprocess": takeFirst},
    {"name": "dfa", "symbols": ["dfa", "__", "dfa_rule"], "postprocess": addRule},
    {"name": "dfa", "symbols": ["dfa_rule"], "postprocess": dfa},
    {"name": "dfa_rule$ebnf$1", "symbols": [(lexer.has("plus") ? {type: "plus"} : plus)], "postprocess": id},
    {"name": "dfa_rule$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "dfa_rule", "symbols": ["dfa_rule$ebnf$1", "_", "rule_id", "_", "if_expr"], "postprocess": dfaRule},
    {"name": "rule_id", "symbols": [(lexer.has("literal") ? {type: "literal"} : literal), "_", (lexer.has("co") ? {type: "co"} : co)], "postprocess": takeNth(0)},
    {"name": "if_expr$ebnf$1", "symbols": []},
    {"name": "if_expr$ebnf$1", "symbols": ["if_expr$ebnf$1", "else_if"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "if_expr$ebnf$2", "symbols": ["else"], "postprocess": id},
    {"name": "if_expr$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "if_expr", "symbols": [(lexer.has("if") ? {type: "if"} : "if"), "if_content", "if_expr$ebnf$1", "if_expr$ebnf$2"], "postprocess": ifExpr},
    {"name": "else_if", "symbols": [(lexer.has("elseif") ? {type: "elseif"} : elseif), "if_content"], "postprocess": takeNth(1)},
    {"name": "else", "symbols": [(lexer.has("else") ? {type: "else"} : "else"), "if_result"], "postprocess": takeNth(1)},
    {"name": "if_content", "symbols": ["__", "expression", "if_result"], "postprocess": ifContent},
    {"name": "if_result", "symbols": ["__", (lexer.has("arrow") ? {type: "arrow"} : arrow), "_", (lexer.has("literal") ? {type: "literal"} : literal), "_"], "postprocess": takeNth(3)},
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
    {"name": "expression", "symbols": ["term", "_"], "postprocess": takeFirst},
    {"name": "term", "symbols": ["not", "term", "_"], "postprocess": prefix},
    {"name": "term", "symbols": ["sentence"], "postprocess": sentence},
    {"name": "term", "symbols": ["function_call"], "postprocess": takeFirst},
    {"name": "term", "symbols": [(lexer.has("lp") ? {type: "lp"} : lp), "_", "expression", "_", (lexer.has("rp") ? {type: "rp"} : rp)], "postprocess": removeTwo},
    {"name": "function_call$ebnf$1", "symbols": ["param_values"], "postprocess": id},
    {"name": "function_call$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "function_call", "symbols": [(lexer.has("literal") ? {type: "literal"} : literal), (lexer.has("lp") ? {type: "lp"} : lp), "function_call$ebnf$1", (lexer.has("rp") ? {type: "rp"} : rp)], "postprocess": func},
    {"name": "sentence", "symbols": ["sentence", "__", "subject"], "postprocess": removeSecondAndCat},
    {"name": "sentence", "symbols": ["sentence", "__", (lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": removeSecondAndCat},
    {"name": "sentence", "symbols": ["subject"], "postprocess": identity},
    {"name": "sentence", "symbols": [(lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": identity},
    {"name": "param_values$subexpression$1", "symbols": [(lexer.has("comma") ? {type: "comma"} : comma), "_"]},
    {"name": "param_values", "symbols": ["param_values", "param_values$subexpression$1", "subject"], "postprocess": removeSecondAndCat},
    {"name": "param_values", "symbols": ["subject"], "postprocess": identity},
    {"name": "not", "symbols": [(lexer.has("not") ? {type: "not"} : not), "__"], "postprocess": takeFirst},
    {"name": "and", "symbols": ["__", (lexer.has("and") ? {type: "and"} : and), "__"], "postprocess": removeFirst},
    {"name": "or", "symbols": ["__", (lexer.has("or") ? {type: "or"} : or), "__"], "postprocess": removeFirst},
    {"name": "where", "symbols": ["__", (lexer.has("where") ? {type: "where"} : where), "__"], "postprocess": removeFirst},
    {"name": "then", "symbols": ["__", (lexer.has("then") ? {type: "then"} : then), "__"], "postprocess": removeFirst},
    {"name": "before", "symbols": ["__", (lexer.has("before") ? {type: "before"} : before), "__"], "postprocess": removeFirst},
    {"name": "from", "symbols": [(lexer.has("from") ? {type: "from"} : from), "__"], "postprocess": takeFirst},
    {"name": "param_ref", "symbols": [(lexer.has("dol") ? {type: "dol"} : dol), (lexer.has("literal") ? {type: "literal"} : literal)], "postprocess": paramRef},
    {"name": "subject", "symbols": [(lexer.has("someone") ? {type: "someone"} : someone)], "postprocess": takeFirst},
    {"name": "subject", "symbols": [(lexer.has("obj_val") ? {type: "obj_val"} : obj_val)], "postprocess": takeFirst},
    {"name": "subject", "symbols": [(lexer.has("string_val") ? {type: "string_val"} : string_val)], "postprocess": takeFirst},
    {"name": "subject", "symbols": [(lexer.has("number_val") ? {type: "number_val"} : number_val)], "postprocess": takeFirst},
    {"name": "subject", "symbols": [(lexer.has("port_val") ? {type: "port_val"} : port_val)], "postprocess": takeFirst},
    {"name": "subject", "symbols": ["param_ref"], "postprocess": takeFirst},
    {"name": "type", "symbols": [(lexer.has("player") ? {type: "player"} : player)], "postprocess": takeFirst},
    {"name": "type", "symbols": [(lexer.has("port") ? {type: "port"} : port)], "postprocess": takeFirst},
    {"name": "type", "symbols": [(lexer.has("character") ? {type: "character"} : character)], "postprocess": takeFirst},
    {"name": "type", "symbols": [(lexer.has("attack") ? {type: "attack"} : attack)], "postprocess": takeFirst},
    {"name": "type", "symbols": [(lexer.has("string") ? {type: "string"} : string)], "postprocess": takeFirst},
    {"name": "type", "symbols": [(lexer.has("number") ? {type: "number"} : number)], "postprocess": takeFirst},
    {"name": "target", "symbols": [(lexer.has("matches") ? {type: "matches"} : matches)], "postprocess": takeFirst},
    {"name": "target", "symbols": [(lexer.has("frames") ? {type: "frames"} : frames)], "postprocess": takeFirst},
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
