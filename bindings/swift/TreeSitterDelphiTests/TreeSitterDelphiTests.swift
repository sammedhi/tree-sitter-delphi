import XCTest
import SwiftTreeSitter
import TreeSitterDelphi

final class TreeSitterDelphiTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_delphi())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Delphi grammar")
    }
}
