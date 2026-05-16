package tree_sitter_delphi_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_delphi "github.com/tree-sitter/tree-sitter-delphi/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_delphi.Language())
	if language == nil {
		t.Errorf("Error loading Delphi grammar")
	}
}
