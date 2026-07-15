#include "tree_sitter/parser.h"
#include "tree_sitter/alloc.h"
#include "tree_sitter/array.h"

// Rename `delphi` below to match your grammar's `name` field in grammar.js
// (tree-sitter generates these symbol names as tree_sitter_<name>_external_scanner_*).

enum TokenType {
  MULTILINE_STRING,
};

void *tree_sitter_delphi_external_scanner_create(void) {
  return NULL; // no persistent state needed between calls
}

void tree_sitter_delphi_external_scanner_destroy(void *payload) {
  // nothing to free
}

unsigned tree_sitter_delphi_external_scanner_serialize(void *payload, char *buffer) {
  return 0; // no state to persist across edits
}

void tree_sitter_delphi_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  // nothing to restore
}

bool tree_sitter_delphi_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  if (!valid_symbols[MULTILINE_STRING]) {
    return false;
  }

  // Skip whitespace that just precedes the literal (harmless to treat as trivia).
  while (lexer->lookahead == ' ' || lexer->lookahead == '\t' ||
         lexer->lookahead == '\r' || lexer->lookahead == '\n') {
    lexer->advance(lexer, true);
  }

  if (lexer->lookahead != '\'') {
    return false;
  }
 
  // Count the opening run of apostrophes. Delphi requires at least three.
  uint32_t open_quotes = 0;
  while (lexer->lookahead == '\'') {
    lexer->advance(lexer, false);
    open_quotes++;
  }
  if (open_quotes < 3) {
    return false; // this is a normal '...' string, not a multiline one
  }

  // Only whitespace is allowed between the opening quotes and the line break.
  while (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
    lexer->advance(lexer, false);
  }
  if (lexer->lookahead == '\r') {
    lexer->advance(lexer, false);
  }
  if (lexer->lookahead != '\n') {
    return false; // stray text after the opener -> not a valid multiline string
  }
  lexer->advance(lexer, false); // consume the newline that starts the body

  bool at_line_start = true;

  for (;;) {
    if (lexer->eof(lexer)) {
      return false; // unterminated multiline string
    }

    if (at_line_start) {
      // Leading indentation before a possible closing sequence.
      while (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
        lexer->advance(lexer, false);
      }

      if (lexer->lookahead == '\'') {
        uint32_t close_quotes = 0;
        while (lexer->lookahead == '\'') {
          lexer->advance(lexer, false);
          close_quotes++;
        }

        if (close_quotes >= open_quotes) {
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

    if (lexer->lookahead == '\n') {
      lexer->advance(lexer, false);
      at_line_start = true;
      continue;
    }

    lexer->advance(lexer, false);
  }
}