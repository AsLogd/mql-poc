@{%
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
	"if",
	"elseif",
	"else",
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
	arrow:		"->",
	co: 		":",
	eq: 		"=",
	dol: 		"$",
	plus: 		"+",
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
const query 		= ([target, _, con])	=> ({type: "query",target, content: con})
const succession 	= ([expr, succ])		=> ({type: "succession", temporals: [expr, ...succ]})
const temporal 		= ([_, then, before])	=> ({type: "temporal", then, before})
const specialTemporal = ([then, before])	=> ({type: "temporal", then, before})
const infix 		= ([lval, op, rval]) 	=> ({type: "infix", op, lval, rval})
const prefix 		= ([op, rval])		 	=> ({type: "prefix", op, rval})
const sentence 		= ([val])				=> ({type: "sentence", val})
const paramRef 		= ([_, name])			=> ({type: "ref", name})
const definition 	= ([_, __, s, ___, b])	=> ({type: "definition", signature: s, body: b})
const jsFunc 		= ([name, p, _, body])	=> ({type: "js_func", name, params: p, body: cleanBody(body)})
const func 			= ([name, _, params])	=> ({type: "function", name, params})
const dfa 			= ([a]) 				=> ({type: "dfa", rules: [a]})
const addRule		= ([dfa, _, rule]) 		=> ({type: "dfa", rules: [...dfa.rules, rule]})
const dfaRule 		= ([t, _, id, __, ife]) => ({type: "dfa_rule", isAccepting: !!t, id, if_expr: ife})
const ifExpr 		= ([_, cont, elifs, el])=> ({type: "if_expr", conditions: [cont, ...elifs], else: el})
const ifContent 	= ([_, expr, res]) 		=> ({type: "if_content", expression: expr, result: res})
%} 

@lexer lexer

start	-> _ statement:+					{% removeFirst %}
statement ->	
	  definition _ 							{% takeFirst %}
	| js_func _ 							{% takeFirst %}
	| query _ 								{% takeFirst %}

js_func -> js_header js_params _ js_body	{% jsFunc %}
js_header -> %js __ %func __ %literal		{% takeNth(4) %}
js_params -> %lp _ js_plist:? _ %rp			{% takeNth(2) %}
js_plist -> js_plist (%comma _) %literal	{% removeSecondAndCat %}
	| %literal								{% identity %}
js_body -> %block							{% takeFirst %}

definition -> 
	%define __ signature __ body 			{% definition %}
signature ->  
	signature __ param_def 					{% removeSecondAndCat %}
	| signature __ %literal					{% removeSecondAndCat %}
	| param_def								{% identity %}
	| %literal 								{% identity %}

param_def -> %literal %co type				{% infix %}

body -> %eq _ succession					{% removeTwo %}


query 	-> target where query_content		{% query %}

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
if_result -> __ %arrow _ %literal _ 		{% takeNth(3) %}

succession -> special_temporal temporal:* 	{% succession %}
temporal -> then expression before_expr:? 	{% temporal %}
special_temporal-> expression before_expr:? {% specialTemporal %}
before_expr -> before expression 			{% removeFirst %}

expression -> 
	  expression and term _					{% infix %}
	| expression or term _					{% infix %}
	| not expression _						{% prefix %}
	| term _								{% takeFirst %}
term ->
	sentence								{% sentence %}
	| function_call							{% takeFirst %}
	| %lp _ expression _ %rp				{% removeTwo %}

function_call ->
	%literal %lp param_values %rp			{% func %}

sentence ->
	sentence __ subject 					{% removeSecondAndCat %}
	| sentence __ %literal					{% removeSecondAndCat %}
	| subject								{% identity %}
	| %literal 								{% identity %}


param_values ->
	  param_values (%comma _) subject 		{% removeSecond %}
	| subject 								{% identity %}


not			 -> __ %not __					{% removeFirst %}
and			 -> __ %and __					{% removeFirst %}
or			 -> __ %or __					{% removeFirst %}
where		 -> __ %where __				{% removeFirst %}
then		 -> __ %then __					{% removeFirst %}
before		 -> __ %before __				{% removeFirst %}

param_ref -> %dol %literal					{% paramRef %}
subject		 -> 
	%someone 								{% takeFirst %}
	| %string								{% takeFirst %}
	| %number								{% takeFirst %}
	| %port									{% takeFirst %}
	| param_ref								{% takeFirst %}
type ->
	 %player								{% takeFirst %}
	| %character							{% takeFirst %}
	| %attack								{% takeFirst %}

target		 -> %matches					{% identity %}

__ 			 -> %ws 						{% null %}
_  			 -> %ws:?						{% null %}
