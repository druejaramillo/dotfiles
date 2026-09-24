package main

import (
	"encoding/json"
	"math"
	"testing"
)

func TestGoHalsteadCountsAndMaintainabilityFormula(t *testing.T) {
	dir := t.TempDir()
	putGoFixture(t, dir, "calc.go", "package p\nfunc sum(x int) int { return x + 1 }\n")
	r, err := analyzeGoProject(dir, ".", false)
	if err != nil {
		t.Fatal(err)
	}
	if r.TotalFunctions != 1 || r.Maintainability == nil || len(r.Callables) != 1 {
		t.Fatalf("missing callable metrics: %+v", r)
	}
	h := r.Callables[0].Halstead
	// Operators: func, return, +. Operands: sum, x twice, int twice, 1.
	if h.DistinctOperators != 3 || h.TotalOperators != 3 || h.DistinctOperands != 4 || h.TotalOperands != 6 || h.Vocabulary != 7 || h.Length != 9 {
		t.Fatalf("unexpected Halstead counts: %+v", h)
	}
	volume := 9 * math.Log2(7)
	if math.Abs(h.Volume-volume) > 1e-10 || math.Abs(h.Difficulty-2.25) > 1e-10 || math.Abs(h.Effort-2.25*volume) > 1e-10 {
		t.Fatalf("unexpected derived Halstead values: %+v", h)
	}
	expectedMI := (171 - 5.2*math.Log(volume) - 0.23*1 - 16.2*math.Log(1)) * 100 / 171
	if mi := r.Callables[0].MaintainabilityIndex; mi == nil || math.Abs(*mi-expectedMI) > 1e-10 {
		t.Fatalf("unexpected MI: %v, expected %.10f", mi, expectedMI)
	}
	if r.Maintainability.Count != 1 || r.Maintainability.Min != *r.Callables[0].MaintainabilityIndex || r.Maintainability.Median != r.Maintainability.Min {
		t.Fatalf("unexpected MI distribution: %+v", r.Maintainability)
	}
	if r.Halstead != h {
		t.Fatalf("project counters differ from only callable: %+v != %+v", r.Halstead, h)
	}
	encoded, err := json.Marshal(r)
	if err != nil {
		t.Fatal(err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatal(err)
	}
	if _, ok := decoded["halstead"].(map[string]any); !ok {
		t.Fatalf("missing JSON Halstead: %s", encoded)
	}
}

func TestGoHalsteadProjectVocabularyIsUnionNotSummedVolumes(t *testing.T) {
	dir := t.TempDir()
	putGoFixture(t, dir, "f.go", `package p
func a(x int) int { return x + 1 }
func b(x int) int { return x + 2 }
`)
	r, err := analyzeGoProject(dir, ".", false)
	if err != nil {
		t.Fatal(err)
	}
	if r.Halstead.Length != r.Callables[0].Halstead.Length+r.Callables[1].Halstead.Length {
		t.Fatalf("length is not additive: %+v", r.Halstead)
	}
	if r.Halstead.Volume != float64(r.Halstead.Length)*math.Log2(float64(r.Halstead.Vocabulary)) {
		t.Fatalf("wrong combined vocabulary: %+v", r.Halstead)
	}
	if r.Halstead.DistinctOperators != 3 {
		t.Fatalf("operator vocab should be merged: %+v", r.Halstead)
	}
}

func TestGoHalsteadNestedClosuresMeasuredSeparately(t *testing.T) {
	dir := t.TempDir()
	putGoFixture(t, dir, "f.go", `package p
func outer() { func() { println("inside") }() }
`)
	r, err := analyzeGoProject(dir, ".", false)
	if err != nil {
		t.Fatal(err)
	}
	if len(r.Callables) != 2 {
		t.Fatalf("missing nested callable: %+v", r.Callables)
	}
	if r.Callables[0].Halstead.TotalOperands >= r.Callables[1].Halstead.TotalOperands {
		t.Fatalf("closure operands counted twice in outer: %+v", r.Callables)
	}
}

func TestGoMaintainabilityUnavailableRatherThanMisleadingZero(t *testing.T) {
	if calculateGoMaintainabilityIndex(0, 1, 2) != nil || calculateGoMaintainabilityIndex(8, 1, 0) != nil {
		t.Fatal("expected unavailable MI")
	}
	if mi := calculateGoMaintainabilityIndex(math.Exp(500), 40, 500); mi == nil || *mi != 0 {
		t.Fatalf("expected clamped MI zero, got %v", mi)
	}
	dir := t.TempDir()
	putGoFixture(t, dir, "f.go", "package p\nvar value = 3\n")
	r, err := analyzeGoProject(dir, ".", false)
	if err != nil {
		t.Fatal(err)
	}
	if r.Maintainability != nil || r.Halstead.Volume != 0 {
		t.Fatalf("no callable should not fabricate metrics: %+v", r)
	}
}
