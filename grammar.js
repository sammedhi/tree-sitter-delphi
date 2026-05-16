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
    $.comment,
  ],

  // Tells tree-sitter that identifiers are the "word" token,
  // so keyword rules that match the same pattern take priority
  word: $ => $.identifier,

  supertypes: $ => [
    $.comment,
    $.statement,
  ],

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
      optional($.uses_clause),
      field('body', $.block_statement),
      '.',
    ),

    library_file: $ => seq(
      $.kLibrary,
      field('name', $.identifier),
      ';',
      optional($.uses_clause),
      field('body', $.block_statement),
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
      optional($.uses_clause),
    ),

    // Stub — will hold declarations later
    implementation_section: $ => seq(
      $.kImplementation,
      optional($.uses_clause),
    ),

    // Stub — will hold statements later
    initialization_section: $ => seq(
      $.kInitialization,
    ),

    // Stub — will hold statements later
    finalization_section: $ => seq(
      $.kFinalization,
    ),

    statement: $ => choice(
      $.block_statement
    ),

    block_statement: $ => seq(
      $.kBegin,
      repeat(seq($.statement, ';')),
      optional($.statement),
      $.kEnd,
    ),


    // uses clause
    uses_clause: $ => seq(
      $.kUses,
      sep1($.unit_reference, ','),
      ';',
    ),

    unit_reference: $ => field('name', $._name),

    // qualified name, following C# grammar structure
    _name: $ => choice(
      $.qualified_name,
      $.identifier,
    ),

    qualified_name: $ => seq(
      field('qualifier', $._name),
      '.',
      field('name', $.identifier),
    ),

    comment: $ => choice(
      $.line_comment,
      $.doc_comment,
      $.brace_comment,
      $.block_comment,
    ),

    doc_comment: _ => token(prec(1, seq('///', /.*/))),
    line_comment: _ => token(seq('//', /.*/)),
    brace_comment: _ => token(seq('{', /[^}]*/, '}')),
    block_comment: _ => token(seq('(*', /[^*]*\*+([^*)][^*]*\*+)*/, ')')),

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
    kUses: _ => /uses/i,
  },
});

/**
 * Creates a rule to optionally match one or more of the rules separated by `separator`
 *
 * @param {RuleOrLiteral} rule
 *
 * @param {RuleOrLiteral} separator
 *
 * @returns {ChoiceRule}
 */
function sep(rule, separator) {
  return optional(sep1(rule, separator));
}


/**
 * Creates a rule to match one or more of the rules separated by `separator`
 *
 * @param {RuleOrLiteral} rule
 *
 * @param {RuleOrLiteral} separator
 *
 * @returns {SeqRule}
 */
function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}

/**
 * Creates a rule to match one or more of the rules separated by a comma
 *
 * @param {Rule} rule
 *
 * @returns {SeqRule}
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}