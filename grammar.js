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
  UNARY: 4,
  DEREFERENCE: 5,
  POSTFIX: 6,
  CALL: 7,
  DOT: 8
};

export default grammar({
  name: "delphi",

  // Skip whitespace and newlines everywhere
  extras: $ => [
    /\s/,
    $.comment,
  ],

  conflicts: $ => [
    [$._simple_name, $.generic_name],
    [$._inherited_call_expression, $.call_expression],
    [$.function_name, $.generic_name]
  ],

  // Tells tree-sitter that identifiers are the "word" token,
  // so keyword rules that match the same pattern take priority
  word: $ => $.identifier,

  supertypes: $ => [
    $.comment,
    $.statement,
    $.declaration_section,
    $.type,
    $.expression,
    $.literal,
    $.lvalue_expression,
    $.not_lvalue_expression,
    $.loop_statement,
    $.for_statement,
    $.try_statement,
    $.class_member
  ],

  inline: $ => [
    $.class_visibility,
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
      repeat($.declaration_section),
      repeat($.function_definition),
      field('body', $.block_statement),
      '.',
    ),

    library_file: $ => seq(
      $.kLibrary,
      field('name', $.identifier),
      ';',
      optional($.uses_clause),
      repeat($.declaration_section),
      field('body', $.block_statement),
      '.',
    ),

    unit_file: $ => seq(
      $.kUnit,
      field('name', $._name),
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
      repeat($.declaration_section)
    ),

    implementation_section: $ => seq(
      $.kImplementation,
      optional($.uses_clause),
      repeat(choice(
        $.declaration_section,
        $.function_definition
      )),
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
      commaSep1($.unit_reference),
      ';',
    ),

    declaration_section: $ => choice(
      $.var_declaration_section,
      $.const_declaration_section,
      $.type_declaration_section,
      $.resourcestring_declaration_section
    ),

    type_declaration_section: $ => seq(
      $.kType,
      repeat1(seq($.type_declaration, ';')),
    ),

    class_definition: $ => seq(
      $.kClass,
      optional(choice($.kAbstract, $.kSealed)),
      optional($.base_list),

      repeat($.class_member),
      repeat($.class_section),
      $.kEnd,
    ),

    base_list: $ => seq(
      '(',
      commaSep($._name),
      ')',
    ),

    class_section: $ => seq(
      field('visibility', $.class_visibility),
      repeat($.class_member),
    ),

    class_visibility: $ => choice(
      $.kPrivate,
      $.kProtected,
      $.kPublic,
      $.kPublished,
    ),

    class_member: $ => choice(
      $.class_field,
      $.class_method,
      $.class_property,
    ),

    class_field: $ => seq(
      optional($.kClass),
      commaSep1(field('name', $.identifier)),
      $._variable_type_declaration,
      optional(';')
    ),

    class_method: $ => seq(
      optional($.kClass),
      field('kind', choice(
        $.kProcedure,
        $.kFunction,
        $.kConstructor,
        $.kDestructor,
      )),
      field('name', $.identifier),
      optional($.type_parameter_list),
      optional(field('parameters', $.parameter_list)),
      optional(seq(':', field('return_type', $.type))),
      repeat(seq(';', $.method_directive)),
      optional(';'),
    ),

    class_property: $ => seq(
      $.kProperty,
      field('name', $.identifier),
      optional($._variable_type_declaration),
      optional(seq($.kRead, field('read', $._name))),
      optional(seq($.kWrite, field('write', $._name))),
      optional(';',)
    ),

    interface_definition: $ => seq(
      $.kInterface,
      optional($.base_list),
      optional($.guid_declaration),
      repeat($.interface_member),
      $.kEnd,
    ),

    guid_declaration: $ => seq(
      '[',
      $.string_literal,
      ']',
    ),

    interface_member: $ => choice(
      $.class_method,
      $.class_property,
    ),

    parameter_list: $ => seq(
      '(',
      sep($.parameter_declaration, ';'),
      ')',
    ),

    parameter_declaration: $ => seq(
      // TODO use alias for the modifier instead
      optional(field('modifier', choice($.kConst, $.kVar, $.kOut))),
      commaSep1($.argument_name),
      optional($._variable_type_declaration),
      optional(seq('=', field('default_value', $.expression))),
    ),

    argument_name: $ => $.identifier,

    method_directive: $ => choice(
      $.kVirtual,
      $.kAbstract,
      $.kOverride,
      $.kOverload,
      $.kStdcall,
      $.kCdecl,
      $.kRegister,
      $.kPascal,
      $.kSafecall,
      $.kInline,
      $.kReintroduce,
    ),

    resourcestring_declaration_section: $ => seq(
      $.kResourcestring,
      repeat1(seq($.resourcestring_declaration, ';'))
    ),

    resourcestring_declaration: $ => seq(
      field('name', $.identifier),
      '=',
      $.string_literal
    ),

    const_declaration_section: $ => seq(
      $.kConst,
      repeat1(seq($.const_declaration, ';')),
    ),

    const_declaration: $ => seq(
      field('name', $.identifier),
      optional(seq(':', field('type', $.type))),
      '=',
      field('value', $.expression),
    ),

    var_declaration_section: $ => seq(
      $.kVar,
      repeat1(seq(
        $.var_declaration, ';'
      )),
    ),

    var_declaration: $ => seq(
      commaSep1($.variable_declarator),
      $._variable_type_declaration
    ),

    type_declaration: $ => seq(
      field('name', $.identifier),
      optional($.type_parameter_list),
      '=',
      field('type', $._type_definition),
    ),

    _type_definition: $ => choice(
      $.type_alias_definition,
      $.class_definition,
      $.interface_definition,
      $.enum_definition,
    ),

    type_alias_definition: $ => seq(
      field('type', $.type),
    ),


    enum_definition: $ => seq(
      '(',
      sep($.enum_value, ','),
      ')',
    ),

    enum_value: $ => seq(
      field('name', $.identifier),
      optional(seq('=', field('value', $.expression))),
    ),

    type: $ => choice(
      $._name,
      $.array_type,
      $.pointer_type,
      $.class_of_type
    ),

    pointer_type: $ => seq('^', field('type', $.type)),

    array_type: $ => seq(
      $.kArray,
      $.kOf,
      $._name
    ),

    class_of_type: $ => seq(
      $.kClass,
      $.kOf,
      field('type', $._name)
    ),

    function_definition: $ => seq(
      optional($.kClass),
      field('kind', choice(
        $.kProcedure,
        $.kFunction,
        $.kConstructor,
        $.kDestructor
      )),
      field('name', $.function_name),
      optional($.type_parameter_list),
      optional($.parameter_list),
      optional(field('return_type', seq(':', $.type))),
      ';',
      repeat(choice($.var_declaration_section)),
      $.block_statement,
      ';'
    ),

    function_name: $ => seq(
      optional(field('qualifier', seq($._name, '.'))),
      field('name', $.identifier)
    ),

    statement: $ => choice(
      $.block_statement,
      $.assignment_statement,
      $.variable_declaration_statement,
      $.loop_statement,
      $.if_statement,
      $.case_statement,
      $.try_statement,
      $.break_statement,
      $.continue_statement,
      $.exit_statement,
      $.raise_statement,
      $.inherited_statement,
      $._call_statement
    ),

    raise_statement: $ => seq(
      $.kRaise,
      $.expression,
    ),

    inherited_statement: $ => $.kInherited,

    if_statement: $ => prec.right(seq(
      $.kIf,
      field('condition', $.expression),
      $.kThen,
      field('then', $.statement),
      optional(seq(
        $.kElse,
        field('else', $.statement),
      )),
    )),

    case_statement: $ => seq(
      $.kCase,
      field('value', $.expression),
      $.kOf,
      repeat1($.case_branch),
      optional(seq(
        $.kElse,
        field('else', $.statement),
        optional(';') // TODO: Check whether ; is really optional
      )),
      $.kEnd,
    ),

    case_branch: $ => seq(
      field('pattern', commaSep1($.case_pattern)),
      ':',
      field('body', $.statement),
      ';',
    ),

    case_pattern: $ => choice(
      $.expression,
      $.case_range,
    ),

    case_range: $ => seq(
      field('from', $.literal),
      '..',
      field('to', $.literal),
    ),

    assignment_statement: $ => seq(
      field('left', $.lvalue_expression),
      ':=',
      field('right', $.expression)
    ),

    variable_declaration_statement: $ => seq(
      $.kVar,
      choice(
        seq(
          $.variable_declarator,
          choice(
            seq($._variable_type_declaration, optional($._variable_initialization)),
            $._variable_initialization,
          )
        ),
        seq(
          commaSep1($.variable_declarator),
          $._variable_type_declaration
        )
      )
    ),

    _variable_type_declaration: $ => seq(":", field('type', $.type)),
    _variable_initialization: $ => seq(':=', field('initial_value', $.expression)),

    variable_declarator: $ =>
      field("name", $.identifier),

    _semicolon_statement: $ => seq(
      optional($.statement),
      ';'
    ),

    block_statement: $ => seq(
      $.kBegin,
      repeat($._semicolon_statement),
      optional($.statement),
      $.kEnd,
    ),

    loop_statement: $ => choice(
      $.for_statement,
      $.while_statement,
      $.repeat_statement
    ),

    for_statement: $ => choice(
      $.for_numeric_statement,
      $.for_each_statement,
    ),

    for_numeric_statement: $ => seq(
      $.kFor,
      field('variable', $._for_variable),
      ':=',
      field('initial_value', $.expression),
      field('direction', choice($.kTo, $.kDownto)),
      field('final_value', $.expression),
      $.kDo,
      field('body', $.statement),
    ),

    for_each_statement: $ => seq(
      $.kFor,
      field('variable', $._for_variable),
      $.kIn,
      field('collection', $.expression),
      $.kDo,
      field('body', $.statement),
    ),

    _for_variable: $ => choice(
      $.identifier,
      alias($.for_variable_declaration, $.variable_declaration)
    ),

    for_variable_declaration: $ => seq(
      $.kVar,
      $.variable_declarator,
      optional($._variable_type_declaration),
    ),

    while_statement: $ => seq(
      $.kWhile,
      field('condition', $.expression),
      $.kDo,
      field('body', $.statement),
    ),

    repeat_statement: $ => seq(
      $.kRepeat,
      repeat($._semicolon_statement),
      optional($.statement),   // last statement before 'until' needs no semicolon
      $.kUntil,
      field('condition', $.expression),
    ),

    try_statement: $ => choice(
      $.try_except_statement,
      $.try_finally_statement,
    ),

    try_except_statement: $ => seq(
      $.kTry,
      repeat($._semicolon_statement),
      optional($.statement),
      $.kExcept,
      choice(
        // typed handlers: on E: Exception do ...
        seq(
          repeat1($.exception_handler),
          optional(seq($.kElse, repeat($._semicolon_statement), optional($.statement))),
        ),
        // bare except: just statements
        seq(
          repeat($._semicolon_statement),
          optional($.statement),
        ),
      ),
      $.kEnd,
    ),

    exception_handler: $ => seq(
      $.kOn,
      optional(seq(field('variable', $.identifier), ':')),
      field('type', $._name),
      $.kDo,
      field('body', $.statement),
      ';',
    ),

    try_finally_statement: $ => seq(
      $.kTry,
      repeat($._semicolon_statement),
      optional($.statement),
      $.kFinally,
      repeat($._semicolon_statement),
      optional($.statement),
      $.kEnd,
    ),

    continue_statement: _ => token(prec(1, /continue/i)),

    break_statement: _ => token(prec(1, /break/i)),

    exit_statement: _ => token(prec(1, /exit/i)),

    expression: $ => choice(
      $.lvalue_expression,
      $.not_lvalue_expression
    ),

    // expression that can exist both as lvalue and rvalue
    lvalue_expression: $ => prec(1, choice(
      $.member_access_expression,
      $._simple_name,
      $.dereference_expression,
      $.element_access_expression
    )),

    // expression that can only exist as rvalue
    not_lvalue_expression: $ => choice(
      $.literal,
      $.unary_expression,
      $.binary_expression,
      $.address_of_expression,
      $.parenthesized_expression,
      $.array_constructor_expression,
      $.call_expression,
      alias($._inherited_call_expression, $.call_expression),
      $.anonymous_function_expression,
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

    unary_expression: $ => prec(PREC.UNARY, seq(
      field('operator', choice('-', $.kNot)),
      field('operand', $.expression),
    )),

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

    dereference_expression: $ => prec(PREC.DEREFERENCE, seq(
      field('operand', $.expression),
      '^'
    )),

    address_of_expression: $ => seq(
      '@',
      field('operand', $.expression),
    ),

    _inherited_call_expression: $ => prec(PREC.CALL, seq(
      $.kInherited,
      field('function', $.expression),
      optional($.argument_list)
    )),

    call_expression: $ => prec(PREC.CALL, seq(
      field('function', $.expression),
      $.argument_list,
    )),

    _parameterless_call_expression: $ => field('function', $.identifier),

    _call_statement: $ => choice(
      alias($._parameterless_call_expression, $.call_expression),
      $.member_access_expression,
      $.call_expression,
      alias($._inherited_call_expression, $.call_expression)
    ),

    argument_list: $ => seq(
      '(',
      commaSep($.expression),
      ')'
    ),

    parenthesized_expression: $ => seq(
      '(',
      $.expression,
      ')',
    ),

    array_constructor_expression: $ => seq(
      '[',
      sep($.expression, ','),
      ']',
    ),

    element_access_expression: $ => prec(PREC.POSTFIX, seq(
      field('expression', $.expression),
      field('subscript', seq(
        '[',
        commaSep1($.expression),
        ']'
      ))
    )),

    anonymous_function_expression: $ => seq(
      field('kind', choice(
        $.kFunction,
        $.kProcedure
      )),
      optional($.parameter_list),
      optional(field('type', $._variable_type_declaration)),
      repeat($.declaration_section),
      $.block_statement,
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

    _simple_name: $ => choice(
      $.identifier,
      $.generic_name
    ),

    generic_name: $ => seq($.identifier, $.type_argument_list),

    type_parameter_list: $ => seq(
      '<',
      sep1($.type_parameter, ';'),
      '>',
    ),

    type_parameter: $ => seq(
      commaSep1(field('name', $.identifier)),
      optional(seq(
        ':',
        $.type_constraints,
      )),
    ),

    type_constraints: $ => commaSep1($._type_constraint),

    _type_constraint: $ => choice(
      $.kClass,
      $.kRecord,
      $.kInterface,
      $.kConstructor,
      $.kUnmanaged,
      $._name,
    ),

    type_argument_list: $ => seq(
      '<',
      choice(
        repeat(','),
        commaSep($.type),
      ),
      '>',
    ),

    _name: $ => choice(
      $.qualified_name,
      $._simple_name,
    ),

    qualified_name: $ => prec(PREC.DOT, seq(
      field('qualifier', $._name),
      '.',
      field('name', $.identifier),
    )),

    member_access_expression: $ => prec(PREC.DOT, seq(
      field('expression', choice($.expression, $._name)),
      '.',
      field('name', $._simple_name),
    )),

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
    kConst: _ => token(prec(1, /const/i)),
    kResourcestring: _ => token(prec(1, /resourcestring/i)),
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
    kFor: _ => token(prec(1, /for/i)),
    kWhile: _ => token(prec(1, /while/i)),
    kTo: _ => token(prec(1, /to/i)),
    kDownto: _ => token(prec(1, /downto/i)),
    kDo: _ => token(prec(1, /do/i)),
    kRepeat: _ => token(prec(1, /repeat/i)),
    kUntil: _ => token(prec(1, /until/i)),
    kIf: _ => token(prec(1, /if/i)),
    kThen: _ => token(prec(1, /then/i)),
    kElse: _ => token(prec(1, /else/i)),
    kCase: _ => token(prec(1, /case/i)),
    kOf: _ => token(prec(1, /of/i)),
    kTry: _ => token(prec(1, /try/i)),
    kExcept: _ => token(prec(1, /except/i)),
    kFinally: _ => token(prec(1, /finally/i)),
    kOn: _ => token(prec(1, /on/i)),
    kClass: _ => token(prec(1, /class/i)),
    kRecord: _ => token(prec(1, /record/i)),
    kUnmanaged: _ => token(prec(1, /unmanaged/i)),
    kProcedure: _ => token(prec(1, /procedure/i)),
    kFunction: _ => token(prec(1, /function/i)),
    kConstructor: _ => token(prec(1, /constructor/i)),
    kDestructor: _ => token(prec(1, /destructor/i)),
    kPrivate: _ => token(prec(1, /private/i)),
    kProtected: _ => token(prec(1, /protected/i)),
    kPublic: _ => token(prec(1, /public/i)),
    kPublished: _ => token(prec(1, /published/i)),
    kProperty: _ => token(prec(1, /property/i)),
    kRead: _ => token(prec(1, /read/i)),
    kWrite: _ => token(prec(1, /write/i)),
    kVirtual: _ => token(prec(1, /virtual/i)),
    kAbstract: _ => token(prec(1, /abstract/i)),
    kSealed: _ => token(prec(1, /sealed/i)),
    kOverride: _ => token(prec(1, /override/i)),
    kOverload: _ => token(prec(1, /overload/i)),
    kReintroduce: _ => token(prec(1, /reintroduce/i)),
    kStdcall: _ => token(prec(1, /stdcall/i)),
    kCdecl: _ => token(prec(1, /cdecl/i)),
    kRegister: _ => token(prec(1, /register/i)),
    kPascal: _ => token(prec(1, /pascal/i)),
    kSafecall: _ => token(prec(1, /safecall/i)),
    kInline: _ => token(prec(1, /inline/i)),
    kOut: _ => token(prec(1, /out/i)),
    kArray: _ => token(prec(1, /array/i)),
    kInherited: _ => token(prec(1, /inherited/i)),
    kRaise: _ => token(prec(1, /raise/i))
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
 * Creates a rule to match zero or more of the rules separated by a comma
 *
 * @param {Rule} rule
 *
 * @returns {ChoiceRule}
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
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