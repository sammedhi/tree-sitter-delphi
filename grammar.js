/**
 * @file Delphi grammar for tree-sitter
 * @author Medhi SAM <sammedhi2@hotmail.fr>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default grammar({
  name: "delphi",

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => "hello"
  }
});
