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
  ],

  conflicts: $ => [
    [$._simple_name, $.generic_name],
    [$._inherited_call_expression, $.call_expression],
    [$.function_name, $.generic_name],
    [$.enum_value, $._simple_name],

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
    [$.attribute, $.index_range],
    [$.lvalue_expression, $._call_statement],
    [$.qualified_name, $.member_access_expression],
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
    [$.short_string, $.type]
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
    $.asm_block
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
      field('body', choice($.block_statement, $.asm_statement)),
      '.',
    ),

    unit_file: $ => seq(
      $.file_header,
      repeat($.declaration),
      repeat($.section),
      $._kw_end,
      '.',
    ),

    file_header: $ => seq(
      field('file_type', choice($._kw_unit, $._kw_program, $._kw_library, $._kw_package)),
      field('name', $._name),
      optional(seq($._kw_deprecated, field('message', $.compound_string_literal))),
      ';'
    ),

    section: $ => seq(
      field('_kind', choice(
        $._kw_interface,
        $._kw_implementation,
        $._kw_initialization,
        $._kw_finalization
      )),
      choice(repeat($.declaration), repeat($.statement)),
    ),

    uses_clause: $ => seq(
      $._kw_uses,
      repeat($.import),
    ),

    contains_clause: $ => seq(
      $._kw_contains,
      repeat($.import)
    ),

    requires_clause: $ => seq(
      $._kw_requires,
      repeat($.import)
    ),

    exports_clause: $ => seq(
      $._kw_exports,
      repeat($.export)
    ),

    export: $ => seq(
      field('name', $.identifier),
      optional($.argument_list),
      optional(seq($._kw_name, $.compound_string_literal)),
      optional(choice(',', ';'))
    ),

    import: $ => seq(
      field('name', $._name),
      optional(seq(
        $._kw_in,
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
      field('_kind', choice($._kw_class, $._kw_record)),
      $._kw_helper,
      optional($.base_list),
      $._kw_for,
      field('name', $._name),
      repeat($.class_member),
      repeat($.class_section),
      $._kw_end
    ),

    class_definition: $ => seq(
      $._kw_class,
      optional(field('inheritance_modifier', choice($._kw_abstract, $._kw_sealed))),
      optional($.base_list),

      repeat($.class_member),
      repeat($.class_section),
      $._kw_end,
    ),

    fieldless_class_definition: $ => seq(
      $._kw_class,
      optional(field('inheritance_modifier', choice($._kw_abstract, $._kw_sealed))),
      $.base_list,
    ),

    forward_class_definition: $ => $._kw_class,
    forward_interface_definition: $ => choice($._kw_interface, $._kw_dispinterface),

    record_definition: $ => seq(
      optional($._kw_packed),
      $._kw_record,
      repeat($.class_member),
      repeat($.class_section),
      $._kw_end,
    ),

    record_variant_part: $ => seq(
      $._kw_case,
      optional(
        seq(field('tag', $.identifier), ':'),
      ),
      field('type', $._name),
      $._kw_of,
      sep($.labeled_constant_list, ';'),
      optional(';')
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
      optional($._kw_strict),
      field('visibility', choice(
        $._kw_published,
        $._kw_public,
        $._kw_protected,
        $._kw_private,
        $._kw_automated
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
      field('_kind', choice($._kw_function, $._kw_procedure)),
      field('interface_method', $._name),
      '=',
      field('implementing_method', $._simple_name),
      optional(';')
    ),

    class_field: $ => seq(
      optional($._attributes),
      optional($._kw_class),
      commaSep1(field('name', $.identifier)),
      $._type_declaration,
      optional(';')
    ),

    class_property: $ => seq(
      optional($._attributes),
      optional($._kw_class),
      $._kw_property,
      field('name', $.identifier),
      optional($.array_parameter_list),
      optional($._type_declaration),
      repeat($.property_attribute),
      optional(seq(';', $._kw_default)),
      optional(';')
    ),

    property_attribute: $ => seq(
      field('_kind', choice(
        $._kw_read,
        $._kw_write,
        $._kw_index,
        $._kw_stored,
        seq(optional(field('specifier', choice($._kw_readonly, $._kw_writeonly))), $._kw_dispid),
        $._kw_implements,
        $._kw_default
      )),
      field('value', commaSep1($.expression))
    ),

    interface_definition: $ => seq(
      field('kind', choice($._kw_interface, $._kw_dispinterface)),
      optional($.base_list),
      optional($.guid_declaration),
      repeat($.class_member),
      $._kw_end,
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
      optional(field('modifier', choice($._kw_const, $._kw_var, $._kw_out))),
      commaSep1($.argument_name),
      optional($._type_declaration),
      optional(seq('=', field('default_value', $.expression))),
    ),

    argument_name: $ => $.identifier,

    _method_directive: $ => seq(optional(';'), $.method_directive),
    method_directive: $ => choice(
      $._kw_virtual,
      $._kw_abstract,
      $._kw_override,
      $._kw_overload,
      $._kw_unsafe,
      $._kw_stdcall,
      $._kw_cdecl,
      $._kw_register,
      $._kw_pascal,
      $._kw_winapi,
      $._kw_noreturn,
      $._kw_safecall,
      $._kw_inline,
      $._kw_reintroduce,
      $._kw_static,
      $._kw_dynamic,
      $._kw_final,
      $._kw_experimental,
      $.message_directive,
      $.hint_directive,
      $.dispid_directive
    ),

    dispid_directive: $ => seq(
      $._kw_dispid,
      field('id', $.expression)
    ),

    message_directive: $ => seq(
      $._kw_message,
      field('id', $.identifier)
    ),

    hint_directive: $ => seq(
      field('_kind', choice($._kw_deprecated, $._kw_platform, $._kw_library)),
      optional(field('message', $.compound_string_literal))
    ),

    declaration_section: $ => choice(
      $._type_declaration_section,
      $._value_declaration_section
    ),

    _type_declaration_section: $ => seq(
      field('_kind', $._kw_type),
      repeat($.type_declaration)
    ),

    _value_declaration_section: $ => seq(
      optional($._kw_class),
      field('_kind', choice(
        $._kw_var,
        $._kw_threadvar,
        $._kw_const,
        $._kw_resourcestring
      )),
      repeat($.global_declaration),
    ),

    type_declaration: $ => seq(
      optional($._attributes),
      field('name', $.identifier),
      optional($.type_parameter_list),
      '=',
      $._type_definition,
      optional($.hint_directive),
      optional(';')
    ),

    global_declaration: $ => seq(
      optional($._attributes),
      commaSep1($.identifier),
      optional($._type_declaration),
      optional(seq(
        '=',
        $._section_value,
      )),
      optional($.absolute_declaration),
      optional($.hint_directive),
      optional(';')
    ),

    absolute_declaration: $ => seq(
      $._kw_absolute,
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
      $._kw_type,
      field('type', $.type),
    ),

    enum_type: $ => seq(
      '(',
      sep1($.enum_value, ','),
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
      $.class_of_type,
      $.reference_to_type,
      $.object_of_type,
      $.function_type,
      $.set_of_type,
      $.record_definition,
      $.enum_type,
      $.short_string,
      $._kw_string
    ),

    short_string: $ => seq(
      $._kw_string,
      '[',
      $.integer_literal,
      ']'
    ),

    pointer_type: $ => seq('^', field('type', $.type)),

    array_type: $ => seq(
      optional($._kw_packed),
      $._kw_array,
      optional($.index_range),
      $._kw_of,
      field('type', $.type)
    ),

    file_type: $ => seq(
      $._kw_file,
      $._kw_of,
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
      optional($._kw_packed),
      $._kw_set,
      $._kw_of,
      field('type', $.type)
    ),

    class_of_type: $ => seq(
      $._kw_class,
      $._kw_of,
      field('type', $._name)
    ),

    reference_to_type: $ => seq(
      $._kw_reference,
      $._kw_to,
      field('_kind', choice(
        $._kw_function,
        $._kw_procedure
      )),
      optional($.parameter_list),
      optional($._type_declaration)
    ),

    object_of_type: $ => seq(
      $.function_type,
      $._kw_of,
      $._kw_object
    ),

    function_type: $ => prec(1, seq(
      field('_kind', choice($._kw_function, $._kw_procedure)),
      $.parameter_list,
      optional($._type_declaration)
    )),

    function_declaration: $ => seq(
      optional($._attributes),
      optional($._kw_class),
      field('_kind', choice(
        $._kw_procedure,
        $._kw_function,
        $._kw_constructor,
        $._kw_destructor,
        $._kw_operator
      )),
      field('name', $.function_name),
      optional($.type_parameter_list),
      optional($.parameter_list),
      optional(field('return_type', seq(':', $.type))),
      repeat($._method_directive),
      optional(';')
    ),

    function_definition: $ => seq(
      field('header', $.function_declaration),
      ';',
      repeat($.declaration),
      field('body', choice($.block_statement, $.asm_statement)),
      optional(';')
    ),

    external_function_definition: $ => seq(
      $.function_declaration,
      optional(';'), $._kw_external,
      optional(field('source', choice($.literal, $._name))),
      optional(seq($._kw_name, field('original_name', $.expression))),
      optional($._kw_delayed),
      optional(';')
    ),

    forward_function_declaration: $ => seq(
      $.function_declaration,
      $._kw_forward,
      optional(';')
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
      $.goto_statement,
      $.labeled_statement,
      prec(1, alias($.inherited_expression, $.inherited_statement)),
      $.call_statement,
      $.with_statement,
      $.element_access_expression,
      $.asm_statement,
      $._empty_statement
    ),

    label_declaration: $ => seq(
      $._kw_label,
      commaSep1(choice($.identifier, $.literal)),
      ';'
    ),

    labeled_statement: $ => seq(
      field('label', choice($.identifier, $.literal)),
      ':',
      $.statement
    ),

    _empty_statement: _ => prec(-1, ';'),

    goto_statement: $ => seq(
      $._kw_goto,
      field('label', $.identifier),
      optional(';')
    ),

    with_statement: $ => seq(
      $._kw_with,
      commaSep1($.expression),
      $._kw_do,
      optional($.statement),
      optional(';')
    ),

    raise_statement: $ => seq(
      $._kw_raise,
      optional($.expression),
      optional(';')
    ),

    inherited_expression: $ => seq(
      $._kw_inherited,
      optional(';')
    ),

    if_statement: $ => prec.right(seq(
      $._kw_if,
      field('condition', $.expression),
      $._kw_then,
      field('then', optional($.statement)),
      optional(seq(
        $._kw_else,
        optional(field('else', $.statement)),
      )),
      optional(';')
    )),

    case_statement: $ => seq(
      $._kw_case,
      field('value', $.expression),
      $._kw_of,
      repeat($.case_branch),
      optional(seq(
        $._kw_else,
        optional(alias(repeat($.statement), $.else_statements)),
      )),
      $._kw_end,
      optional(';')
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
      optional(';')
    ),

    variable_declaration_statement: $ => seq(
      choice($._kw_var, $._kw_const),
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
      optional(';')
    ),

    _type_declaration: $ => seq(":", field('type', $.type)),
    _variable_initialization: $ => seq(choice(':=', '='), field('initial_value', $.expression)),

    variable_declarator: $ =>
      field("name", $.identifier),

    block_statement: $ => seq(
      $._kw_begin,
      repeat($.statement),
      $._kw_end,
      optional(';')
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
      $._kw_for,
      field('variable', $._for_variable),
      ':=',
      field('initial_value', $.expression),
      field('direction', choice($._kw_to, $._kw_downto)),
      field('final_value', $.expression),
      $._kw_do,
      field('body', optional($.statement)),
      optional(';')
    ),

    for_each_statement: $ => seq(
      $._kw_for,
      field('variable', $._for_variable),
      $._kw_in,
      field('collection', $.expression),
      $._kw_do,
      field('body', optional($.statement)),
      optional(';')
    ),

    _for_variable: $ => choice(
      $.identifier,
      alias($.for_variable_declaration, $.variable_declaration)
    ),

    for_variable_declaration: $ => seq(
      $._kw_var,
      $.variable_declarator,
      optional($._type_declaration),
    ),

    while_statement: $ => seq(
      $._kw_while,
      field('condition', $.expression),
      $._kw_do,
      field('body', optional($.statement)),
      optional(';')
    ),

    repeat_statement: $ => seq(
      $._kw_repeat,
      repeat($.statement),  // last statement before 'until' needs no semicolon
      $._kw_until,
      field('condition', $.expression),
      optional(';')
    ),

    try_statement: $ => choice(
      $.try_except_statement,
      $.try_finally_statement,
    ),

    try_except_statement: $ => seq(
      $._kw_try,
      alias(repeat($.statement), $.try_statements),
      $._kw_except,
      choice(
        // typed handlers: on E: Exception do ...
        seq(
          repeat1($.exception_handler),
          optional(seq($._kw_else, alias(repeat($.statement), $.except_else_statements))),
        ),
        // bare except: just statements
        seq(
          alias(repeat($.statement), $.except_statements)
        ),
      ),
      $._kw_end,
      optional(';')
    ),

    exception_handler: $ => seq(
      $._kw_on,
      optional(seq(field('variable', $.identifier), ':')),
      field('type', $._name),
      $._kw_do,
      field('body', optional($.statement)),
    ),

    try_finally_statement: $ => seq(
      $._kw_try,
      alias(repeat($.statement), $.try_statements),
      $._kw_finally,
      alias(repeat($.statement), $.finally_statements),
      $._kw_end,
      optional(';')
    ),

    continue_statement: $ => seq(
      $._kw_continue,
      optional(';')
    ),

    break_statement: $ => seq(
      $._kw_break,
      optional(';')
    ),

    exit_statement: $ => seq(
      $._kw_exit,
      optional($.argument_list),
      optional(';')
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
      field('operator', choice('-', $._kw_not)),
      field('operand', $.expression),
    )),

    not_in: $ => seq($._kw_not, $._kw_in),

    binary_expression: $ => {
      /** @type {Array<[string|Rule, number]>} */
      const table = [
        ['*', PREC.MULTIPLICATIVE],
        ['/', PREC.MULTIPLICATIVE],
        [$._kw_div, PREC.MULTIPLICATIVE],
        [$._kw_mod, PREC.MULTIPLICATIVE],
        [$._kw_and, PREC.MULTIPLICATIVE],
        [$._kw_shl, PREC.MULTIPLICATIVE],
        [$._kw_shr, PREC.MULTIPLICATIVE],
        [$._kw_as, PREC.MULTIPLICATIVE],
        [$.not_in, PREC.MULTIPLICATIVE],
        ['+', PREC.ADDITIVE],
        ['-', PREC.ADDITIVE],
        [$._kw_or, PREC.ADDITIVE],
        [$._kw_xor, PREC.ADDITIVE],
        ['=', PREC.RELATIONAL],
        ['<>', PREC.RELATIONAL],
        ['<', PREC.RELATIONAL],
        ['>', PREC.RELATIONAL],
        ['<=', PREC.RELATIONAL],
        ['>=', PREC.RELATIONAL],
        [$._kw_in, PREC.RELATIONAL],
        [$._kw_is, PREC.RELATIONAL],
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
      $._kw_if,
      field('condition', $.expression),
      $._kw_then,
      field('then', $.expression),
      $._kw_else,
      field('else', $.expression)
    ),

    dereference_expression: $ => prec(PREC.DEREFERENCE, seq(
      field('operand', $.expression),
      '^'
    )),

    address_of_expression: $ => prec(PREC.UNARY, seq(
      '@',
      field('operand', $.expression),
    )),

    labeled_value: $ => seq(
      field('label', $.identifier),
      ':',
      field('value', $.expression)
    ),

    _inherited_call_expression: $ => prec(PREC.CALL, seq(
      $._kw_inherited,
      field('function', choice($.lvalue_expression, $.parenthesized_expression)),
      optional($.argument_list)
    )),

    call_expression: $ => prec(PREC.CALL, seq(
      field('function', choice($.lvalue_expression, $.parenthesized_expression)),
      $.argument_list,
    )),

    call_statement: $ => seq(
      $._call_statement,
      optional(';')
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
      field('_kind', choice(
        $._kw_function,
        $._kw_procedure
      )),
      optional($.parameter_list),
      optional(field('type', $._type_declaration)),
      repeat($.declaration),
      choice($.block_statement, $.asm_statement),
    ),

    integer_literal: _ => token(choice(
      /[0-9]+/,           // decimal
      /\$[0-9a-fA-F]+/,  // hex
      /%[01]+/,           // binary
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
      $._kw_class,
      $._kw_record,
      $._kw_interface,
      $._kw_constructor,
      $._kw_unmanaged,
      $._name,
    ),

    _name: $ => choice(
      $.qualified_name,
      $._simple_name,
    ),

    qualified_name: $ => prec(PREC.DOT, seq(
      field('qualifier', $._name),
      '.',
      field('name', $._simple_name),
    )),

    member_access_expression: $ => prec(PREC.DOT, seq(
      field('expression', choice($.expression, $._name)),
      '.',
      field('name', $._simple_name),
    )),

    asm_statement: $ => seq(
      $._kw_asm,
      optional($.asm_block),
      $._kw_end,
      optional(';')
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

    identifier: $ => /[&\p{L}_][&\p{L}0-9_]*/u,

    boolean_literal: _ => token(prec(1, /true|false/i)),
    nil_literal: _ => alias(/nil/i, "nil"),

    // Keywords — case insensitive
    _kw_begin: _ => alias(token(prec(1, /begin/i)), "begin"),
    _kw_end: _ => alias(token(prec(1, /end/i)), "end"),
    _kw_program: _ => alias(token(prec(1, /program/i)), "program"),
    _kw_library: _ => alias(token(prec(1, /library/i)), "library"),
    _kw_package: _ => alias(token(prec(1, /package/i)), "package"),
    _kw_unit: _ => alias(token(prec(1, /unit/i)), "unit"),
    _kw_interface: _ => alias(token(prec(1, /interface/i)), "interface"),
    _kw_implementation: _ => alias(token(prec(1, /implementation/i)), "implementation"),
    _kw_initialization: _ => alias(token(prec(1, /initialization/i)), "initialization"),
    _kw_finalization: _ => alias(token(prec(1, /finalization/i)), "finalization"),
    _kw_uses: _ => alias(token(prec(1, /uses/i)), "uses"),
    _kw_contains: _ => alias(token(prec(1, /contains/i)), "contains"),
    _kw_requires: _ => alias(token(prec(1, /requires/i)), "requires"),
    _kw_exports: _ => alias(token(prec(1, /exports/i)), "exports"),
    _kw_type: _ => alias(token(prec(1, /type/i)), "type"),
    _kw_var: _ => alias(token(prec(1, /var/i)), "var"),
    _kw_threadvar: _ => alias(token(prec(1, /threadvar/i)), "threadvar"),
    _kw_const: _ => alias(token(prec(1, /const/i)), "const"),
    _kw_resourcestring: _ => alias(token(prec(1, /resourcestring/i)), "resourcestring"),
    _kw_not: _ => alias(token(prec(1, /not/i)), "not"),
    _kw_and: _ => alias(token(prec(1, /and/i)), "and"),
    _kw_or: _ => alias(token(prec(1, /or/i)), "or"),
    _kw_xor: _ => alias(token(prec(1, /xor/i)), "xor"),
    _kw_div: _ => alias(token(prec(1, /div/i)), "div"),
    _kw_mod: _ => alias(token(prec(1, /mod/i)), "mod"),
    _kw_shl: _ => alias(token(prec(1, /shl/i)), "shl"),
    _kw_shr: _ => alias(token(prec(1, /shr/i)), "shr"),
    _kw_in: _ => alias(token(prec(1, /in/i)), "in"),
    _kw_is: _ => alias(token(prec(1, /is/i)), "is"),
    _kw_as: _ => alias(token(prec(1, /as/i)), "as"),
    _kw_for: _ => alias(token(prec(1, /for/i)), "for"),
    _kw_while: _ => alias(token(prec(1, /while/i)), "while"),
    _kw_with: _ => alias(token(prec(1, /with/i)), "with"),
    _kw_goto: _ => alias(token(prec(1, /goto/i)), "goto"),
    _kw_label: _ => alias(token(prec(1, /label/i)), "label"),
    _kw_to: _ => alias(token(prec(1, /to/i)), "to"),
    _kw_downto: _ => alias(token(prec(1, /downto/i)), "downto"),
    _kw_do: _ => alias(token(prec(1, /do/i)), "do"),
    _kw_repeat: _ => alias(token(prec(1, /repeat/i)), "repeat"),
    _kw_until: _ => alias(token(prec(1, /until/i)), "until"),
    _kw_if: _ => alias(token(prec(1, /if/i)), "if"),
    _kw_then: _ => alias(token(prec(1, /then/i)), "then"),
    _kw_else: _ => alias(token(prec(1, /else/i)), "else"),
    _kw_case: _ => alias(token(prec(1, /case/i)), "case"),
    _kw_of: _ => alias(token(prec(1, /of/i)), "of"),
    _kw_try: _ => alias(token(prec(1, /try/i)), "try"),
    _kw_except: _ => alias(token(prec(1, /except/i)), "except"),
    _kw_finally: _ => alias(token(prec(1, /finally/i)), "finally"),
    _kw_asm: _ => alias(token(prec(1, /asm/i)), "asm"),
    _kw_on: _ => alias(token(prec(1, /on/i)), "on"),
    _kw_packed: _ => alias(token(prec(1, /packed/i)), "packed"),
    _kw_helper: _ => alias(token(prec(1, /helper/i)), "helper"),
    _kw_class: _ => alias(token(prec(1, /class/i)), "class"),
    _kw_dispinterface: _ => alias(token(prec(1, /dispinterface/i)), "dispinterface"),
    _kw_record: _ => alias(token(prec(1, /record/i)), "record"),
    _kw_unmanaged: _ => alias(token(prec(1, /unmanaged/i)), "unmanaged"),
    _kw_procedure: _ => alias(token(prec(1, /procedure/i)), "procedure"),
    _kw_function: _ => alias(token(prec(1, /function/i)), "function"),
    _kw_constructor: _ => alias(token(prec(1, /constructor/i)), "constructor"),
    _kw_destructor: _ => alias(token(prec(1, /destructor/i)), "destructor"),
    _kw_operator: _ => alias(token(prec(1, /operator/i)), "operator"),
    _kw_private: _ => alias(token(prec(1, /private/i)), "private"),
    _kw_protected: _ => alias(token(prec(1, /protected/i)), "protected"),
    _kw_public: _ => alias(token(prec(1, /public/i)), "public"),
    _kw_published: _ => alias(token(prec(1, /published/i)), "published"),
    _kw_automated: _ => alias(token(prec(1, /automated/i)), "automated"),
    _kw_property: _ => alias(token(prec(1, /property/i)), "property"),
    _kw_index: _ => alias(token(prec(1, /index/i)), "index"),
    _kw_read: _ => alias(token(prec(1, /read/i)), "read"),
    _kw_write: _ => alias(token(prec(1, /write/i)), "write"),
    _kw_stored: _ => alias(token(prec(1, /stored/i)), "stored"),
    _kw_default: _ => alias(token(prec(1, /default/i)), "default"),
    _kw_dispid: _ => alias(token(prec(1, /dispid/i)), "dispid"),
    _kw_implements: _ => alias(token(prec(1, /implements/i)), "implements"),
    _kw_readonly: _ => alias(token(prec(1, /readonly/i)), "readonly"),
    _kw_writeonly: _ => alias(token(prec(1, /writeonly/i)), "writeonly"),
    _kw_virtual: _ => alias(token(prec(1, /virtual/i)), "virtual"),
    _kw_abstract: _ => alias(token(prec(1, /abstract/i)), "abstract"),
    _kw_sealed: _ => alias(token(prec(1, /sealed/i)), "sealed"),
    _kw_override: _ => alias(token(prec(1, /override/i)), "override"),
    _kw_overload: _ => alias(token(prec(1, /overload/i)), "overload"),
    _kw_unsafe: _ => alias(token(prec(1, /unsafe/i)), "unsafe"),
    _kw_reintroduce: _ => alias(token(prec(1, /reintroduce/i)), "reintroduce"),
    _kw_static: _ => alias(token(prec(1, /static/i)), "static"),
    _kw_stdcall: _ => alias(token(prec(1, /stdcall/i)), "stdcall"),
    _kw_external: _ => alias(token(prec(1, /external/i)), "external"),
    _kw_delayed: _ => alias(token(prec(1, /delayed/i)), "delayed"),
    _kw_forward: _ => alias(token(prec(1, /forward/i)), "forward"),
    _kw_name: _ => alias(token(prec(1, /name/i)), "name"),
    _kw_cdecl: _ => alias(token(prec(1, /cdecl/i)), "cdecl"),
    _kw_register: _ => alias(token(prec(1, /register/i)), "register"),
    _kw_pascal: _ => alias(token(prec(1, /pascal/i)), "pascal"),
    _kw_winapi: _ => alias(token(prec(1, /winapi/i)), "winapi"),
    _kw_noreturn: _ => alias(token(prec(1, /noreturn/i)), "noreturn"),
    _kw_safecall: _ => alias(token(prec(1, /safecall/i)), "safecall"),
    _kw_inline: _ => alias(token(prec(1, /inline/i)), "inline"),
    _kw_deprecated: _ => alias(token(prec(1, /deprecated/i)), "deprecated"),
    _kw_platform: _ => alias(token(prec(1, /platform/i)), "platform"),
    _kw_out: _ => alias(token(prec(1, /out/i)), "out"),
    _kw_array: _ => alias(token(prec(1, /array/i)), "array"),
    _kw_file: _ => alias(token(prec(1, /file/i)), "file"),
    _kw_string: _ => alias(token(prec(1, /string/i)), "string"),
    _kw_set: _ => alias(token(prec(1, /set/i)), "set"),
    _kw_inherited: _ => alias(token(prec(1, /inherited/i)), "inherited"),
    _kw_raise: _ => alias(token(prec(1, /raise/i)), "raise"),
    _kw_exit: _ => alias(token(prec(1, /exit/i)), "exit"),
    _kw_break: _ => alias(token(prec(1, /break/i)), "break"),
    _kw_continue: _ => alias(token(prec(1, /continue/i)), "continue"),
    _kw_reference: _ => alias(token(prec(1, /reference/i)), "reference"),
    _kw_object: _ => alias(token(prec(1, /object/i)), "object"),
    _kw_strict: _ => alias(token(prec(1, /strict/i)), "strict"),
    _kw_absolute: _ => alias(token(prec(1, /absolute/i)), "absolute"),
    _kw_dynamic: _ => alias(token(prec(1, /dynamic/i)), "dynamic"),
    _kw_final: _ => alias(token(prec(1, /final/i)), "final"),
    _kw_message: _ => alias(token(prec(1, /message/i)), "message"),
    _kw_experimental: _ => alias(token(prec(1, /experimental/i)), "experimental")
  }
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