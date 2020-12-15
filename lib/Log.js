"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Reset = "\x1b[0m";
const FgRed = "\x1b[31m";
const FgGreen = "\x1b[32m";
const FgYellow = "\x1b[33m";
const FgWhite = "\x1b[37m";
class Log {
    static info(msg) {
        console.info(FgWhite, msg, Reset);
    }
    static ok(msg) {
        console.info(FgGreen, msg, Reset);
    }
    static warn(msg) {
        console.info(FgYellow, msg, Reset);
    }
    static error(msg) {
        console.info(FgRed, msg, Reset);
    }
    static dump(obj) {
        console.info(obj);
    }
    static printAST(obj) {
        function printTarget(target) {
            console.log(`|--Target: ${target}`);
        }
        function printSignature(signature) {
            console.log(`|--Signature: `);
            signature.forEach((s) => {
                switch (s.type) {
                    case "infix":
                        console.log(`|----Param def: {name: ${s.lval}, type: ${s.rval}}`);
                        break;
                    case "literal":
                        console.log(`|----Literal: ${s.value}`);
                        break;
                    default:
                        console.log(`|----Unknown: ${s}`);
                        break;
                }
            });
        }
        function printBody(body) {
            console.log(`|--Body:`);
            printExpression(body, 0);
        }
        function printFunctionParams(params, level) {
            params.forEach((p) => {
                switch (p.type) {
                    case "string":
                        console.log(`|----${'-'.repeat(level)}String: ${p.value}`);
                        break;
                    case "literal":
                        console.log(`|----${'-'.repeat(level)}Literal: ${p.value}`);
                        break;
                    case "number":
                        console.log(`|----${'-'.repeat(level)}Number: ${p.value}`);
                        break;
                    case "ref":
                        console.log(`|----${'-'.repeat(level)}Ref: ${p.name.value}`);
                        break;
                }
            });
        }
        function printTerm(term, level) {
            if (Array.isArray(term)) {
                term.forEach((t) => {
                    switch (t.type) {
                        case "ref":
                            console.log(`|----${'-'.repeat(level)}Ref: ${t.name.value}`);
                            break;
                        default:
                            console.log(`|----${'-'.repeat(level)}${t.type}: ${t.value}`);
                            break;
                    }
                });
            }
            else {
                switch (term.type) {
                    case "function":
                        console.log(`|----${'-'.repeat(level)}Function call:`);
                        console.log(`|-----${'-'.repeat(level)}Name:`, term.name.value);
                        console.log(`|-----${'-'.repeat(level)}Params:`);
                        printFunctionParams(term.params, level + 2);
                        break;
                    default:
                        console.log(`|----${'-'.repeat(level)}Expression:`);
                        printExpression(term, level + 2);
                        break;
                }
            }
        }
        function printExpression(expr, level) {
            switch (expr.type) {
                case "infix":
                    console.log(`|---${'-'.repeat(level)}Infix: ${expr.op}`);
                    console.log(`|----${'-'.repeat(level)}Lval:`);
                    printExpression(expr.lval, level + 2);
                    console.log(`|----${'-'.repeat(level)}Rval:`);
                    printExpression(expr.rval, level + 2);
                    break;
                case "prefix":
                    console.log(`|---${'-'.repeat(level)}Prefix: ${expr.op}`);
                    console.log(`|----${'-'.repeat(level)}Rval:`);
                    printExpression(expr.rval, level + 2);
                    break;
                default:
                    console.log(`|---${'-'.repeat(level)}Term:`);
                    printTerm(expr, level + 1);
                    break;
            }
        }
        function printStatement(obj) {
            console.info(`|-${obj.type}`);
            switch (obj.type) {
                case "query":
                    printTarget(obj.target);
                    printExpression(obj.expr, 0);
                    break;
                case "definition":
                    let { signature, body } = obj;
                    printSignature(signature);
                    printBody(body);
                    break;
                case "js":
                    console.log("|--JS block:");
                    console.log(obj.text);
                    break;
                default:
                    console.log("|--Unknown:");
                    console.log(obj);
            }
        }
        console.info('\\');
        obj.forEach(printStatement);
    }
}
exports.default = Log;
