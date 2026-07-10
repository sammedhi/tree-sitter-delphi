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
    [$.function_name, $.generic_name],

    [$.type_declaration_section],
    [$.var_declaration_section],
    [$.const_declaration_section],
    [$.resourcestring_declaration_section],

    [$.parenthesized_expression, $.const_array_constructor_expression],
    [$.class_method],
    [$.function_definition, $.external_function_definition, $._declaration],
    [$.class_definition, $.forward_class_definition],
    [$.class_definition, $.fieldless_class_definition],
    [$.function_declaration],
    [$.class_property],
    [$.type, $.object_of_type],
    [$.forward_interface_definition, $.interface_definition]
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
      $.unit_file,
    ),

    program_file: $ => seq(
      $.file_header,
      optional($.uses_clause),
      ...declarations($),
      field('body', $.block_statement),
      '.',
    ),

    unit_file: $ => seq(
      $.file_header,
      field('interface', $.interface_section),
      field('implementation', $.implementation_section),
      optional(field('initialization', $.initialization_section)),
      optional(field('finalization', $.finalization_section)),
      $.kEnd,
      '.',
    ),

    file_header: $ => seq(
      field('file_type', choice($.kUnit, $.kProgram, $.kLibrary)),
      field('name', $._name),
      optional(seq($.kDeprecated, field('message', $.compound_string_literal))),
      ';'
    ),

    interface_section: $ => seq(
      $.kInterface,
      optional($.uses_clause),
      ...declarations($)
    ),

    implementation_section: $ => seq(
      $.kImplementation,
      optional($.uses_clause),
      ...declarations($),
    ),

    initialization_section: $ => seq(
      $.kInitialization,
      ...statements($)
    ),

    finalization_section: $ => seq(
      $.kFinalization,
      ...statements($)
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

    _declaration: $ => choice($.function_definition, $.external_function_definition, $.declaration_section, $.function_declaration),
    _semicolon_declaration: $ => seq(optional($._declaration), ';'),

    type_declaration_section: $ => seq(
      $.kType,
      sep1($.type_declaration, ';'),
    ),

    attribute_list: $ => seq(
      '[',
      sep1($.attribute, ','),
      ']',
    ),

    attribute: $ => seq(
      field('name', $._name),
      optional($.argument_list),
    ),

    _attributes: $ => repeat1($.attribute_list),

    helper_definition: $ => seq(
      choice($.kClass, $.kRecord),
      $.kHelper,
      optional($.base_list),
      $.kFor,
      $._name,
      ...class_members($),
      repeat($.class_section),
      $.kEnd
    ),

    class_definition: $ => seq(
      $.kClass,
      optional(choice($.kAbstract, $.kSealed)),
      optional($.base_list),

      ...class_members($),
      repeat($.class_section),
      $.kEnd,
      optional($.hint_directive)
    ),

    fieldless_class_definition: $ => seq(
      $.kClass,
      optional(choice($.kAbstract, $.kSealed)),
      $.base_list,
      optional($.hint_directive)
    ),

    forward_class_definition: $ => $.kClass,
    forward_interface_definition: $ => $.kInterface,

    record_definition: $ => seq(
      optional($.kPacked),
      $.kRecord,
      ...class_members($),
      repeat($.class_section),
      $.kEnd,
      optional($.hint_directive)
    ),

    base_list: $ => seq(
      '(',
      commaSep($._name),
      ')',
    ),

    class_section: $ => seq(
      optional($.kStrict),
      field('visibility', $.class_visibility),
      ...class_members($),
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
      $.declaration_section
    ),

    _semicolon_class_member: $ => seq(optional($.class_member), ';'),

    class_field: $ => seq(
      optional($._attributes),
      optional($.kClass),
      commaSep1(field('name', $.identifier)),
      $._variable_type_declaration,
    ),

    class_method: $ => seq(
      optional($._attributes),
      optional($.kClass),
      field('kind', choice(
        $.kProcedure,
        $.kFunction,
        $.kConstructor,
        $.kDestructor,
        $.kOperator
      )),
      field('name', $.identifier),
      optional($.type_parameter_list),
      optional(field('parameters', $.parameter_list)),
      optional(seq(':', field('return_type', $.type))),
      repeat(seq(optional(';'), $.method_directive)),
    ),

    class_property: $ => seq(
      optional($._attributes),
      optional($.kClass),
      $.kProperty,
      field('name', $.identifier),
      optional($.array_parameter_list),
      optional($._variable_type_declaration),
      optional(seq($.kIndex, field('index', $.expression))),
      optional(seq($.kRead, field('read', $._name))),
      optional(seq($.kWrite, field('write', $._name))),
      optional(seq(';', $.kDefault))
    ),

    interface_definition: $ => seq(
      $.kInterface,
      optional($.base_list),
      optional($.guid_declaration),
      ...class_members($),
      $.kEnd,
      optional($.hint_directive),
    ),

    guid_declaration: $ => seq(
      '[',
      $.compound_string_literal,
      ']',
    ),

    parameter_list: $ => seq(
      '(',
      sep($.parameter_declaration, ';'),
      ')',
    ),

    array_parameter_list: $ => seq(
      '[',
      sep($.parameter_declaration, ';'),
      ']'
    ),

    parameter_declaration: $ => seq(
      // TODO use alias for the modifier instead
      optional(field('modifier', choice($.kConst, $.kVar, $.kOut))),
      commaSep1($.argument_name),
      optional($._variable_type_declaration),
      optional(seq('=', field('default_value', $.expression))),
    ),

    argument_name: $ => $.identifier,

    _method_directive: $ => seq(';', $.method_directive),
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
      $.kStatic,
      $.hint_directive
    ),

    hint_directive: $ => seq(
      field('kind', choice($.kDeprecated, $.kPlatform, $.kLibrary)),
      optional(field('message', $.compound_string_literal))
    ),

    resourcestring_declaration_section: $ => seq(
      $.kResourcestring,
      sep1($.resourcestring_declaration, ';')
    ),

    resourcestring_declaration: $ => seq(
      field('name', $.identifier),
      '=',
      $.expression
    ),

    const_declaration_section: $ => seq(
      $.kConst,
      sep1($.const_declaration, ';'),
    ),

    const_declaration: $ => seq(
      field('name', $.identifier),
      optional(seq(':', field('type', $.type))),
      '=',
      field('value', $.expression),
      optional($.hint_directive),
    ),

    var_declaration_section: $ => seq(
      optional($.kClass),
      choice($.kVar, $.kThreadVar),
      sep1($.var_declaration, ';'),
    ),

    var_declaration: $ => seq(
      commaSep1($.variable_declarator),
      $._variable_type_declaration
    ),

    type_declaration: $ => seq(
      optional($._attributes),
      field('name', $.identifier),
      optional($.type_parameter_list),
      '=',
      field('type', $._type_definition),
    ),

    _type_definition: $ => choice(
      $.type_alias_definition,
      $.strong_type_alias_definition,
      $.helper_definition,
      $.class_definition,
      $.fieldless_class_definition,
      $.forward_class_definition,
      $.forward_interface_definition,
      $.interface_definition,
      $.record_definition,
      $.enum_definition,
    ),

    type_alias_definition: $ => seq(
      field('type', $.type),
      optional($.hint_directive)
    ),

    strong_type_alias_definition: $ => seq(
      $.kType,
      field('type', $.type),
      optional($.hint_directive)
    ),

    enum_definition: $ => seq(
      '(',
      sep($.enum_value, ','),
      ')',
      optional($.hint_directive)
    ),

    enum_value: $ => seq(
      field('name', $.identifier),
      optional(seq('=', field('value', $.expression))),
    ),

    type: $ => choice(
      $._name,
      $.array_type,
      $.pointer_type,
      $.class_of_type,
      $.reference_to_type,
      $.object_of_type,
      $.function_type,
      $.set_of_type
    ),

    pointer_type: $ => seq('^', field('type', $.type)),

    array_type: $ => seq(
      optional($.kPacked),
      $.kArray,
      optional($.index_range),
      $.kOf,
      $.type
    ),

    index_range: $ => seq(
      '[',
      commaSep1(choice(
        $._name,
        $.set_range
      )),
      ']'
    ),

    set_range: $ => seq(
      field('intial', $.expression),
      '..',
      field('final', $.expression),
    ),

    set_of_type: $ => seq(
      optional($.kPacked),
      $.kSet,
      $.kOf,
      field('type', $.type)
    ),

    class_of_type: $ => seq(
      $.kClass,
      $.kOf,
      field('type', $._name)
    ),

    reference_to_type: $ => seq(
      $.kReference,
      $.kTo,
      field('kind', choice(
        $.kFunction,
        $.kProcedure
      )),
      optional($.parameter_list),
      optional($._variable_type_declaration)
    ),

    object_of_type: $ => seq(
      $.function_type,
      $.kOf,
      $.kObject
    ),

    function_type: $ => seq(
      field('kind', choice($.kFunction, $.kProcedure)),
      $.parameter_list,
      optional($._variable_type_declaration)
    ),

    function_declaration: $ => seq(
      optional($._attributes),
      optional($.kClass),
      field('kind', choice(
        $.kProcedure,
        $.kFunction,
        $.kConstructor,
        $.kDestructor,
        $.kOperator
      )),
      field('name', $.function_name),
      optional($.type_parameter_list),
      optional($.parameter_list),
      optional(field('return_type', seq(':', $.type))),
      repeat($._method_directive),
    ),

    function_definition: $ => seq(
      $.function_declaration,
      ';',
      ...declarations($),
      field('body', $.block_statement),
    ),

    external_function_definition: $ => seq(
      $.function_declaration,
      ';', $.kExternal,
      optional(field('source', $.expression)),
      optional(seq($.kName, field('original_name', $.expression)))
    ),

    function_name: $ => seq(
      optional(field('qualifier', seq($._name, '.'))),
      field('name', $.identifier)
    ),

    with_statement: $ => seq(
      $.kWith,
      $.expression,
      $.kDo,
      optional($.statement)
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
      $._call_statement,
      $.with_statement,
    ),

    raise_statement: $ => seq(
      $.kRaise,
      optional($.expression),
    ),

    inherited_statement: $ => $.kInherited,

    if_statement: $ => prec.right(seq(
      $.kIf,
      field('condition', $.expression),
      $.kThen,
      field('then', optional($.statement)),
      optional(seq(
        $.kElse,
        optional(field('else', $.statement)),
      )),
    )),

    case_statement: $ => seq(
      $.kCase,
      field('value', $.expression),
      $.kOf,
      repeat1($.case_branch),
      optional(seq(
        $.kElse,
        field('else', optional($.statement)),
        optional(';') // TODO: Check whether ; is really optional
      )),
      $.kEnd,
    ),

    case_branch: $ => seq(
      field('pattern', commaSep1($.case_pattern)),
      ':',
      field('body', optional($.statement)),
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
      ...statements($),
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
      field('body', optional($.statement)),
    ),

    for_each_statement: $ => seq(
      $.kFor,
      field('variable', $._for_variable),
      $.kIn,
      field('collection', $.expression),
      $.kDo,
      field('body', optional($.statement)),
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
      field('body', optional($.statement)),
    ),

    repeat_statement: $ => seq(
      $.kRepeat,
      ...statements($),  // last statement before 'until' needs no semicolon
      $.kUntil,
      field('condition', $.expression),
    ),

    try_statement: $ => choice(
      $.try_except_statement,
      $.try_finally_statement,
    ),

    try_except_statement: $ => seq(
      $.kTry,
      ...statements($),
      $.kExcept,
      choice(
        // typed handlers: on E: Exception do ...
        seq(
          repeat1($.exception_handler),
          optional(seq($.kElse, ...statements($))),
        ),
        // bare except: just statements
        seq(
          ...statements($)
        ),
      ),
      $.kEnd,
    ),

    exception_handler: $ => seq(
      $.kOn,
      optional(seq(field('variable', $.identifier), ':')),
      field('type', $._name),
      $.kDo,
      field('body', optional($.statement)),
      ';',
    ),

    try_finally_statement: $ => seq(
      $.kTry,
      ...statements($),
      $.kFinally,
      ...statements($),
      $.kEnd,
    ),

    continue_statement: _ => token(prec(1, /continue/i)),

    break_statement: _ => token(prec(1, /break/i)),

    exit_statement: $ => seq(
      $.kExit,
      optional($.argument_list)
    ),

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
      $.const_array_constructor_expression,
      $.call_expression,
      alias($._inherited_call_expression, $.call_expression),
      $.anonymous_function_expression,
      $.index_range
    ),

    //#region literals
    literal: $ => choice(
      $.integer_literal,
      $.float_literal,
      $.compound_string_literal,
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

    labeled_value: $ => seq(
      field('label', $.identifier),
      ':',
      field('value', $.expression)
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

    _call_statement: $ => choice(
      alias($._simple_name, $.call_expression),
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

    const_array_constructor_expression: $ => seq(
      '(',
      choice(
        sep($.expression, ','),
        sep1($.labeled_value, ';')
      ),
      ')'
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
      ...declarations($),
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

    compound_string_literal: $ => repeat1(choice(
      $.string_literal,
      $.char_literal,
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

    type_argument_list: $ => seq(
      '<',
      choice(
        commaSep(choice($._name, $.array_type)),
      ),
      '>',
    ),

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

    identifier: _ => /&?[a-zA-Z_][a-zA-Z0-9_]*/,

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
    kThreadVar: _ => token(prec(1, /threadvar/i)),
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
    kWith: _ => token(prec(1, /with/i)),
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
    kPacked: _ => token(prec(1, /packed/i)),
    kHelper: _ => token(prec(1, /helper/i)),
    kClass: _ => token(prec(1, /class/i)),
    kRecord: _ => token(prec(1, /record/i)),
    kUnmanaged: _ => token(prec(1, /unmanaged/i)),
    kProcedure: _ => token(prec(1, /procedure/i)),
    kFunction: _ => token(prec(1, /function/i)),
    kConstructor: _ => token(prec(1, /constructor/i)),
    kDestructor: _ => token(prec(1, /destructor/i)),
    kOperator: _ => token(prec(1, /operator/i)),
    kPrivate: _ => token(prec(1, /private/i)),
    kProtected: _ => token(prec(1, /protected/i)),
    kPublic: _ => token(prec(1, /public/i)),
    kPublished: _ => token(prec(1, /published/i)),
    kProperty: _ => token(prec(1, /property/i)),
    kIndex: _ => token(prec(1, /index/i)),
    kRead: _ => token(prec(1, /read/i)),
    kWrite: _ => token(prec(1, /write/i)),
    kStore: _ => token(prec(1, /stored/i)),
    kDefault: _ => token(prec(1, /default/i)),
    kVirtual: _ => token(prec(1, /virtual/i)),
    kAbstract: _ => token(prec(1, /abstract/i)),
    kSealed: _ => token(prec(1, /sealed/i)),
    kOverride: _ => token(prec(1, /override/i)),
    kOverload: _ => token(prec(1, /overload/i)),
    kReintroduce: _ => token(prec(1, /reintroduce/i)),
    kStatic: _ => token(prec(1, /static/i)),
    kStdcall: _ => token(prec(1, /stdcall/i)),
    kExternal: _ => token(prec(1, /external/i)),
    kName: _ => token(prec(1, /name/i)),
    kCdecl: _ => token(prec(1, /cdecl/i)),
    kRegister: _ => token(prec(1, /register/i)),
    kPascal: _ => token(prec(1, /pascal/i)),
    kSafecall: _ => token(prec(1, /safecall/i)),
    kInline: _ => token(prec(1, /inline/i)),
    kDeprecated: _ => token(prec(1, /deprecated/i)),
    kPlatform: _ => token(prec(1, /platform/i)),
    kOut: _ => token(prec(1, /out/i)),
    kArray: _ => token(prec(1, /array/i)),
    kSet: _ => token(prec(1, /set/i)),
    kInherited: _ => token(prec(1, /inherited/i)),
    kRaise: _ => token(prec(1, /raise/i)),
    kExit: _ => token(prec(1, /exit/i)),
    kReference: _ => token(prec(1, /reference/i)),
    kObject: _ => token(prec(1, /object/i)),
    kStrict: _ => token(prec(1, /strict/i))
  },
});

/**
 * Creates a rule to optionally match one or more of the rules separated by `separator`
 *
 * @param {GrammarSymbols<string>} $
 *
 * @returns {Array<Rule>}
 */
function statements($) {
  return [repeat($._semicolon_statement), optional($.statement)]
}

/**
 * Creates a rule to optionally match one or more of the rules separated by `separator`
 *
 * @param {GrammarSymbols<string>} $
 *
 * @returns {Array<Rule>}
 */
function declarations($) {
  return [repeat($._semicolon_declaration), optional($._declaration)];
}

/**
 * Creates a rule to optionally match one or more of the rules separated by `separator`
 *
 * @param {GrammarSymbols<string>} $
 *
 * @returns {Array<Rule>}
 */
function class_members($) {
  return [repeat($._semicolon_class_member), optional($.class_member)];
}

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