import { Failable } from "./Failable";
export * as Failable from "./Failable";
export default class Parser {
    static parse(text: string): Failable<any, any>;
}
