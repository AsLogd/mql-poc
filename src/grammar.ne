@{%
const moo = require('moo')

const keywords = [
	//Targets
	"matches",
	"frames",
	// Keywords
	"true",
	"false",
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
	import: 	/@import/,
	lp:			"(",
	rp:			")",
	arrow:		"->",
	sparrow:	"+>",
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
const ifResult  	= (la) => (res) 		=> ({type: "if_result", lookahead: la, nextId: takeNth(3)(res)})
const boolean 	 	= ([val]) 	 			=> ({type: "boolean", value: val})
const importExpr 	 = ([_,__,path]) 		=> ({type: "import", path})
%} 

@lexer lexer

start	-> _ statement:+					{% removeFirst %}
statement ->	
	  sentence_def _ 						{% takeFirst %}
	| import _ 								{% takeFirst %}
	| js_func _ 							{% takeFirst %}
	| verb _ 								{% takeFirst %}
	| query _ 								{% takeFirst %}

import -> %import __ %string_val 			{% importExpr %}

js_func -> js_header js_params _ js_body	{% jsFunc %}
js_header -> %function __ %literal			{% takeNth(2) %}
js_params -> %lp _ js_plist:? _ %rp			{% takeNth(2) %}
js_plist -> js_plist (%comma _) %literal	{% removeSecondAndCat %}
	| %literal								{% identity %}
js_body -> %block							{% takeFirst %}

sentence_def -> 
	%sentence __ signature __ body 			{% definition %}
signature ->  
	signature __ param_def 					{% removeSecondAndCat %}
	| signature __ %literal					{% removeSecondAndCat %}
	| param_def								{% identity %}
	| %literal 								{% identity %}

verb -> 
	verb_header js_params _ js_body 		{% verb %}
verb_header -> %verb __ %literal			{% takeNth(2) %}

param_def -> %literal %co type				{% infix %}

body -> %eq _ query_content					{% removeTwo %}

query -> 
	verb_call where_expr from_expr:? 		{% query %}

where_expr -> target where query_content 	{% removeSecond %}

from_expr -> 
	from where_expr (__ from_expr):? 		{% fromExpr %}

verb_call ->
	%literal __ 							{% takeFirst %}
	| function_call __ 						{% func %}

query_content -> 
	succession								{% takeFirst %}
	| dfa 									{% takeFirst %}

dfa -> dfa __ dfa_rule 						{% addRule %}
	| dfa_rule								{% dfa %}
dfa_rule -> %plus:? _ rule_id _ if_expr		{% dfaRule %}
rule_id -> %literal _ %co 					{% takeNth(0) %}
if_expr -> %if if_content else_if:* else:?  {% ifExpr %}
else_if -> %elseif if_content				{% takeNth(1) %}
else -> %else if_result						{% takeNth(1) %}
if_content -> __ expression if_result		{% ifContent %}
if_result -> 
	  __ %arrow _ %literal _ 				{% ifResult(false) %}
	| __ %sparrow _ %literal _ 				{% ifResult(true) %}

succession -> special_temporal temporal:* 	{% succession %}
temporal -> then expression before_expr:? 	{% temporal %}
special_temporal-> expression before_expr:? {% specialTemporal %}
before_expr -> before expression 			{% removeFirst %}

expression -> 
	  expression and term _					{% infix %}
	| expression or term _					{% infix %}
	| term _ 								{% takeFirst %}

term ->
	not term _ 								{% prefix %}
	| boolean 								{% takeFirst %}
	| sentence								{% sentence %}
	| function_call							{% takeFirst %}
	| %lp _ expression _ %rp				{% removeTwo %}

boolean -> 
	%true 									{% boolean %}
	| %false								{% boolean %}

function_call ->
	%literal %lp param_values:? %rp			{% func %}

sentence ->
	sentence __ subject 					{% removeSecondAndCat %}
	| sentence __ %literal					{% removeSecondAndCat %}
	| subject								{% identity %}
	| %literal 								{% identity %}


param_values ->
	  param_values (%comma _) subject 		{% removeSecondAndCat %}
	| subject 								{% identity %}


not			 -> %not __ 					{% takeFirst %}
and			 -> __ %and __					{% removeFirst %}
or			 -> __ %or __					{% removeFirst %}
where		 -> __ %where __				{% removeFirst %}
then		 -> __ %then __					{% removeFirst %}
before		 -> __ %before __				{% removeFirst %}

from		 -> %from __					{% takeFirst %}

param_ref -> %dol %literal					{% paramRef %}
subject -> 
	%someone 								{% takeFirst %}
	| %obj_val								{% takeFirst %}
	| %string_val							{% takeFirst %}
	| %number_val							{% takeFirst %}
	| %port_val								{% takeFirst %}
	| param_ref								{% takeFirst %}
type ->
	 %player								{% takeFirst %}
	| %port									{% takeFirst %}
	| %character							{% takeFirst %}
	| %attack								{% takeFirst %}
	| %string								{% takeFirst %}
	| %number 								{% takeFirst %}
target -> 
	%matches 								{% takeFirst %}
	| %frames								{% takeFirst %}

__ 			 -> %ws 						{% null %}
_  			 -> %ws:?						{% null %}