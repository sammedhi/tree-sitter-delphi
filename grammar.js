/**
 * @file Delphi grammar for tree-sitter
 * @author Medhi SAM <sammedhi2@hotmail.fr>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  RELATIONAL: 1,
  ADDITIVE: 2,
  MULTIPLICATIVE: 3,
};

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
    $.type,
    $.expression,
    $.literal,
    $.lvalue_expression,
    $.not_lvalue_expression,
    $.type_declaration
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

    interface_section: $ => seq(
      $.kInterface,
      optional($.uses_clause),
      repeat($.type_declaration_section)
    ),

    implementation_section: $ => seq(
      $.kImplementation,
      optional($.uses_clause),
      repeat($.type_declaration_section)
    ),

    initialization_section: $ => seq(
      $.kInitialization,
      repeat($._semicolon_statement),
      optional($.statement)
    ),

    finalization_section: $ => seq(
      $.kFinalization,
      repeat($._semicolon_statement),
      optional($.statement)
    ),

    uses_clause: $ => seq(
      $.kUses,
      sep1($.unit_reference, ','),
      ';',
    ),

    type_declaration_section: $ => seq(
      $.kType,
      repeat1($.type_declaration),
    ),

    type_declaration: $ => choice(
      $.type_alias_declaration,
    ),

    type_alias_declaration: $ => seq(
      field('name', $.identifier),
      '=',
      field('type', $.type),
      ';',
    ),

    type: $ => choice(
      $._name,  // covers both simple and qualified aliases
    ),

    statement: $ => choice(
      $.block_statement,
      $.assignment_statement,
      $.variable_declaration_statement,
    ),

    assignment_statement: $ => seq(
      field('left', $.lvalue_expression),
      ':=',
      field('right', $.not_lvalue_expression)
    ),

    lvalue_expression: $ => choice(
      $.identifier,
      $.qualified_name,
    ),

    variable_declaration_statement: $ => seq(
      $.kVar,
      field('name', $.identifier),
      optional(seq(":", field('type', $.type))),
      optional(seq(':=', field('value', $.expression)))
    ),

    not_lvalue_expression: $ => choice(
      $.literal,
      $.binary_expression,
      $.parenthesized_expression
    ),

    _semicolon_statement: $ => seq(
      $.statement,
      ';',
    ),

    block_statement: $ => seq(
      $.kBegin,
      repeat($._semicolon_statement),
      optional($.statement),
      $.kEnd,
    ),

    expression: $ => choice(
      $.literal,
      $.binary_expression,
      $.parenthesized_expression
    ),

    //#region literals
    literal: $ => choice(
      $.integer_literal,
      $.float_literal,
      $.string_literal,
      $.char_literal,
      $.boolean_literal,
      $.nil_literal,
    ),

    binary_expression: $ => {
      /** @type {Array<[string|Rule, number]>} */
      const table = [
        ['*', PREC.MULTIPLICATIVE],
        ['/', PREC.MULTIPLICATIVE],
        [$.kDiv, PREC.MULTIPLICATIVE],
        [$.kMod, PREC.MULTIPLICATIVE],
        [$.kAnd, PREC.MULTIPLICATIVE],
        [$.kShl, PREC.MULTIPLICATIVE],
        [$.kShr, PREC.MULTIPLICATIVE],
        ['+', PREC.ADDITIVE],
        ['-', PREC.ADDITIVE],
        [$.kOr, PREC.ADDITIVE],
        [$.kXor, PREC.ADDITIVE],
        ['=', PREC.RELATIONAL],
        ['<>', PREC.RELATIONAL],
        ['<', PREC.RELATIONAL],
        ['>', PREC.RELATIONAL],
        ['<=', PREC.RELATIONAL],
        ['>=', PREC.RELATIONAL],
        [$.kIn, PREC.RELATIONAL],
        [$.kIs, PREC.RELATIONAL],
        [$.kAs, PREC.RELATIONAL],
      ];

      return choice(...table.map(([operator, precedence]) =>
        prec.left(precedence, seq(
          field('left', $.expression),
          field('operator', operator),
          field('right', $.expression),
        ))
      ));
    },

    parenthesized_expression: $ => seq(
      '(',
      $.expression,
      ')',
    ),


    integer_literal: _ => token(choice(
      /[0-9]+/,           // decimal
      /\$[0-9a-fA-F]+/,  // hex
      /%[01]+/,           // binary
    )),

    float_literal: _ => token(choice(
      /[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?/,  // 3.14, 1.5e10
      /[0-9]+[eE][+-]?[0-9]+/,             // 1e10
    )),

    string_literal: _ => token(seq(
      '\'',
      repeat(choice(
        /[^']/,
        '\'\'',
      )),
      '\'',
    )),

    char_literal: _ => token(choice(
      /#[0-9]+/,
      /#\$[0-9a-fA-F]+/,
    )),

    boolean_literal: _ => token(prec(1, /true|false/i)),

    nil_literal: _ => token(prec(1, /nil/i)),
    //#endregion

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
    kBegin: _ => token(prec(1, /begin/i)),
    kEnd: _ => token(prec(1, /end/i)),
    kProgram: _ => token(prec(1, /program/i)),
    kLibrary: _ => token(prec(1, /library/i)),
    kUnit: _ => token(prec(1, /unit/i)),
    kInterface: _ => token(prec(1, /interface/i)),
    kImplementation: _ => token(prec(1, /implementation/i)),
    kInitialization: _ => token(prec(1, /initialization/i)),
    kFinalization: _ => token(prec(1, /finalization/i)),
    kUses: _ => token(prec(1, /uses/i)),
    kType: _ => token(prec(1, /type/i)),
    kVar: _ => token(prec(1, /var/i)),
    kNot: _ => token(prec(1, /not/i)),
    kAnd: _ => token(prec(1, /and/i)),
    kOr: _ => token(prec(1, /or/i)),
    kXor: _ => token(prec(1, /xor/i)),
    kDiv: _ => token(prec(1, /div/i)),
    kMod: _ => token(prec(1, /mod/i)),
    kShl: _ => token(prec(1, /shl/i)),
    kShr: _ => token(prec(1, /shr/i)),
    kIn: _ => token(prec(1, /in/i)),
    kIs: _ => token(prec(1, /is/i)),
    kAs: _ => token(prec(1, /as/i)),
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