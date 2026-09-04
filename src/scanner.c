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
  ASM_BLOCK,
  AUTOMATIC_SEMICOLON
};

static inline void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

// ---------------------------------------------------------------------
// Helpers for AUTOMATIC_SEMICOLON — must be defined (or at least
// forward-declared) before tree_sitter_delphi_external_scanner_scan,
// since C has no implicit function declarations post-C99/pedantic builds.
// ---------------------------------------------------------------------

static bool skip_whitespace_and_comments(TSLexer *lexer)
{
  for (;;)
  {
    if (iswspace(lexer->lookahead))
    {
      skip(lexer);
      continue;
    }

    // Line comment: // ...
    if (lexer->lookahead == '/')
    {
      skip(lexer);
      if (lexer->lookahead != '/')
        return false; // was just '/', not a comment
      while (lexer->lookahead != '\n' && lexer->lookahead != 0)
      {
        skip(lexer);
      }
      continue;
    }

    // Brace comment: { ... }
    if (lexer->lookahead == '{')
    {
      skip(lexer);
      while (lexer->lookahead != '}')
      {
        if (lexer->lookahead == 0)
          return false; // unterminated
        skip(lexer);
      }
      skip(lexer);
      continue;
    }

    // Paren-star comment: (* ... *)
    if (lexer->lookahead == '(')
    {
      skip(lexer);
      if (lexer->lookahead != '*')
        return false; // was just '(', not a comment
      skip(lexer);
      for (;;)
      {
        if (lexer->lookahead == 0)
          return false; // unterminated
        if (lexer->lookahead == '*')
        {
          skip(lexer);
          if (lexer->lookahead == ')')
          {
            skip(lexer);
            break;
          }
          continue;
        }
        skip(lexer);
      }
      continue;
    }

    return true; // reached real content
  }
}

static bool scan_automatic_semicolon(TSLexer *lexer)
{
  lexer->result_symbol = AUTOMATIC_SEMICOLON;
  lexer->mark_end(lexer); // zero-width token, anchored before trailing ws/comments

  if (!skip_whitespace_and_comments(lexer))
  {
    return false;
  }

  if (lexer->lookahead == 0)
  {
    return true; // EOF also permits an implicit ';'
  }

  if (lexer->is_at_included_range_start(lexer))
  {
    return true;
  }

  // Only these keywords may legally follow a statement without ';':
  // end, else, except, finally, until
  switch (towlower(lexer->lookahead))
  {
  case 'e':
    skip(lexer);
    switch (towlower(lexer->lookahead))
    {
    case 'n': // end
      skip(lexer);
      if (towlower(lexer->lookahead) != 'd')
        return false;
      skip(lexer);
      break;
    case 'l': // else
      skip(lexer);
      if (towlower(lexer->lookahead) != 's')
        return false;
      skip(lexer);
      if (towlower(lexer->lookahead) != 'e')
        return false;
      skip(lexer);
      break;
    case 'x': // except
      skip(lexer);
      for (unsigned i = 0; i < 4; i++)
      {
        if (towlower(lexer->lookahead) != "cept"[i])
          return false;
        skip(lexer);
      }
      break;
    default:
      return false;
    }
    break;

  case 'u': // until
    skip(lexer);
    for (unsigned i = 0; i < 4; i++)
    {
      if (towlower(lexer->lookahead) != "ntil"[i])
        return false;
      skip(lexer);
    }
    break;

  case 'f': // finally
    skip(lexer);
    for (unsigned i = 0; i < 6; i++)
    {
      if (towlower(lexer->lookahead) != "inally"[i])
        return false;
      skip(lexer);
    }
    break;

  default:
    return false;
  }

  // Reject prefix matches like `endless` or `finallyValue`.
  if (iswalnum(lexer->lookahead) || lexer->lookahead == '_')
  {
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------
// Required scanner lifecycle functions
// ---------------------------------------------------------------------

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
      !valid_symbols[ASM_BLOCK] && !valid_symbols[AUTOMATIC_SEMICOLON])
  {
    return false;
  }

  if (valid_symbols[AUTOMATIC_SEMICOLON])
  {
    return scan_automatic_semicolon(lexer);
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