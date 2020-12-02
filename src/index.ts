import Nearley from "nearley"
//the grammar module will be available after build step
//@ts-ignore
import grammar from "./grammar"

const parser = new Nearley.Parser(
	Nearley.Grammar.fromCompiled(grammar)
)