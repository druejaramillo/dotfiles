package main

import (
	"bytes"
	"go/ast"
	"go/format"
	"go/token"
	"strconv"
)

func findGoRuleMatches(f goSource, r *Report, lines map[string]map[int]bool) {
	boolShadowed := goBoolIsShadowed(f)
	ast.Inspect(f.tree, func(n ast.Node) bool {
		switch node := n.(type) {
		case *ast.BinaryExpr:
			// SCBench: bool-comparison. Go's == true/false operands must be boolean.
			if (node.Op == token.EQL || node.Op == token.NEQ) && (isGoBool(node.X) || isGoBool(node.Y)) {
				addGoRule(f, r, lines, "bool-comparison", "comparison with true/false can use the boolean directly", node.Pos(), node.End())
			}
			if (node.Op == token.LAND && (goIdentNamed(node.X, "true") || goIdentNamed(node.Y, "true"))) ||
				(node.Op == token.LOR && (goIdentNamed(node.X, "false") || goIdentNamed(node.Y, "false"))) {
				addGoRule(f, r, lines, "boolean-identity", "identity boolean operand can be omitted", node.Pos(), node.End())
			}
			if node.Op == token.ADD && (goEmptyString(node.X) || goEmptyString(node.Y)) {
				addGoRule(f, r, lines, "empty-string-concat", "empty string concatenation does not change the value", node.Pos(), node.End())
			}
			if (node.Op == token.ADD && (goIntLiteral(node.X, "0") || goIntLiteral(node.Y, "0"))) ||
				(node.Op == token.SUB && goIntLiteral(node.Y, "0")) ||
				(node.Op == token.MUL && (goIntLiteral(node.X, "1") || goIntLiteral(node.Y, "1"))) {
				addGoRule(f, r, lines, "numeric-identity", "identity arithmetic operand can be omitted", node.Pos(), node.End())
			}
		case *ast.IfStmt:
			checkGoIfRules(f, node, r, lines, boolShadowed)
		case *ast.CallExpr:
			// SCBench: pointless-lambda-call, only side-effect-free wrapper shape.
			lit, ok := node.Fun.(*ast.FuncLit)
			if ok && lit.Type.Params != nil && len(lit.Type.Params.List) == 0 && len(node.Args) == 0 && len(lit.Body.List) == 1 {
				if ret, ok := lit.Body.List[0].(*ast.ReturnStmt); ok && len(ret.Results) == 1 {
					addGoRule(f, r, lines, "pointless-lambda-call", "immediately invoked expression wrapper", node.Pos(), node.End())
				}
			}
		case *ast.AssignStmt:
			// Go-specific: self-assignment is an expression-level no-op.
			if node.Tok == token.ASSIGN && len(node.Lhs) == 1 && len(node.Rhs) == 1 {
				left, lok := node.Lhs[0].(*ast.Ident)
				right, rok := node.Rhs[0].(*ast.Ident)
				if lok && rok && left.Name == right.Name {
					addGoRule(f, r, lines, "self-assignment", "assignment to the same identifier", node.Pos(), node.End())
				}
			}
		case *ast.ForStmt:
			checkGoFinalContinue(f, node.Body, r, lines)
		case *ast.RangeStmt:
			checkGoFinalContinue(f, node.Body, r, lines)
		case *ast.BlockStmt:
			checkGoAdjacentStatements(f, node.List, r, lines)
		}
		return true
	})
}

