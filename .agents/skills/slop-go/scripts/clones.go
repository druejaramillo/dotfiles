package main

import (
	"bytes"
	"fmt"
	"go/ast"
	"go/format"
	"sort"
)

type goCloneWindow struct {
	source goSource
	start  int
	end    int
}

// findGoClones detects exact, gofmt-normalized adjacent AST statement pairs.
// Exact syntax favors precision; renamed-but-isomorphic clones are not measured.
func findGoClones(files []goSource, r *Report, lines map[string]map[int]bool) {
	groups := map[string][]goCloneWindow{}
	for _, file := range files {
		ast.Inspect(file.tree, func(n ast.Node) bool {
			block, ok := n.(*ast.BlockStmt)
			if !ok {
				return true
			}
			for i := 0; i+1 < len(block.List); i++ {
				start := file.line(block.List[i].Pos())
				end := file.line(block.List[i+1].End())
				if file.countSLOC(start, end) < 3 {
					continue
				}
				var text bytes.Buffer
				if format.Node(&text, file.fset, block.List[i]) != nil {
					continue
				}
				text.WriteByte(0)
				if format.Node(&text, file.fset, block.List[i+1]) != nil {
					continue
				}
				groups[text.String()] = append(groups[text.String()], goCloneWindow{file, start, end})
			}
			return true
		})
	}
	// Map iteration must not make the report nondeterministic.
	keys := make([]string, 0, len(groups))
	for key, group := range groups {
		if len(group) > 1 {
			keys = append(keys, key)
		}
	}
	sort.Strings(keys)
	for _, key := range keys {
		group := groups[key]
		sort.Slice(group, func(i, j int) bool {
			if group[i].source.path != group[j].source.path {
				return group[i].source.path < group[j].source.path
			}
			return group[i].start < group[j].start
		})
		related := make([]string, 0, len(group)-1)
		for _, hit := range group[1:] {
			related = append(related, fmt.Sprintf("%s:%d", hit.source.path, hit.start))
		}
		for _, hit := range group {
			markGoLines(lines, hit.source, hit.start, hit.end)
		}
		first := group[0]
		r.Findings = append(r.Findings, Finding{
			Kind: "clone", File: first.source.path, Line: first.start, EndLine: first.end,
			Message: fmt.Sprintf("exact repeated Go statement block (%d instances)", len(group)), Related: related,
		})
	}
}
