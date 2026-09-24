package main

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/scanner"
	"go/token"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

// goSource keeps authored source lines alongside the AST so scores use one denominator.
type goSource struct {
	path   string
	source []byte
	fset   *token.FileSet
	tree   *ast.File
	lines  map[int]bool
}

func discoverGoFiles(scope string, includeTests bool, r *Report) ([]string, error) {
	var files []string
	err := filepath.WalkDir(scope, func(path string, ent fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if ent.IsDir() {
			if path != scope && (strings.HasPrefix(ent.Name(), ".") || ent.Name() == "vendor" || ent.Name() == "node_modules" || ent.Name() == "testdata" || ent.Name() == "dist" || ent.Name() == "build") {
				r.Excluded["non-source directory"]++
				return filepath.SkipDir
			}
			return nil
		}
		if ent.Type()&os.ModeSymlink != 0 {
			r.Excluded["symlink"]++
			return nil
		}
		if filepath.Ext(path) == ".templ" {
			r.TemplFiles++
			return nil
		}
		if filepath.Ext(path) != ".go" {
			return nil
		}
		if strings.HasSuffix(path, "_templ.go") {
			r.Excluded["templ generated"]++
			return nil
		}
		if !includeTests && strings.HasSuffix(path, "_test.go") {
			r.Excluded["tests"]++
			return nil
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		if isGeneratedGoSource(data) {
			r.Excluded["generated"]++
			return nil
		}
		files = append(files, path)
		return nil
	})
	return files, err
}

func isGeneratedGoSource(source []byte) bool {
	// Go's generated-file convention requires both markers on the same comment line.
	lines := strings.SplitN(string(source), "\n", 25)
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "// Code generated ") && strings.HasSuffix(line, " DO NOT EDIT.") {
			return true
		}
	}
	return false
}

func parseGoFiles(root string, paths []string) ([]goSource, error) {
	result := make([]goSource, 0, len(paths))
	for _, path := range paths {
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, err
		}
		fset := token.NewFileSet()
		file, err := parser.ParseFile(fset, path, data, parser.AllErrors)
		if err != nil {
			return nil, fmt.Errorf("Go parse error in %s: %w", path, err)
		}
		rel, err := filepath.Rel(root, path)
		if err != nil {
			return nil, err
		}
		result = append(result, goSource{path: filepath.ToSlash(rel), source: data, fset: fset, tree: file, lines: goSourceLineNumbers(data)})
	}
	return result, nil
}

func goSourceLineNumbers(data []byte) map[int]bool {
	fset := token.NewFileSet()
	file := fset.AddFile("source", -1, len(data))
	var lex scanner.Scanner
	lex.Init(file, data, nil, scanner.ScanComments)
	lines := map[int]bool{}
	for {
		pos, tok, lit := lex.Scan()
		if tok == token.EOF {
			break
		}
		if tok == token.COMMENT || tok == token.SEMICOLON || tok == token.LBRACE || tok == token.RBRACE || tok == token.LPAREN || tok == token.RPAREN || tok == token.LBRACK || tok == token.RBRACK {
			continue
		}
		start := fset.Position(pos).Line
		end := start + strings.Count(lit, "\n")
		for n := start; n <= end; n++ {
			lines[n] = true
		}
	}
	return lines
}

func (f goSource) line(pos token.Pos) int { return f.fset.Position(pos).Line }

func (f goSource) countSLOC(start, end int) int {
	count := 0
	for n := start; n <= end; n++ {
		if f.lines[n] {
			count++
		}
	}
	return count
}

func markGoLines(dst map[string]map[int]bool, f goSource, start, end int) {
	if dst[f.path] == nil {
		dst[f.path] = map[int]bool{}
	}
	for n := start; n <= end; n++ {
		if f.lines[n] {
			dst[f.path][n] = true
		}
	}
}