func checkGoIfRules(f goSource, node *ast.IfStmt, r *Report, lines map[string]map[int]bool, boolShadowed bool) {
	// SCBench: pointless-bool-cast / redundant-bool-in-condition.
	if !boolShadowed {
		ast.Inspect(node.Cond, func(n ast.Node) bool {
			if call, ok := n.(*ast.CallExpr); ok && len(call.Args) == 1 && !call.Ellipsis.IsValid() {
				if id, ok := call.Fun.(*ast.Ident); ok && id.Name == "bool" {
					addGoRule(f, r, lines, "pointless-bool-cast", "bool conversion is redundant in an if condition", call.Pos(), call.End())
				}
			}
			return true
		})
	}
	if node.Init != nil {
		return
	}
	if next, ok := node.Else.(*ast.IfStmt); ok && next.Init == nil && goPureExpr(node.Cond) && goSameExpr(f, node.Cond, next.Cond) {
		// SCBench: duplicated-if-condition. Only flag pure repeated conditions.
		addGoRule(f, r, lines, "duplicated-if-condition", "else-if repeats the same pure condition", next.If, next.Cond.End())
	}
	if node.Else != nil {
		if other, ok := node.Else.(*ast.BlockStmt); ok {
			thenValue, thenOK := goSingleReturn(node.Body)
			elseValue, elseOK := goSingleReturn(other)
			if thenOK && elseOK {
				if cmp, ok := node.Cond.(*ast.BinaryExpr); ok && goOrderedComparison(cmp.Op) {
					if a, ok := cmp.X.(*ast.Ident); ok {
						if b, ok := cmp.Y.(*ast.Ident); ok && a.Name != b.Name && goOppositeOperands(f, cmp, thenValue, elseValue) {
							addGoRule(f, r, lines, "manual-min-max-return", "consider returning min/max directly (Go 1.21+)", node.Pos(), node.End())
						}
					}
				}
				if isGoBool(thenValue) && isGoBool(elseValue) && !goSameExpr(f, thenValue, elseValue) {
					// SCBench: boolean-return-if-else.
					addGoRule(f, r, lines, "boolean-return-if-else", "return the condition (or its negation) directly", node.Pos(), node.End())
				} else if goPureExpr(node.Cond) && goSameExpr(f, thenValue, elseValue) {
					// SCBench: redundant-guard-same-return.
					addGoRule(f, r, lines, "identical-return-branches", "both branches return the same expression", node.Pos(), node.End())
				}
			}
			if len(node.Body.List) == 0 {
				// SCBench: if-pass-else-action. Keep the condition's evaluation.
				addGoRule(f, r, lines, "empty-if-else", "invert condition and remove empty branch", node.Pos(), node.Body.End())
			}
			if goManualMinMax(f, node, other) {
				// SCBench: manual-min-max. min/max are Go builtins since Go 1.21.
				addGoRule(f, r, lines, "manual-min-max", "choose with the Go min/max builtin instead of assignment branches (Go 1.21+)", node.Pos(), node.End())
			}
		}
		return
	}
	if len(node.Body.List) == 1 {
		if nested, ok := node.Body.List[0].(*ast.IfStmt); ok && nested.Init == nil && nested.Else == nil {
			// SCBench: nested-if-no-else. Go && short-circuits as nested if does.
			addGoRule(f, r, lines, "nested-if-no-else", "combine nested guards with &&", nested.If, nested.Cond.End())
		}
	}
}

func checkGoFinalContinue(f goSource, body *ast.BlockStmt, r *Report, lines map[string]map[int]bool) {
	if len(body.List) == 0 {
		return
	}
	last, ok := body.List[len(body.List)-1].(*ast.BranchStmt)
	if ok && last.Tok == token.CONTINUE && last.Label == nil {
		// SCBench: redundant-continue, but only directly at the end of a loop.
		addGoRule(f, r, lines, "redundant-continue", "continue at end of loop body does nothing", last.Pos(), last.End())
	}
}

func checkGoAdjacentStatements(f goSource, list []ast.Stmt, r *Report, lines map[string]map[int]bool) {
	for i := 0; i+1 < len(list); i++ {
		first, a := list[i].(*ast.IfStmt)
		second, b := list[i+1].(*ast.IfStmt)
		if a && b && first.Init == nil && second.Init == nil && first.Else == nil && second.Else == nil {
			if goOnlyContinue(first.Body) && goOnlyContinue(second.Body) {
				// SCBench: repeated-if-continue.
				addGoRule(f, r, lines, "repeated-if-continue", "combine adjacent continue guards with ||", second.Pos(), second.Body.End())
			}
			x, xOK := goSingleReturn(first.Body)
			y, yOK := goSingleReturn(second.Body)
			if xOK && yOK && goSameExpr(f, x, y) {
				// SCBench: repeated-if-return-error, limited to same return value.
				addGoRule(f, r, lines, "repeated-if-return", "combine adjacent identical-return guards with ||", second.Pos(), second.Body.End())
			}
		}
		if a && first.Init == nil && first.Else == nil {
			x, ok := goSingleReturn(first.Body)
			next, nextOK := list[i+1].(*ast.ReturnStmt)
			if ok && nextOK && len(next.Results) == 1 && goPureExpr(first.Cond) && goSameExpr(f, x, next.Results[0]) {
				// SCBench: redundant-guard-same-return. Dropping an impure condition would change behavior.
				addGoRule(f, r, lines, "redundant-guard-same-return", "guard and fallthrough return the same expression", first.Pos(), first.Body.End())
			}
			if ok && nextOK && len(next.Results) == 1 && isGoBool(x) && isGoBool(next.Results[0]) && !goSameExpr(f, x, next.Results[0]) {
				// SCBench: verbose-and-return / verbose-or-return. An impure condition is still evaluated once.
				addGoRule(f, r, lines, "boolean-return-guard", "consider returning the condition (or its negation) directly", first.Pos(), next.End())
			}
			if goManualMinMaxReturnGuard(f, first, list[i+1]) {
				addGoRule(f, r, lines, "manual-min-max-return", "consider returning min/max directly (Go 1.21+)", first.Pos(), list[i+1].End())
			}
		}
		// SCBench: consecutive-append-calls. Go append preserves left-to-right
		// evaluation, but avoid changing when the later argument reads the slice.
		x, xOK := goAppendAssignment(list[i])
		y, yOK := goAppendAssignment(list[i+1])
		if xOK && yOK && x == y && !goAppendArgReadsIdentifier(list[i+1], x) {
			addGoRule(f, r, lines, "consecutive-append-calls", "combine adjacent append calls on the same slice", list[i+1].Pos(), list[i+1].End())
		}
	}
}

