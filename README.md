# MQL
Query your matches and find what you want.

## Usage

//TODO

## Installing

//TODO

## Examples
//TODO


## Running the tests

```
npm test
-or-
yarn test
```
The tests run in two stages:
 * First, the defined grammar and semantics are checked using the files found in the folders `tests/valid` (should be accepted by grammar an semantics) and `tests/invalid` (should error).
 * Then, the binary is tested by generating jsons using both modes (normal and raw) and checking the results against an expected output.

## Built With

* [Typescript](https://github.com/Microsoft/TypeScript)
* [Nearley](https://github.com/kach/nearley) - Parsing toolkit
* [Moo](https://github.com/no-context/moo) - Tokenizer/lexer

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/your/project/tags). 

## License

This project is licensed under the MIT License
