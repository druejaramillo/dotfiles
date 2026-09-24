package main

import (
	"go/ast"
	"go/token"
)

func findGoFunctionMass(f goSource, r *Report, allHalstead *halsteadCounts) {
	ast.Inspect(f.tree, func(n ast.Node) bool {
		switch fn := n.(type) {
		case *ast.FuncDecl:
			name := fn.Name.Name
			if fn.Recv != nil {
				name = "method " + name
			}
			addGoCallable(f, name, fn, fn.Pos(), fn.End(), fn.Body, r, allHalstead)
		case *ast.FuncLit:
			addGoCallable(f, "function literal", fn, fn.Pos(), fn.End(), fn.Body, r, allHalstead)
		}
		return true
	})
}

func addGoCallable(f goSource, name string, root ast.Node, start, end token.Pos, body *ast.BlockStmt, r *Report, allHalstead *halsteadCounts) {
	if body == nil {
		return
	}
	sloc := f.countSLOC(f.line(start), f.line(end))
	if sloc == 0 {
		return
	}
	cc := 1
	ast.Inspect(body, func(n ast.Node) bool {
		if _, nested := n.(*ast.FuncLit); nested {
			return false
		} // closure gets its own mass
		switch node := n.(type) {
		case *ast.IfStmt, *ast.ForStmt, *ast.RangeStmt:
			cc++
		case *ast.CaseClause:
			if node.List != nil {
				cc++
			}
		case *ast.CommClause:
			if node.Comm != nil {
				cc++
			}
		case *ast.BinaryExpr:
			if node.Op == token.LAND || node.Op == token.LOR {
				cc++
			}
		}
		return true
	})
	mass := massForGoFunction(cc, sloc)
	counts := countGoCallableHalstead(root)
	allHalstead.merge(counts)
	halstead := counts.metrics()
	r.Callables = append(r.Callables, CallableMetric{
		Name: name, File: f.path, Line: f.line(start), EndLine: f.line(end),
		CC: cc, SLOC: sloc, Mass: mass, Halstead: halstead,
		MaintainabilityIndex: calculateGoMaintainabilityIndex(halstead.Volume, cc, sloc),
	})
	r.TotalFunctions++
	r.TotalMass += mass
	if cc > 10 {
		r.HighCCFunctions++
		r.HighCCMass += mass
		r.Findings = append(r.Findings, Finding{
			Kind: "erosion", File: f.path, Line: f.line(start), EndLine: f.line(end),
			CC: cc, SLOC: sloc, Mass: mass, Message: name + " carries high complexity mass",
		})
	}
}
