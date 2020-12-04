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
	"fn",
	// Subjects
	"someone",
	// Types
	"match",
	"player",
	"character",
	"attack"
]
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
const query 		= ([target, _, expr])	=> ({target, expr})
const infix 		= ([lval, op, rval]) 	=> ({op, lval, rval})
const prefix 		= ([operator, rval]) 	=> ({operator, rval})
const removeFirst   = ([_, a]) 				=> a
const removeTwo		= ([_, __, a]) 			=> a
const catWithRest 	= ([r, i])				=> [...(r||[]), i]
const removeSecond 	= ([a, _, b])			=> [a, b]
const removeSecondAndCat 	= ([a, _, b])	=> [...(a||[]), b]
const paramRef 		= ([_, name])			=> ({type: "ref", name})
const definition 	= ([_, __, sign, ___, body])	=> ({type: "definition", signature: sign, body})
const func 			= ([name, _, params])	=> ({type: "function", name, params})
const funcDef 		= ([_, __, head, body]) => ({type: "function_def", head, body})
const funcHeader 	= ([name, _, params]) 	=> ({type: "function_head", name, params}) 
%} 

@lexer lexer

start	-> _ statement:+					{% identity %}
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
param_ref -> %dol %literal					{% paramRef %}

body -> %eq _ expression					{% removeTwo %}


query 	-> target where expression			{% query %}
expression -> 
	  expression and term _					{% infix %}
	| expression or term _					{% infix %}
	| not expression _						{% prefix %}
	| term _								{% takeFirst %}
term ->
	sentence								{% identity %}
	| function_call							{% identity %}
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

target		 -> %matches

__ 			 -> %ws 						{% null %}
_  			 -> %ws:*						{% null %}
