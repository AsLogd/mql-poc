
const Reset = "\x1b[0m"
const FgRed = "\x1b[31m"
const FgGreen = "\x1b[32m"
const FgYellow = "\x1b[33m"
const FgWhite = "\x1b[37m"

export default class Log {

	static info(msg: string) {
		console.info(FgWhite, msg, Reset)
	}

	static ok(msg: string) {
		console.info(FgGreen,msg,Reset)
	}

	static warn(msg: string) {
		console.info(FgYellow, msg, Reset)
	}

	static error(msg: string) {
		console.info(FgRed, msg, Reset)
	}

	static dump(obj: any) {
		console.info(obj)
	}

	static printAST(obj: any[]) {
		function printTarget(target: any) {
			console.log(`|--Target: ${target}`)
		}
		function printSignature(signature: any[]) {
			console.log(`|--Signature: `)
			signature.forEach((s) => {
				switch (s.type) {
					case "infix":
						console.log(`|----Param def: {name: ${s.lval}, type: ${s.rval}}`)
						break;
					case "literal":
						console.log(`|----Literal: ${s.value}`)
						break;
					default:
						console.log(`|----Unknown: ${s}`)
						break;
				}
			})
		}
		function printBody(body: any) {
			console.log(`|--Body:`)
			printExpression(body, 0)
		}
		function printFunctionParams(params: any[], level: number) {
			params.forEach((p) => {
				switch (p.type) {
					case "string":
						console.log(`|----${'-'.repeat(level)}String: ${p.value}`)
						break;
					case "literal":
						console.log(`|----${'-'.repeat(level)}Literal: ${p.value}`)
						break;
					case "number":
						console.log(`|----${'-'.repeat(level)}Number: ${p.value}`)
						break;
					case "ref":
						console.log(`|----${'-'.repeat(level)}Ref: ${p.name.value}`)
						break;
				}
			})
		}
		function printTerm(term: any, level: number) {
			if(Array.isArray(term)) {
				term.forEach((t) => {
					switch (t.type) {
						case "ref":
							console.log(`|----${'-'.repeat(level)}Ref: ${t.name.value}`)
							break;
						default:
							console.log(`|----${'-'.repeat(level)}${t.type}: ${t.value}`)
							break;
					}
				})
			} else {
				switch (term.type) {
					case "function":
						console.log(`|----${'-'.repeat(level)}Function call:`)
						console.log(`|-----${'-'.repeat(level)}Name:`, term.name.value)
						console.log(`|-----${'-'.repeat(level)}Params:`)
						printFunctionParams(term.params, level+2)
						break;
					
					default:
						console.log(`|----${'-'.repeat(level)}Expression:`)
						printExpression(term, level+2)
						break;
				}
			}
		}
		function printExpression(expr: any, level: number) {
			switch (expr.type) {
				case "infix":
					console.log(`|---${'-'.repeat(level)}Infix: ${expr.op}`)
					console.log(`|----${'-'.repeat(level)}Lval:`)
					printExpression(expr.lval, level+2)
					console.log(`|----${'-'.repeat(level)}Rval:`)
					printExpression(expr.rval, level+2)
					break;
				case "prefix":
					console.log(`|---${'-'.repeat(level)}Prefix: ${expr.op}`)
					console.log(`|----${'-'.repeat(level)}Rval:`)
					printExpression(expr.rval, level+2)
					break;
				default:
					console.log(`|---${'-'.repeat(level)}Term:`)
					printTerm(expr, level+1)
					break;
			}
		}
		function printStatement(obj: any) {
			console.info(`|-${obj.type}`)
			switch (obj.type) {
				case "query":
					printTarget(obj.target)
					printExpression(obj.expr, 0)
					break;
				
				case "definition":
					let {signature, body} = obj
					printSignature(signature)
					printBody(body)
					break;
				case "js":
					console.log("|--JS block:")
					console.log(obj.text)
					break;
				default:
					console.log("|--Unknown:")
					console.log(obj)
			}
		}
		console.info('\\')
		obj.forEach(printStatement)
	}
}