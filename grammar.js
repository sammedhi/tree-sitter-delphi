/**
 * @file Delphi grammar for tree-sitter
 * @author Medhi SAM <sammedhi2@hotmail.fr>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  RELATIONAL: 1,
  RANGE: 2,
  ADDITIVE: 3,
  MULTIPLICATIVE: 4,
  UNARY: 5,
  DEREFERENCE: 6,
  POSTFIX: 7,
  CALL: 8,
  DOT: 9
};

export default grammar({
  name: "delphi",

  // Skip whitespace and newlines everywhere
  extras: $ => [
    /\s/,
    $.comment,
    $.invalid_character
  ],

  reserved: {
    global: _ => [
      /and/i,
      /array/i,
      /as/i,
      /asm/i,
      /begin/i,
      /case/i,
      /class/i,
      /const/i,
      /constructor/i,
      /destructor/i,
      /dispinterface/i,
      /div/i,
      /do/i,
      /downto/i,
      /else/i,
      /end/i,
      /except/i,
      /exports/i,
      /file/i,
      /finalization/i,
      /finally/i,
      /for/i,
      /function/i,
      /goto/i,
      /if/i,
      /implementation/i,
      /in/i,
      /inherited/i,
      /initialization/i,
      /inline/i,
      /interface/i,
      /is/i,
      /label/i,
      /library/i,
      /mod/i,
      /nil/i,
      /not/i,
      /object/i,
      /of/i,
      /or/i,
      /packed/i,
      /procedure/i,
      /program/i,
      /property/i,
      /raise/i,
      /record/i,
      /repeat/i,
      /resourcestring/i,
      /set/i,
      /shl/i,
      /shr/i,
      /string/i,
      /then/i,
      /threadvar/i,
      /to/i,
      /try/i,
      /type/i,
      /unit/i,
      /until/i,
      /uses/i,
      /var/i,
      /while/i,
      /with/i,
      /xor/i,
    ],

    properties: _ => []
  },

  inline: $ => [
    $._identifier
  ],

  conflicts: $ => [
    [$._simple_name, $.generic_name],
    [$.generic_name, $._reserved_identifier],
    [$.short_string, $._simple_name],
    [$._reserved_name, $._reserved_generic_name],
    [$.function_name, $._reserved_generic_name],
    [$._inherited_call_expression, $.call_expression],
    [$.enum_value, $._simple_name],
    [$.function_type],
    [$.parameter_declaration],
    [$.declaration, $.function_definition],
    [$.record_variant_part, $._semicolon],

    [$.global_declaration, $.variable_declarator],
    [$._type_declaration_section],
    [$._value_declaration_section],

    [$.parenthesized_expression, $.const_array_constructor_expression],
    [$.class_definition, $.forward_class_definition],
    [$.class_definition, $.fieldless_class_definition],
    [$.function_declaration],
    [$.class_property],
    [$.type, $.object_of_type],
    [$.forward_interface_definition, $.interface_definition],
    [$.lvalue_expression, $._call_statement],
    [$._type_definition, $.type],
    [$.index_range, $.not_lvalue_expression],
    [$.record_variant_part],

    [$.raise_statement],
    [$.exit_statement],
    [$.inherited_expression],
    [$.compound_string_literal],
    [$.while_statement],
    [$.with_statement],
    [$.break_statement],
    [$.continue_statement],
    [$.call_statement],
    [$.block_statement],
    [$.asm_statement],
    [$.for_each_statement],
    [$.reference_to_type],
    [$.variable_declaration_statement],
    [$.repeat_statement],
    [$.try_except_statement],
    [$.try_finally_statement],
    [$.assignment_statement],
    [$.for_numeric_statement],
    [$.case_statement],
    [$.case_branch],
    [$.goto_statement],
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
    $.loop_statement,
    $.for_statement,
    $.try_statement,
    $.class_member,
    $.declaration
  ],

  externals: $ => [
    $.multiline_string,
    $.float_no_decimal,
    $.asm_block,
    $.automatic_semicolon
  ],

  rules: {
    source_file: $ => choice(
      $.runnable_file,
      $.unit_file,
      repeat($.statement),
      repeat($.declaration)
    ),

    runnable_file: $ => seq(
      $.file_header,
      repeat($.declaration),
      field('body', choice($.block, $.asm_bl)),
      '.',
    ),

    unit_file: $ => seq(
      $.file_header,
      repeat($.declaration),
      repeat($.section),
      kw('end'),
      '.',
    ),

    file_header: $ => seq(
      field('file_type', choice(kw('unit'), kw('program'), kw('library'), kw('package'))),
      field('name', $._name),
      optional(seq(kw('deprecated'), field('message', $.compound_string_literal))),
      ';'
    ),

    section: $ => seq(
      field('kind', choice(
        kw('interface'),
        kw('implementation'),
        kw('initialization'),
        kw('finalization')
      )),
      choice(repeat($.declaration), repeat($.statement)),
    ),

    uses_clause: $ => seq(
      kw('uses'),
      repeat($.import),
    ),

    contains_clause: $ => seq(
      kw('contains'),
      repeat($.import)
    ),

    requires_clause: $ => seq(
      kw('requires'),
      repeat($.import)
    ),

    exports_clause: $ => seq(
      kw('exports'),
      repeat($.export)
    ),

    export: $ => seq(
      field('name', $._identifier),
      optional($.argument_list),
      optional(seq(kw('name'), $.compound_string_literal)),
      optional(choice(',', ';'))
    ),

    import: $ => seq(
      field('name', $._name),
      optional(seq(
        kw('in'),
        field('path', $.compound_string_literal))
      ),
      optional(choice(',', ';'))
    ),

    declaration: $ => choice(
      $.function_definition,
      $.external_function_definition,
      $.declaration_section,
      $.function_declaration,
      $.forward_function_declaration,
      $.uses_clause,
      $.requires_clause,
      $.contains_clause,
      $.exports_clause,
      $.label_declaration
    ),

    attribute: $ => seq(
      field('name', $._name),
      optional($.argument_list),
    ),

    attribute_list: $ => seq(
      '[',
      sep1($.attribute, ','),
      ']',
    ),

    _attributes: $ => repeat1($.attribute_list),

    helper_definition: $ => seq(
      field('kind', choice(kw('class'), kw('record'))),
      kw('helper'),
      optional($.base_list),
      kw('for'),
      field('name', $._name),
      repeat($.class_member),
      repeat($.class_section),
      kw('end')
    ),

    class_definition: $ => seq(
      kw('class'),
      optional(field('inheritance_modifier', choice(kw('abstract'), kw('sealed')))),
      optional($.base_list),

      repeat($.class_member),
      repeat($.class_section),
      kw('end'),
    ),

    fieldless_class_definition: $ => seq(
      kw('class'),
      optional(field('inheritance_modifier', choice(kw('abstract'), kw('sealed')))),
      $.base_list,
    ),

    forward_class_definition: $ => kw('class'),
    forward_interface_definition: $ => choice(kw('interface'), kw('dispinterface')),

    record_definition: $ => seq(
      optional(kw('packed')),
      kw('record'),
      repeat($.class_member),
      repeat($.class_section),
      kw('end'),
    ),

    record_variant_part: $ => seq(
      kw('case'),
      optional(
        seq(field('tag', $._identifier), ':'),
      ),
      field('type', $._name),
      kw('of'),
      sep($.labeled_constant_list, ';'),
      $._semicolon
    ),

    labeled_constant_list: $ => seq(
      field('case', $.expression),
      ':',
      $.parameter_list,
    ),

    base_list: $ => seq(
      '(',
      commaSep($._name),
      ')',
    ),

    class_section: $ => seq(
      optional(kw('strict')),
      field('visibility', choice(
        kw('published'),
        kw('public'),
        kw('protected'),
        kw('private'),
        kw('automated')
      )),
      repeat($.class_member),
    ),

    class_member: $ => choice(
      $.class_field,
      $.function_declaration,
      $.class_property,
      $.declaration_section,
      $.record_variant_part,
      $.method_resolution_clause
    ),

    method_resolution_clause: $ => seq(
      field('kind', choice(kw('function'), kw('procedure'))),
      field('interface_method', $._name),
      '=',
      field('implementing_method', $._simple_name),
      $._semicolon
    ),

    class_field: $ => seq(
      optional($._attributes),
      optional(kw('class')),
      commaSep1(field('name', $._identifier)),
      $._type_declaration,
      $._semicolon
    ),

    class_property: $ => seq(
      optional($._attributes),
      optional(kw('class')),
      kw('property'),
      field('name', $._identifier),
      optional($.array_parameter_list),
      optional($._type_declaration),
      repeat($.property_attribute),
      optional(seq(';', choice(kw('default'), kw('nodefault')))),
      $._semicolon
    ),

    property_attribute: $ => seq(
      field('kind', choice(
        kw('read'),
        kw('write'),
        kw('index'),
        kw('stored'),
        seq(optional(field('specifier', choice(kw('readonly'), kw('writeonly')))), kw('dispid')),
        kw('implements'),
        kw('default')
      )),
      field('value', commaSep1($.expression))
    ),

    interface_definition: $ => seq(
      field('kind', choice(kw('interface'), kw('dispinterface'))),
      optional($.base_list),
      optional($.guid_declaration),
      repeat($.class_member),
      kw('end'),
    ),

    guid_declaration: $ => seq(
      '[',
      $.compound_string_literal,
      ']',
    ),

    parameter_list: $ => seq(
      '(',
      sep(choice($.parameter_declaration, $.record_variant_part), ';'),
      ')',
    ),

    array_parameter_list: $ => seq(
      '[',
      sep($.parameter_declaration, ';'),
      ']'
    ),

    parameter_declaration: $ => seq(
      // TODO use alias for the modifier instead
      optional($._attributes),
      optional(field('modifier', choice(kw('const'), kw('var'), kw('out')))),
      optional($._attributes),
      commaSep1($.argument_name),
      optional($._type_declaration),
      optional(seq('=', field('default_value', $.expression))),
    ),

    argument_name: $ => $._identifier,

    _method_directive: $ => seq(optional(';'), $.method_directive),
    method_directive: $ => choice(
      kw('virtual'),
      kw('abstract'),
      kw('override'),
      kw('overload'),
      kw('unsafe'),
      kw('stdcall'),
      kw('cdecl'),
      kw('register'),
      kw('pascal'),
      kw('winapi'),
      kw('noreturn'),
      kw('safecall'),
      kw('inline'),
      kw('reintroduce'),
      kw('static'),
      kw('dynamic'),
      kw('final'),
      kw('varargs'),
      $.message_directive,
      $.dispid_directive
    ),

    dispid_directive: $ => seq(
      kw('dispid'),
      field('id', $.expression)
    ),

    message_directive: $ => seq(
      kw('message'),
      field('id', $.expression)
    ),

    hint_directive: $ => seq(
      field('kind', choice(kw('deprecated'), kw('platform'), kw('library'), kw('experimental'))),
      optional(field('message', $.compound_string_literal))
    ),

    declaration_section: $ => choice(
      $._type_declaration_section,
      $._value_declaration_section
    ),

    _type_declaration_section: $ => seq(
      field('kind', kw('type')),
      repeat($.type_declaration)
    ),

    _value_declaration_section: $ => seq(
      optional(kw('class')),
      field('kind', choice(
        kw('var'),
        kw('threadvar'),
        kw('const'),
        kw('resourcestring')
      )),
      repeat($.global_declaration),
    ),

    type_declaration: $ => seq(
      optional($._attributes),
      field('name', $._identifier),
      optional($.type_parameter_list),
      '=',
      $._type_definition,
      repeat($.hint_directive),
      $._semicolon
    ),

    global_declaration: $ => seq(
      optional($._attributes),
      commaSep1($._identifier),
      optional($._type_declaration),
      optional(seq(
        '=',
        $._section_value,
      )),
      optional($.absolute_declaration),
      repeat($.hint_directive),
      $._semicolon
    ),

    absolute_declaration: $ => seq(
      kw('absolute'),
      field('name', $._name)
    ),

    _section_value: $ => prec(1, choice(
      $._type_definition,
      $.expression
    )),

    _type_definition: $ => choice(
      $.type_alias_definition,
      $.strong_type_alias_definition,
      $.helper_definition,
      $.class_definition,
      alias($.fieldless_class_definition, $.class_definition),
      $.forward_class_definition,
      $.forward_interface_definition,
      $.interface_definition,
      $.record_definition,
    ),

    type_alias_definition: $ => seq(
      field('type', $.type),
    ),

    strong_type_alias_definition: $ => seq(
      kw('type'),
      field('type', $.type),
    ),

    enum_type: $ => seq(
      '(',
      sep1($.enum_value, ','),
      ')',
    ),

    enum_value: $ => seq(
      field('name', $._identifier),
      optional(seq('=', field('value', $.expression))),
    ),

    type: $ => choice(
      $._name,
      $.array_type,
      $.array_of_const,
      $.pointer_type,
      $.class_of_type,
      $.reference_to_type,
      $.object_of_type,
      $.function_type,
      $.set_of_type,
      $.record_definition,
      $.enum_type,
      $.short_string,
      $.file_type,
      $.subrange_type
    ),

    subrange_type: $ => prec.left(PREC.RANGE, seq(
      field('from', choice($.literal, $._name)),
      '..',
      field('to', choice($.literal, $._name))
    )),

    short_string: $ => seq(
      kw('string'),
      '[',
      $.integer_literal,
      ']'
    ),

    pointer_type: $ => seq('^', field('type', $.type)),

    array_type: $ => seq(
      optional(kw('packed')),
      kw('array'),
      optional($.index_range),
      kw('of'),
      field('type', $.type)
    ),

    array_of_const: $ => seq(kw('array'), kw('of'), kw('const')),

    file_type: $ => seq(
      kw('file'),
      kw('of'),
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

    set_range: $ => prec.left(PREC.RANGE, seq(
      field('intial', $.expression),
      '..',
      field('final', $.expression),
    )),

    set_of_type: $ => seq(
      optional(kw('packed')),
      kw('set'),
      kw('of'),
      field('type', $.type)
    ),

    class_of_type: $ => seq(
      kw('class'),
      kw('of'),
      field('type', $._name)
    ),

    reference_to_type: $ => seq(
      kw('reference'),
      kw('to'),
      field('kind', choice(
        kw('function'),
        kw('procedure')
      )),
      optional($.parameter_list),
      optional($._type_declaration)
    ),

    object_of_type: $ => seq(
      $.function_type,
      kw('of'),
      kw('object')
    ),

    function_type: $ => prec(1, seq(
      field('kind', choice(kw('function'), kw('procedure'))),
      optional($.parameter_list),
      optional($._type_declaration),
      repeat($._method_directive)
    )),

    function_declaration: $ => seq(
      optional($._attributes),
      optional(kw('class')),
      field('kind', choice(
        kw('procedure'),
        kw('function'),
        kw('constructor'),
        kw('destructor'),
        kw('operator')
      )),
      field('name', $.function_name),
      optional($.type_parameter_list),
      optional($.parameter_list),
      optional(field('return_type', seq(':', $.type))),
      repeat($._method_directive),
      repeat(seq(optional(';'), $.hint_directive)),
      $._semicolon
    ),

    function_definition: $ => seq(
      field('header', $.function_declaration),
      repeat($.declaration),
      field('body', choice($.block_statement, $.asm_statement)),
    ),

    external_function_definition: $ => seq(
      $.function_declaration,
      kw('external'),
      optional(field('source', choice($.literal, $._name))),
      optional(seq(kw('name'), field('original_name', $.expression))),
      optional(kw('delayed')),
      $._semicolon
    ),

    forward_function_declaration: $ => seq(
      $.function_declaration,
      kw('forward'),
      $._semicolon
    ),

    function_name: $ => seq(
      optional(field('qualifier', seq($._name, '.'))),
      field('name', $._reserved_identifier)
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
      $.goto_statement,
      $.labeled_statement,
      prec(1, alias($.inherited_expression, $.inherited_statement)),
      $.call_statement,
      $.with_statement,
      $.element_access_expression,
      $.asm_statement,
      alias($.parenthesized_expression, $.parenthesis_statement),
      $._empty_statement
    ),

    label_declaration: $ => seq(
      kw('label'),
      commaSep1(choice($._identifier, $.literal)),
      ';'
    ),

    labeled_statement: $ => seq(
      field('label', choice($._identifier, $.literal)),
      ':',
      $.statement
    ),

    _empty_statement: _ => prec(-1, ';'),

    goto_statement: $ => seq(
      kw('goto'),
      field('label', $._identifier),
      $._semicolon
    ),

    with_statement: $ => seq(
      kw('with'),
      commaSep1($.expression),
      kw('do'),
      optional($.statement),
    ),

    raise_statement: $ => seq(
      kw('raise'),
      optional($.expression),
      optional(seq(kw('at'), $.expression)),
      $._semicolon
    ),

    inherited_expression: $ => seq(
      kw('inherited'),
      $._semicolon
    ),

    if_statement: $ => prec.right(seq(
      kw('if'),
      field('condition', $.expression),
      kw('then'),
      field('then', optional($.statement)),
      optional(seq(
        kw('else'),
        optional(field('else', $.statement)),
      )),
    )),

    case_statement: $ => seq(
      kw('case'),
      field('value', $.expression),
      kw('of'),
      repeat($.case_branch),
      optional(seq(
        kw('else'),
        optional(alias(repeat($.statement), $.else_statements)),
      )),
      kw('end'),
      $._semicolon
    ),

    case_branch: $ => seq(
      field('pattern', commaSep1($.case_pattern)),
      ':',
      field('body', optional($.statement)),
    ),

    case_pattern: $ => choice(
      $.expression,
    ),

    assignment_statement: $ => seq(
      field('left', $.lvalue_expression),
      ':=',
      field('right', $.expression),
      $._semicolon
    ),

    variable_declaration_statement: $ => seq(
      choice(kw('var'), kw('const')),
      choice(
        seq(
          $.variable_declarator,
          choice(
            seq($._type_declaration, optional($._variable_initialization)),
            $._variable_initialization,
          )
        ),
        seq(
          commaSep1($.variable_declarator),
          $._type_declaration
        )
      ),
      $._semicolon
    ),

    _type_declaration: $ => seq(":", field('type', $.type)),
    _variable_initialization: $ => seq(choice(':=', '='), field('initial_value', $.expression)),

    variable_declarator: $ =>
      field("name", $._identifier),

    block: $ => seq(
      kw('begin'),
      repeat($.statement),
      kw('end'),
    ),

    block_statement: $ => seq(
      $.block, 
      $._semicolon
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
      kw('for'),
      field('variable', $._for_variable),
      ':=',
      field('initial_value', $.expression),
      field('direction', choice(kw('to'), kw('downto'))),
      field('final_value', $.expression),
      kw('do'),
      field('body', optional($.statement)),
    ),

    for_each_statement: $ => seq(
      kw('for'),
      field('variable', $._for_variable),
      kw('in'),
      field('collection', $.expression),
      kw('do'),
      field('body', optional($.statement)),
    ),

    _for_variable: $ => choice(
      $._identifier,
      alias($.for_variable_declaration, $.variable_declaration)
    ),

    for_variable_declaration: $ => seq(
      kw('var'),
      $.variable_declarator,
      optional($._type_declaration),
    ),

    while_statement: $ => seq(
      kw('while'),
      field('condition', $.expression),
      kw('do'),
      field('body', optional($.statement)),
    ),

    repeat_statement: $ => seq(
      kw('repeat'),
      repeat($.statement),  // last statement before 'until' needs no semicolon
      kw('until'),
      field('condition', $.expression),
      $._semicolon
    ),

    try_statement: $ => choice(
      $.try_except_statement,
      $.try_finally_statement,
    ),

    try_except_statement: $ => seq(
      kw('try'),
      alias(repeat($.statement), $.try_statements),
      kw('except'),
      choice(
        // typed handlers: on E: Exception do ...
        seq(
          repeat1($.exception_handler),
          optional(seq(kw('else'), alias(repeat($.statement), $.except_else_statements))),
        ),
        // bare except: just statements
        seq(
          alias(repeat($.statement), $.except_statements)
        ),
      ),
      kw('end'),
      $._semicolon
    ),

    exception_handler: $ => seq(
      kw('on'),
      optional(seq(field('variable', $._identifier), ':')),
      field('type', $._name),
      kw('do'),
      field('body', optional($.statement)),
    ),

    try_finally_statement: $ => seq(
      kw('try'),
      alias(repeat($.statement), $.try_statements),
      kw('finally'),
      alias(repeat($.statement), $.finally_statements),
      kw('end'),
      $._semicolon
    ),

    continue_statement: $ => seq(
      kw('continue'),
      $._semicolon
    ),

    break_statement: $ => seq(
      kw('break'),
      $._semicolon
    ),

    exit_statement: $ => seq(
      kw('exit'),
      optional($.argument_list),
      $._semicolon
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
      $.element_access_expression,
      $.call_expression,
      $.address_of_expression
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
      alias($._inherited_call_expression, $.call_expression),
      $.anonymous_function_expression,
      $.index_range,
      $.ternary_expression,
      $.set_range,
      $.inherited_expression
    ),

    //#region literals
    literal: $ => choice(
      $.integer_literal,
      $.float_literal,
      alias($.float_no_decimal, $.float_literal),
      $.compound_string_literal,
      $.boolean_literal,
      $.nil_literal,
      $.multiline_string
    ),

    unary_expression: $ => prec(PREC.UNARY, seq(
      field('operator', choice('+', '-', kw('not'))),
      field('operand', $.expression),
    )),

    not_in: $ => seq(kw('not'), kw('in')),

    binary_expression: $ => {
      /** @type {Array<[string|Rule, number]>} */
      const table = [
        ['*', PREC.MULTIPLICATIVE],
        ['/', PREC.MULTIPLICATIVE],
        [kw('div'), PREC.MULTIPLICATIVE],
        [kw('mod'), PREC.MULTIPLICATIVE],
        [kw('and'), PREC.MULTIPLICATIVE],
        [kw('shl'), PREC.MULTIPLICATIVE],
        [kw('shr'), PREC.MULTIPLICATIVE],
        [kw('as'), PREC.MULTIPLICATIVE],
        [$.not_in, PREC.MULTIPLICATIVE],
        ['+', PREC.ADDITIVE],
        ['-', PREC.ADDITIVE],
        [kw('or'), PREC.ADDITIVE],
        [kw('xor'), PREC.ADDITIVE],
        ['=', PREC.RELATIONAL],
        ['<>', PREC.RELATIONAL],
        ['<', PREC.RELATIONAL],
        ['>', PREC.RELATIONAL],
        ['<=', PREC.RELATIONAL],
        ['>=', PREC.RELATIONAL],
        [kw('in'), PREC.RELATIONAL],
        [kw('is'), PREC.RELATIONAL],
      ];

      return choice(...table.map(([operator, precedence]) =>
        prec.left(precedence, seq(
          field('left', $.expression),
          field('operator', operator),
          field('right', $.expression),
        ))
      ));
    },

    ternary_expression: $ => seq(
      kw('if'),
      field('condition', $.expression),
      kw('then'),
      field('then', $.expression),
      kw('else'),
      field('else', $.expression)
    ),

    dereference_expression: $ => prec(PREC.DEREFERENCE, seq(
      field('operand', choice($.parenthesized_expression, $.lvalue_expression)),
      '^'
    )),

    address_of_expression: $ => prec(PREC.UNARY, seq(
      '@',
      field('operand', $.expression),
    )),

    labeled_value: $ => seq(
      field('label', $._identifier),
      ':',
      field('value', $.expression)
    ),

    _inherited_call_expression: $ => prec(PREC.CALL, seq(
      kw('inherited'),
      field('function', choice($.lvalue_expression, $.parenthesized_expression)),
      optional($.argument_list)
    )),

    call_expression: $ => prec(PREC.CALL, seq(
      field('function', choice($.lvalue_expression, $.parenthesized_expression)),
      $.argument_list,
    )),

    call_statement: $ => seq(
      $._call_statement,
      $._semicolon
    ),

    _call_statement: $ => prec(1, choice(
      alias($._simple_name, $.call_expression),
      $.member_access_expression,
      $.call_expression,
      alias($._inherited_call_expression, $.call_expression),
    )),

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
        sep($.expression, choice(',', ';')),
        sep1($.labeled_value, choice(',', ';')),
      ),
      optional(choice(',', ';')),
      ')'
    ),

    element_access_expression: $ => prec(PREC.POSTFIX, seq(
      field('expression', choice($.parenthesized_expression, $.lvalue_expression)),
      field('subscript', seq(
        '[',
        commaSep1($.expression),
        ']'
      ))
    )),

    anonymous_function_expression: $ => seq(
      field('kind', choice(
        kw('function'),
        kw('procedure')
      )),
      optional($.parameter_list),
      optional(field('type', $._type_declaration)),
      repeat($._method_directive),
      repeat($.declaration),
      choice($.block, $.asm_bl),
    ),

    integer_literal: _ => token(choice(
      /[0-9_]+/,           // decimal
      /\$[0-9a-fA-F_]+/,  // hex
      /%[01_]+/,           // binary
    )),

    float_literal: $ => token(choice(
      /[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?/,  // 3.14, 1.5e10
      /[0-9]+[eE][+-]?[0-9]+/,             // 1e10
    )),

    string_literal: _ => token(seq(
      '\'',
      repeat(choice(
        /[^'\r\n]/,
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

    //#endregion
    _simple_name: $ => choice(
      $._identifier,
      $.generic_name
    ),

    generic_name: $ => seq($._identifier, $.type_argument_list),

    _reserved_name: $ => choice(
      $._reserved_identifier,
      alias($._reserved_generic_name, $.generic_name)
    ),

    _reserved_generic_name: $ => seq(
      $._reserved_identifier,
      $.type_argument_list
    ),

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
      commaSep1(field('name', $._identifier)),
      optional(seq(
        ':',
        $.type_constraints,
      )),
    ),

    type_constraints: $ => commaSep1($._type_constraint),

    _type_constraint: $ => choice(
      kw('class'),
      kw('record'),
      kw('interface'),
      kw('constructor'),
      kw('unmanaged'),
      $._name,
    ),

    _name: $ => choice(
      $.qualified_name,
      $._simple_name,
    ),

    qualified_name: $ => prec(PREC.DOT, seq(
      field('qualifier', $._name),
      '.',
      field('name', $._reserved_name),
    )),

    member_access_expression: $ => prec(PREC.DOT, seq(
      field('expression', choice($.parenthesized_expression, $.lvalue_expression, $.literal)),
      '.',
      field('name', $._reserved_name)),
    ),

    asm_bl: $ => seq(
      kw('asm'),
      optional($.asm_block),
      kw('end'),
    ),

    asm_statement: $ => seq(
      $.asm_bl,
      $._semicolon
    ),

    _semicolon: $ => choice(
      ';',
      $.automatic_semicolon
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

    identifier: $ =>  /[&\p{L}_][&\p{L}\p{Nd}_]*/u,
    _identifier: $ => choice(
      $.identifier,
      kw('string')
    ),

    _reserved_identifier: $ => reserved(
      'properties',
      $.identifier
    ),

    boolean_literal: _ => token(prec(1, /true|false/i)),
    nil_literal: _ => alias(/nil/i, "nil"),

    invalid_character: $ => /[\x00-\x08\x0B\x0E-\x1F\x7F-\x9F\u200B-\u200F\u2028\u2029\uFEFF\uFFFD]/,
  }
});

/**
 * 
 * @param {String} name 
 * @returns {AliasRule}
 */
function kw(name) {
  return alias(new RegExp(name, 'i'), name);
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