"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nearley_1 = __importDefault(require("nearley"));
//the grammar module will be available after build step
//@ts-ignore
const grammar_1 = __importDefault(require("./grammar"));
const Failable_1 = require("./Failable");
exports.Failable = __importStar(require("./Failable"));
function executeParser(text) {
    const parser = new nearley_1.default.Parser(nearley_1.default.Grammar.fromCompiled(grammar_1.default));
    try {
        parser.feed(text);
    }
    catch (err) {
        return Failable_1.Failure({ reason: err });
    }
    if (parser.results.length < 1) {
        return Failable_1.Failure({ reason: "Invalid Chart file" });
    }
    else if (parser.results.length > 1) {
        console.warn("mql: Ambiguous input");
    }
    return Failable_1.Success(parser.results[0]);
}
class Parser {
    static parse(text) {
        const parseResult = executeParser(text);
        if (!parseResult.ok) {
            return parseResult;
        }
        return Failable_1.Success(parseResult.value);
    }
}
exports.default = Parser;