func goManualMinMaxReturnGuard(f goSource, branch *ast.IfStmt, next ast.Stmt) bool {
	cmp, ok := branch.Cond.(*ast.BinaryExpr)
	if !ok || !goOrderedComparison(cmp.Op) {
		return false
	}
	a, aOK := cmp.X.(*ast.Ident)
	b, bOK := cmp.Y.(*ast.Ident)
	if !aOK || !bOK || a.Name == b.Name {
		return false
	}
	then, thenOK := goSingleReturn(branch.Body)
	after, afterOK := next.(*ast.ReturnStmt)
	if !thenOK || !afterOK || len(after.Results) != 1 {
		return false
	}
	return goOppositeOperands(f, cmp, then, after.Results[0])
}

func goOrderedComparison(op token.Token) bool {
	return op == token.GTR || op == token.LSS || op == token.GEQ || op == token.LEQ
}

func goOppositeOperands(f goSource, cmp *ast.BinaryExpr, then, otherwise ast.Expr) bool {
	return goSameExpr(f, then, cmp.X) && goSameExpr(f, otherwise, cmp.Y) ||
		goSameExpr(f, then, cmp.Y) && goSameExpr(f, otherwise, cmp.X)
}

func goManualMinMax(f goSource, node *ast.IfStmt, other *ast.BlockStmt) bool {
	cmp, ok := node.Cond.(*ast.BinaryExpr)
	if !ok || !goOrderedComparison(cmp.Op) {
		return false
	}
	a, aOK := cmp.X.(*ast.Ident)
	b, bOK := cmp.Y.(*ast.Ident)
	if !aOK || !bOK || len(node.Body.List) != 1 || len(other.List) != 1 {
		return false
	}
	left, lOK := node.Body.List[0].(*ast.AssignStmt)
	right, rOK := other.List[0].(*ast.AssignStmt)
	if !lOK || !rOK || left.Tok != token.ASSIGN || right.Tok != token.ASSIGN || len(left.Lhs) != 1 || len(right.Lhs) != 1 || len(left.Rhs) != 1 || len(right.Rhs) != 1 {
		return false
	}
	target, tOK := left.Lhs[0].(*ast.Ident)
	otherTarget, oOK := right.Lhs[0].(*ast.Ident)
	if !tOK || !oOK || target.Name != otherTarget.Name || target.Name == a.Name || target.Name == b.Name {
		return false
	}
	return goOppositeOperands(f, cmp, left.Rhs[0], right.Rhs[0])
}

