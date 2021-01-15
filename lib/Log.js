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
            printSuccession(body, 0);
        }
        function printFunctionParams(params, level) {
            const ind = '-'.repeat(level);
            params.forEach((p) => {
                switch (p.type) {
                    case "string":
                        console.log(`|----${ind}String: ${p.value}`);
                        break;
                    case "literal":
                        console.log(`|----${ind}Literal: ${p.value}`);
                        break;
                    case "number":
                        console.log(`|----${ind}Number: ${p.value}`);
                        break;
                    case "ref":
                        console.log(`|----${ind}Ref: ${p.name.value}`);
                        break;
                }
            });
        }
        function printTerm(term, level) {
            const ind = '-'.repeat(level);
            if (Array.isArray(term)) {
                term.forEach((t) => {
                    switch (t.type) {
                        case "ref":
                            console.log(`|----${ind}Ref: ${t.name.value}`);
                            break;
                        default:
                            console.log(`|----${ind}${t.type}: ${t.value}`);
                            break;
                    }
                });
            }
            else {
                switch (term.type) {
                    case "function":
                        console.log(`|----${ind}Function call:`);
                        console.log(`|-----${ind}Name:`, term.name.value);
                        console.log(`|-----${ind}Params:`);
                        printFunctionParams(term.params, level + 2);
                        break;
                    default:
                        console.log(`|----${ind}Expression:`);
                        printExpression(term, level + 2);
                        break;
                }
            }
        }
        function printExpression(expr, level) {
            const ind = '-'.repeat(level);
            switch (expr.type) {
                case "infix":
                    console.log(`|---${ind}Infix: ${expr.op}`);
                    console.log(`|----${ind}Lval:`);
                    printExpression(expr.lval, level + 2);
                    console.log(`|----${ind}Rval:`);
                    printExpression(expr.rval, level + 2);
                    break;
                case "prefix":
                    console.log(`|---${ind}Prefix: ${expr.op}`);
                    console.log(`|----${ind}Rval:`);
                    printExpression(expr.rval, level + 2);
                    break;
                case "sentence":
                    console.log(`|---${ind}Sentence:`);
                    printTerm(expr.val, level + 2);
                    break;
                default:
                    console.log(`|---${ind}Term:`);
                    printTerm(expr, level + 1);
                    break;
            }
        }
        function printTemporal(temporal, level) {
            const ind = '-'.repeat(level);
            console.info(`|---${ind}${temporal.type}`);
            console.info(`|----${ind}Then:`);
            printExpression(temporal.then, level + 2);
            if (!temporal.before)
                return;
            console.info(`|----${ind}Before:`);
            printExpression(temporal.before, level + 2);
        }
        function printCondition(cond, level) {
            const ind = '-'.repeat(level);
            console.info(`|--${ind}if:`);
            printExpression(cond.expression, level + 1);
            console.info(`|--${ind}then go to: ${cond.result.text}`);
        }
        function printIfExpression(if_expr, level) {
            const ind = '-'.repeat(level);
            console.info(`|--${ind}if expr:`);
            for (const cond of if_expr.conditions) {
                printCondition(cond, level + 1);
            }
            if (if_expr.else) {
                console.info(`|--${ind}else go to: ${if_expr.else.text}`);
            }
        }
        function printDfaRule(rule, level) {
            const ind = '-'.repeat(level);
            console.info(`|--${ind}Id: ${rule.id}`);
            if (rule.isAccepting) {
                console.info(`|--${ind} Is Accepting`);
            }
            printIfExpression(rule.if_expr, level + 1);
        }
        function printDfa(dfa, level) {
            const ind = '-'.repeat(level);
            console.info(`|--${ind}${dfa.type}`);
            for (const t of dfa.rules) {
                printDfaRule(t, level + 1);
            }
        }
        function printSuccession(succ, level) {
            const ind = '-'.repeat(level);
            console.info(`|--${ind}${succ.type}`);
            printExpression(succ.expression, level + 1);
            for (const t of succ.temporals) {
                printTemporal(t, level);
            }
        }
        function printQueryContent(content) {
            switch (content.type) {
                case "succession": {
                    printSuccession(content, 0);
                    break;
                }
                case "dfa": {
                    printDfa(content, 0);
                    break;
                }
            }
        }
        function printStatement(obj) {
            console.info(`|-${obj.type}`);
            switch (obj.type) {
                case "query":
                    printTarget(obj.target);
                    printQueryContent(obj.content);
                    break;
                case "definition":
                    let { signature, body } = obj;
                    printSignature(signature);
                    printBody(body);
                    break;
                case "JS":
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
