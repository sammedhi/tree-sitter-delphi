/**
 * @file Delphi grammar for tree-sitter
 * @author Medhi SAM <sammedhi2@hotmail.fr>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default grammar({
  name: "delphi",

  // Skip whitespace and newlines everywhere
  extras: $ => [
    /\s/,
  ],

  // Tells tree-sitter that identifiers are the "word" token,
  // so keyword rules that match the same pattern take priority
  word: $ => $.identifier,

  // Case-insensitive keywords are handled via extras/externals later
  rules: {
    // TODO: add support for package files (.dpk)
    // TODO: add support for include files (.inc)
    source_file: $ => choice(
      $.program_file,
      $.library_file,
      $.unit_file,
    ),

    program_file: $ => seq(
      $.kProgram,
      field('name', $.identifier),
      ';',
      field('body', $.program_block),
      '.',
    ),

    library_file: $ => seq(
      $.kLibrary,
      field('name', $.identifier),
      ';',
      field('body', $.program_block),
      '.',
    ),

    unit_file: $ => seq(
      $.kUnit,
      field('name', $.identifier),
      ';',
      field('interface', $.interface_section),
      field('implementation', $.implementation_section),
      optional(field('initialization', $.initialization_section)),
      optional(field('finalization', $.finalization_section)),
      $.kEnd,
      '.',
    ),

    // Stub — will hold declarations later
    interface_section: $ => seq(
      $.kInterface,
    ),

    // Stub — will hold declarations later
    implementation_section: $ => seq(
      $.kImplementation,
    ),

    // Stub — will hold statements later
    initialization_section: $ => seq(
      $.kInitialization,
    ),

    // Stub — will hold statements later
    finalization_section: $ => seq(
      $.kFinalization,
    ),

    // Stub — will hold statements later
    program_block: $ => seq(
      $.kBegin,
      $.kEnd,
    ),

    identifier: _ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    // Keywords — case insensitive
    kBegin: _ => /begin/i,
    kEnd: _ => /end/i,
    kProgram: _ => /program/i,
    kLibrary: _ => /library/i,
    kUnit: _ => /unit/i,
    kInterface: _ => /interface/i,
    kImplementation: _ => /implementation/i,
    kInitialization: _ => /initialization/i,
    kFinalization: _ => /finalization/i,
  },
});
