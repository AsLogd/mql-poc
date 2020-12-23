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
const succession 	= ([expr, succ])		=> ([expr, ...succ])
const temporal 		= ([_, then, __, bfr])	=> ({type: "temporal", then, before: bfr})
const infix 		= ([lval, op, rval]) 	=> ({type: "infix", op, lval, rval})
const prefix 		= ([op, rval])		 	=> ({type: "prefix", op, rval})
const paramRef 		= ([_, name])			=> ({type: "ref", name})
const definition 	= ([_, __, s, ___, b])	=> ({type: "definition", signature: s, body: b})
const func 			= ([name, _, params])	=> ({type: "function", name, params})
const funcDef 		= ([_, __, head, body]) => ({type: "function_def", head, body})
const funcHeader 	= ([name, _, params]) 	=> ({type: "function_head", name, params}) 
%} 

@lexer lexer

start	-> _ statement:+					{% removeFirst %}
statement ->	
	  definition _ 							{% takeFirst %}
	| js_block _ 							{% takeFirst %}
	| query _ 								{% takeFirst %}

js_block -> %js 							{% takeFirst %}


definition -> 
	%define __ signature __ body 			{% definition %}
signature ->  
	signature __ param_def 					{% removeSecondAndCat %}
	| signature __ %literal					{% removeSecondAndCat %}
	| param_def __ %literal					{% removeSecond %}
	| %literal __ param_def 				{% removeSecond %}

param_def -> %literal %co type				{% infix %}

body -> %eq _ succession					{% removeTwo %}


query 	-> target where succession			{% query %}

succession -> expression:? temporal:* 		{% succession %}
temporal -> then expression before_expr:? 	{% temporal %}
before_expr -> before expression 			{% removeFirst %}

expression -> 
	  expression and term _					{% infix %}
	| expression or term _					{% infix %}
	| not expression _						{% prefix %}
	| term _								{% takeFirst %}
term ->
	sentence								{% takeFirst %}
	| function_call							{% takeFirst %}
	| %lp _ expression _ %rp				{% removeTwo %}

function_call ->
	%literal %lp param_values %rp			{% func %}

sentence ->
	sentence __ subject 					{% removeSecondAndCat %}
	| sentence __ %literal					{% removeSecondAndCat %}
	| subject __ %literal					{% removeSecond %}
	| %literal __ subject 					{% removeSecond %}


param_values ->
	  param_values (%comma _) subject 		{% removeSecond %}
	| subject 								{% takeFirst %}


not			 -> __ %not __					{% removeFirst %}
and			 -> __ %and __					{% removeFirst %}
or			 -> __ %or __					{% removeFirst %}
where		 -> __ %where __				{% removeFirst %}
then		 -> __ %then __					{% removeFirst %}
before		 -> __ %before __				{% removeFirst %}

param_ref -> %dol %literal					{% paramRef %}
subject		 -> 
	%someone 								{% takeFirst %}
	| %match 								{% takeFirst %}
	| %string								{% takeFirst %}
	| %number								{% takeFirst %}
	| param_ref								{% takeFirst %}
type ->
	  %match								{% takeFirst %}
	| %player								{% takeFirst %}
	| %character							{% takeFirst %}
	| %attack								{% takeFirst %}

target		 -> %matches					{% identity %}

__ 			 -> %ws 						{% null %}
_  			 -> %ws:?						{% null %}
