#include "tree_sitter/parser.h"
#include "tree_sitter/alloc.h"
#include "tree_sitter/array.h"
#include <wctype.h>

// Rename `delphi` below to match your grammar's `name` field in grammar.js
// (tree-sitter generates these symbol names as tree_sitter_<name>_external_scanner_*).

// iswpunct is not exported to the Wasm tree-sitter,
// so we implement an equivalent using only allowed symbols.
static bool custom_iswpunct(int32_t ch)
{
  if (ch < 0x21 || ch == 0x7F)
    return false; // control chars / DEL
  if (iswalnum(ch) || iswspace(ch))
    return false;
  return true;
}

enum TokenType
{
  MULTILINE_STRING,
  FLOAT_NO_DECIMAL,
  ASM_BLOCK
};

void *tree_sitter_delphi_external_scanner_create(void)
{
  return NULL; // no persistent state needed between calls
}

void tree_sitter_delphi_external_scanner_destroy(void *payload)
{
  // nothing to free
}

unsigned tree_sitter_delphi_external_scanner_serialize(void *payload, char *buffer)
{
  return 0; // no state to persist across edits
}

void tree_sitter_delphi_external_scanner_deserialize(void *payload, const char *buffer, unsigned length)
{
  // nothing to restore
}

bool tree_sitter_delphi_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols)
{
  if (!valid_symbols[MULTILINE_STRING] && !valid_symbols[FLOAT_NO_DECIMAL] &&
      !valid_symbols[ASM_BLOCK])
  {
    return false;
  }

  // Skip whitespace that just precedes the literal (harmless to treat as trivia).
  while (lexer->lookahead == ' ' || lexer->lookahead == '\t' ||
         lexer->lookahead == '\r' || lexer->lookahead == '\n')
  {
    lexer->advance(lexer, true);
  }

  if (valid_symbols[FLOAT_NO_DECIMAL] && iswdigit(lexer->lookahead))
  {
    do
    {
      lexer->advance(lexer, false);
    } while (iswdigit(lexer->lookahead));

    if (lexer->lookahead != '.')
      return false;

    lexer->advance(lexer, false);

    // If there is a second dot it's a range operator
    // If there is something else that a space or a
    if (!(custom_iswpunct(lexer->lookahead) || iswspace(lexer->lookahead)) || lexer->lookahead == '.')
    {
      return false;
    }

    lexer->mark_end(lexer);
    lexer->result_symbol = FLOAT_NO_DECIMAL;
    return true;
  }

  if (valid_symbols[ASM_BLOCK])
  {
    bool advanced_any = false;

    for (;;)
    {
      if (lexer->eof(lexer))
      {
        return false; // unterminated asm block
      }

      // Check for a whole-word "end" (case-insensitive) at this position.
      if (lexer->lookahead == 'e' || lexer->lookahead == 'E')
      {
        lexer->mark_end(lexer); // tentative end, right before "end"

        lexer->advance(lexer, false);
        int32_t c2 = lexer->lookahead;

        if (c2 == 'n' || c2 == 'N')
        {
          lexer->advance(lexer, false);
          int32_t c3 = lexer->lookahead;

          if (c3 == 'd' || c3 == 'D')
          {
            lexer->advance(lexer, false);
            int32_t after = lexer->lookahead;

            // Must not be followed by another identifier char (word boundary),
            // e.g. reject "ending" / "endian".
            bool is_ident_char = iswalnum(after) || after == '_';

            if (!is_ident_char)
            {
              if (!advanced_any)
              {
                // No real asm content consumed yet -> empty asm block,
                // let the normal "end" token handle it instead.
                return false;
              }
              lexer->result_symbol = ASM_BLOCK;
              return true; // mark_end was already set right before "end"
            }
          }
        }

        // Not a whole-word "end": just regular asm content, keep going.
        advanced_any = true;
        continue;
      }

      lexer->advance(lexer, false);
      advanced_any = true;
    }
  }

  if (valid_symbols[MULTILINE_STRING])
  {
    if (lexer->lookahead != '\'')
    {
      return false;
    }

    // Count the opening run of apostrophes. Delphi requires at least three.
    uint32_t open_quotes = 0;
    while (lexer->lookahead == '\'')
    {
      lexer->advance(lexer, false);
      open_quotes++;
    }
    if (open_quotes < 3)
    {
      return false; // this is a normal '...' string, not a multiline one
    }

    // Only whitespace is allowed between the opening quotes and the line break.
    while (lexer->lookahead == ' ' || lexer->lookahead == '\t')
    {
      lexer->advance(lexer, false);
    }
    if (lexer->lookahead == '\r')
    {
      lexer->advance(lexer, false);
    }
    if (lexer->lookahead != '\n')
    {
      return false; // stray text after the opener -> not a valid multiline string
    }
    lexer->advance(lexer, false); // consume the newline that starts the body

    bool at_line_start = true;

    for (;;)
    {
      if (lexer->eof(lexer))
      {
        return false; // unterminated multiline string
      }

      if (at_line_start)
      {
        // Leading indentation before a possible closing sequence.
        while (lexer->lookahead == ' ' || lexer->lookahead == '\t')
        {
          lexer->advance(lexer, false);
        }

        if (lexer->lookahead == '\'')
        {
          uint32_t close_quotes = 0;
          while (lexer->lookahead == '\'')
          {
            lexer->advance(lexer, false);
            close_quotes++;
          }

          if (close_quotes >= open_quotes)
          {
            // Found the closer: end the token right here.
            lexer->mark_end(lexer);
            lexer->result_symbol = MULTILINE_STRING;
            return true;
          }

          // Not enough quotes to close -> they're literal content, keep going.
          at_line_start = false;
          continue;
        }

        at_line_start = false;
      }

      if (lexer->lookahead == '\n')
      {
        lexer->advance(lexer, false);
        at_line_start = true;
        continue;
      }

      lexer->advance(lexer, false);
    }

    return false;
  }
}