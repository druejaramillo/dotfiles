package main

import (
	"go/ast"
	"math"
	"sort"
)

// HalsteadMetrics counts Go callable operators and operands. Volume is not additive.
type HalsteadMetrics struct {
	DistinctOperators int     `json:"distinct_operators"`
	DistinctOperands  int     `json:"distinct_operands"`
	TotalOperators    int     `json:"total_operators"`
	TotalOperands     int     `json:"total_operands"`
	Vocabulary        int     `json:"vocabulary"`
	Length            int     `json:"length"`
	EstimatedLength   float64 `json:"estimated_length"`
	Volume            float64 `json:"volume"`
	Difficulty        float64 `json:"difficulty"`
	Effort            float64 `json:"effort"`
}

// CallableMetric attaches MI and Halstead values to an authored Go callable.
type CallableMetric struct {
	Name                 string          `json:"name"`
	File                 string          `json:"file"`
	Line                 int             `json:"line"`
	EndLine              int             `json:"end_line"`
	CC                   int             `json:"cc"`
	SLOC                 int             `json:"sloc"`
	Mass                 float64         `json:"mass"`
	MaintainabilityIndex *float64        `json:"maintainability_index"`
	Halstead             HalsteadMetrics `json:"halstead"`
}

// MaintainabilitySummary summarizes per-callable MI without inventing a project MI.
type MaintainabilitySummary struct {
	Count  int     `json:"count"`
	Min    float64 `json:"min"`
	Median float64 `json:"median"`
}

type halsteadCounts struct {
	operators map[string]int
	operands  map[string]int
}

func newHalsteadCounts() halsteadCounts {
	return halsteadCounts{operators: map[string]int{}, operands: map[string]int{}}
}

func (h *halsteadCounts) merge(other halsteadCounts) {
	for op, count := range other.operators {
		h.operators[op] += count
	}
	for operand, count := range other.operands {
		h.operands[operand] += count
	}
}

func (h halsteadCounts) metrics() HalsteadMetrics {
	r := HalsteadMetrics{DistinctOperators: len(h.operators), DistinctOperands: len(h.operands)}
	for _, n := range h.operators {
		r.TotalOperators += n
	}
	for _, n := range h.operands {
		r.TotalOperands += n
	}
	r.Vocabulary = r.DistinctOperators + r.DistinctOperands
	r.Length = r.TotalOperators + r.TotalOperands
	if r.Vocabulary > 1 {
		r.Volume = float64(r.Length) * math.Log2(float64(r.Vocabulary))
	}
	if r.DistinctOperands > 0 {
		r.Difficulty = float64(r.DistinctOperators) / 2 * float64(r.TotalOperands) / float64(r.DistinctOperands)
	}
	r.Effort = r.Difficulty * r.Volume
	for _, n := range []int{r.DistinctOperators, r.DistinctOperands} {
		if n > 0 {
			r.EstimatedLength += float64(n) * math.Log2(float64(n))
		}
	}
	return r
}

// calculateGoMaintainabilityIndex uses the 0-100 Visual Studio derivative:
// max(0, (171 - 5.2 ln(volume) - 0.23 CC - 16.2 ln(SLOC)) * 100 / 171).
func calculateGoMaintainabilityIndex(volume float64, cc, sloc int) *float64 {
	if volume <= 0 || sloc <= 0 {
		return nil
	}
	value := (171 - 5.2*math.Log(volume) - 0.23*float64(cc) - 16.2*math.Log(float64(sloc))) * 100 / 171
	value = math.Max(0, math.Min(100, value))
	return &value
}

func summarizeGoMaintainability(callables []CallableMetric) *MaintainabilitySummary {
	var values []float64
	for _, callable := range callables {
		if callable.MaintainabilityIndex != nil {
			values = append(values, *callable.MaintainabilityIndex)
		}
	}
	if len(values) == 0 {
		return nil
	}
	sort.Float64s(values)
	mid := len(values) / 2
	median := values[mid]
	if len(values)%2 == 0 {
		median = (values[mid-1] + values[mid]) / 2
	}
	return &MaintainabilitySummary{Count: len(values), Min: values[0], Median: median}
}

// countGoCallableHalstead excludes nested closures: each closure is measured once.
func countGoCallableHalstead(root ast.Node) halsteadCounts {
	h := newHalsteadCounts()
	ast.Inspect(root, func(n ast.Node) bool {
		if n == nil {
			return false
		}
		if n != root {
			if _, nested := n.(*ast.FuncLit); nested {
				return false
			}
		}
		switch node := n.(type) {
		case *ast.Ident:
			if node.Name != "_" {
				h.operands[node.Name]++
			}
		case *ast.BasicLit:
			h.operands[node.Value]++
		case *ast.FuncDecl, *ast.FuncLit:
			h.operators["func"]++
		case *ast.BinaryExpr:
			h.operators[node.Op.String()]++
		case *ast.UnaryExpr:
			h.operators[node.Op.String()]++
		case *ast.StarExpr:
			h.operators["*"]++
		case *ast.AssignStmt:
			h.operators[node.Tok.String()]++
		case *ast.IncDecStmt:
			h.operators[node.Tok.String()]++
		case *ast.SendStmt:
			h.operators["<-"]++
		case *ast.CallExpr:
			h.operators["call"]++
			if node.Ellipsis.IsValid() {
				h.operators["..."]++
			}
		case *ast.SelectorExpr:
			h.operators["."]++
		case *ast.IndexExpr, *ast.IndexListExpr:
			h.operators["index"]++
		case *ast.SliceExpr:
			h.operators["slice"]++
		case *ast.TypeAssertExpr:
			h.operators["type-assert"]++
		case *ast.CompositeLit:
			h.operators["composite"]++
		case *ast.KeyValueExpr:
			h.operators[":"]++
		case *ast.Ellipsis:
			h.operators["..."]++
		case *ast.IfStmt:
			h.operators["if"]++
			if node.Else != nil {
				h.operators["else"]++
			}
		case *ast.ForStmt:
			h.operators["for"]++
		case *ast.RangeStmt:
			h.operators["range"]++
			if node.Tok.IsOperator() {
				h.operators[node.Tok.String()]++
			}
		case *ast.SwitchStmt, *ast.TypeSwitchStmt:
			h.operators["switch"]++
		case *ast.SelectStmt:
			h.operators["select"]++
		case *ast.CaseClause:
			if node.List == nil {
				h.operators["default"]++
			} else {
				h.operators["case"]++
			}
		case *ast.CommClause:
			if node.Comm == nil {
				h.operators["default"]++
			} else {
				h.operators["case"]++
			}
		case *ast.GoStmt:
			h.operators["go"]++
		case *ast.DeferStmt:
			h.operators["defer"]++
		case *ast.ReturnStmt:
			h.operators["return"]++
		case *ast.BranchStmt:
			h.operators[node.Tok.String()]++
		case *ast.ArrayType:
			h.operators["array-or-slice"]++
		case *ast.MapType:
			h.operators["map"]++
		case *ast.ChanType:
			h.operators["chan"]++
		case *ast.StructType:
			h.operators["struct"]++
		case *ast.InterfaceType:
			h.operators["interface"]++
		case *ast.GenDecl:
			h.operators[node.Tok.String()]++
		}
		return true
	})
	return h
}
