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
%} 

@lexer lexer

start	-> _ statement:+					{% removeFirst %}
statement ->	
	  definition _ 							{% takeFirst %}
	| js_func _ 							{% takeFirst %}
	| query _ 								{% takeFirst %}

js_func -> js_header js_params _ js_body	{% js_func %}
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


query 	-> target where succession			{% query %}

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
