@{%
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
%} 

@lexer lexer

query 		 -> target where expression		{% query %}
expression -> 
	  expression and comparison				{% infix %}
	| expression or comparison				{% infix %}
	| not expression						{% prefix %}
	| comparison							{% identity %}
comparison	 -> 
	  subject is value						{% infix %}
	| %lp expression %rp					{% removeFirst %}

not			 -> __ %not						{% removeFirst %}
and			 -> __ %and __					{% removeFirst %}
or			 -> __ %or __					{% removeFirst %}
where		 -> __ %where __				{% removeFirst %}
is			 -> __ %is __					{% removeFirst %}

subject		 -> 
	%someone 								{% identity %}
	| %match 								{% identity %}
	| %string								{% identity %}
target		 -> %matches

__ 			 -> %ws 						{% null %}
_  			 -> %ws:?						{% null %}