func goBoolIsShadowed(f goSource) bool {
	shadowed := false
	ast.Inspect(f.tree, func(n ast.Node) bool {
		if shadowed {
			return false
		}
		switch node := n.(type) {
		case *ast.AssignStmt:
			if node.Tok == token.DEFINE {
				for _, lhs := range node.Lhs {
					if id, ok := lhs.(*ast.Ident); ok && id.Name == "bool" {
						shadowed = true
					}
				}
			}
		case *ast.ValueSpec:
			for _, name := range node.Names {
				if name.Name == "bool" {
					shadowed = true
				}
			}
		case *ast.TypeSpec:
			if node.Name.Name == "bool" {
				shadowed = true
			}
		case *ast.FuncDecl:
			if node.Name.Name == "bool" {
				shadowed = true
			}
		case *ast.RangeStmt:
			if node.Tok == token.DEFINE {
				for _, entry := range []ast.Expr{node.Key, node.Value} {
					if id, ok := entry.(*ast.Ident); ok && id.Name == "bool" {
						shadowed = true
					}
				}
			}
		case *ast.Field:
			for _, name := range node.Names {
				if name.Name == "bool" {
					shadowed = true
				}
			}
		}
		return !shadowed
	})
	return shadowed
}

func goAppendAssignment(stmt ast.Stmt) (string, bool) {
	assign, ok := stmt.(*ast.AssignStmt)
	if !ok || assign.Tok != token.ASSIGN || len(assign.Lhs) != 1 || len(assign.Rhs) != 1 {
		return "", false
	}
	target, ok := assign.Lhs[0].(*ast.Ident)
	if !ok {
		return "", false
	}
	call, ok := assign.Rhs[0].(*ast.CallExpr)
	if !ok || len(call.Args) != 2 || call.Ellipsis.IsValid() {
		return "", false
	}
	fn, ok := call.Fun.(*ast.Ident)
	if !ok || fn.Name != "append" {
		return "", false
	}
	input, ok := call.Args[0].(*ast.Ident)
	return target.Name, ok && target.Name == input.Name
}

func goAppendArgReadsIdentifier(stmt ast.Stmt, name string) bool {
	assign := stmt.(*ast.AssignStmt)
	arg := assign.Rhs[0].(*ast.CallExpr).Args[1]
	found := false
	ast.Inspect(arg, func(n ast.Node) bool {
		if id, ok := n.(*ast.Ident); ok && id.Name == name {
			found = true
		}
		return !found
	})
	return found
}

func goOnlyContinue(body *ast.BlockStmt) bool {
	if len(body.List) != 1 {
		return false
	}
	branch, ok := body.List[0].(*ast.BranchStmt)
	return ok && branch.Tok == token.CONTINUE && branch.Label == nil
}

func goSingleReturn(body *ast.BlockStmt) (ast.Expr, bool) {
	if len(body.List) != 1 {
		return nil, false
	}
	ret, ok := body.List[0].(*ast.ReturnStmt)
	if !ok || len(ret.Results) != 1 {
		return nil, false
	}
	return ret.Results[0], true
}

func goIdentNamed(expr ast.Expr, name string) bool {
	id, ok := expr.(*ast.Ident)
	return ok && id.Name == name
}

func goEmptyString(expr ast.Expr) bool {
	lit, ok := expr.(*ast.BasicLit)
	if !ok || lit.Kind != token.STRING {
		return false
	}
	value, err := strconv.Unquote(lit.Value)
	return err == nil && value == ""
}

func goIntLiteral(expr ast.Expr, value string) bool {
	lit, ok := expr.(*ast.BasicLit)
	return ok && lit.Kind == token.INT && lit.Value == value
}

func isGoBool(expr ast.Expr) bool {
	id, ok := expr.(*ast.Ident)
	return ok && (id.Name == "true" || id.Name == "false")
}

func goPureExpr(expr ast.Expr) bool {
	pure := true
	ast.Inspect(expr, func(n ast.Node) bool {
		switch n.(type) {
		case *ast.CallExpr, *ast.IndexExpr, *ast.IndexListExpr, *ast.TypeAssertExpr, *ast.FuncLit, *ast.StarExpr:
			pure = false
			return false
		}
		return true
	})
	return pure
}

func goSameExpr(f goSource, x, y ast.Expr) bool {
	var a, b bytes.Buffer
	if format.Node(&a, f.fset, x) != nil || format.Node(&b, f.fset, y) != nil {
		return false
	}
	return a.String() == b.String()
}

func addGoRule(f goSource, r *Report, lines map[string]map[int]bool, rule, message string, start, end token.Pos) {
	first, last := f.line(start), f.line(end)
	if first <= 0 || last < first {
		return
	}
	markGoLines(lines, f, first, last)
	r.Findings = append(r.Findings, Finding{Kind: "rule", Rule: rule, File: f.path, Line: first, EndLine: last, Message: message})
}
