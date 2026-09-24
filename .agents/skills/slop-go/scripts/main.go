package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"sort"
)

// Finding identifies a line-level contributor to a Go verbosity or erosion score.
type Finding struct {
	Kind    string   `json:"kind"`
	Rule    string   `json:"rule,omitempty"`
	File    string   `json:"file"`
	Line    int      `json:"line"`
	EndLine int      `json:"end_line"`
	Message string   `json:"message"`
	Related []string `json:"related,omitempty"`
	CC      int      `json:"cc,omitempty"`
	SLOC    int      `json:"sloc,omitempty"`
	Mass    float64  `json:"mass,omitempty"`
}

// Report describes the exact scope, line coverage and Go code-health measurements.
type Report struct {
	Version         string                  `json:"version"`
	Root            string                  `json:"root"`
	Scope           string                  `json:"scope"`
	FilesScanned    int                     `json:"files_scanned"`
	Excluded        map[string]int          `json:"excluded"`
	TemplFiles      int                     `json:"templ_files_not_scored"`
	SourceLines     int                     `json:"source_lines"`
	FlaggedLines    int                     `json:"flagged_lines"`
	CloneLines      int                     `json:"clone_lines"`
	RuleLines       int                     `json:"rule_lines"`
	Verbosity       float64                 `json:"verbosity"`
	TotalFunctions  int                     `json:"total_functions"`
	HighCCFunctions int                     `json:"high_cc_functions"`
	TotalMass       float64                 `json:"total_mass"`
	HighCCMass      float64                 `json:"high_cc_mass"`
	Erosion         float64                 `json:"erosion"`
	Maintainability *MaintainabilitySummary `json:"maintainability"`
	Halstead        HalsteadMetrics         `json:"halstead"`
	Callables       []CallableMetric        `json:"callables"`
	Findings        []Finding               `json:"findings"`
}

func main() {
	rootFlag := flag.String("root", ".", "project root (directory)")
	scopeFlag := flag.String("scope", ".", "file or directory inside the project root")
	testsFlag := flag.Bool("include-tests", false, "include _test.go files in both scores")
	jsonFlag := flag.Bool("json", false, "print the complete JSON report")
	topFlag := flag.Int("top", 12, "number of findings to display per kind in the human report")
	flag.Parse()
	if flag.NArg() != 0 || *topFlag < 0 {
		fmt.Fprintln(os.Stderr, "slop-go: unexpected arguments or negative -top; see -help")
		os.Exit(2)
	}
	report, err := analyzeGoProject(*rootFlag, *scopeFlag, *testsFlag)
	if err != nil {
		fmt.Fprintln(os.Stderr, "slop-go:", err)
		os.Exit(2)
	}
	if *jsonFlag {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		if err := enc.Encode(report); err != nil {
			fmt.Fprintln(os.Stderr, "slop-go:", err)
			os.Exit(2)
		}
		return
	}
	printGoReport(report, *topFlag)
}

func analyzeGoProject(rootArg, scopeArg string, includeTests bool) (Report, error) {
	root, err := filepath.Abs(rootArg)
	if err != nil {
		return Report{}, err
	}
	root, err = filepath.EvalSymlinks(root)
	if err != nil {
		return Report{}, err
	}
	rootInfo, err := os.Stat(root)
	if err != nil {
		return Report{}, err
	}
	if !rootInfo.IsDir() {
		return Report{}, fmt.Errorf("root is not a directory: %s", root)
	}
	scope := scopeArg
	if !filepath.IsAbs(scope) {
		scope = filepath.Join(root, scope)
	}
	scope, err = filepath.EvalSymlinks(scope)
	if err != nil {
		return Report{}, err
	}
	rel, err := filepath.Rel(root, scope)
	if err != nil || rel == ".." || len(rel) >= 3 && rel[:3] == ".."+string(filepath.Separator) {
		return Report{}, fmt.Errorf("scope must be within project root: %s", scopeArg)
	}
	report := Report{Version: "slop-go/0.2", Root: root, Scope: rel, Excluded: map[string]int{}, Callables: []CallableMetric{}, Findings: []Finding{}}
	files, err := discoverGoFiles(scope, includeTests, &report)
	if err != nil {
		return Report{}, err
	}
	if len(files) == 0 {
		return Report{}, fmt.Errorf("no authored Go files under %s (excluded: %v)", rel, report.Excluded)
	}
	parsed, err := parseGoFiles(root, files)
	if err != nil {
		return Report{}, err
	}
	report.FilesScanned = len(parsed)
	ruleLines := map[string]map[int]bool{}
	cloneLines := map[string]map[int]bool{}
	halsteadCounts := newHalsteadCounts()
	for _, file := range parsed {
		report.SourceLines += len(file.lines)
		findGoFunctionMass(file, &report, &halsteadCounts)
		findGoRuleMatches(file, &report, ruleLines)
	}
	report.Halstead = halsteadCounts.metrics()
	report.Maintainability = summarizeGoMaintainability(report.Callables)
	findGoClones(parsed, &report, cloneLines)
	flagged := map[string]map[int]bool{}
	for _, file := range parsed {
		report.RuleLines += len(ruleLines[file.path])
		report.CloneLines += len(cloneLines[file.path])
		flagged[file.path] = map[int]bool{}
		for n := range ruleLines[file.path] {
			flagged[file.path][n] = true
		}
		for n := range cloneLines[file.path] {
			flagged[file.path][n] = true
		}
		report.FlaggedLines += len(flagged[file.path])
	}
	report.Verbosity = float64(report.FlaggedLines) / float64(report.SourceLines)
	if report.TotalMass > 0 {
		report.Erosion = report.HighCCMass / report.TotalMass
	}
	sort.Slice(report.Findings, func(i, j int) bool {
		a, b := report.Findings[i], report.Findings[j]
		if a.Kind != b.Kind {
			return a.Kind < b.Kind
		}
		if a.Kind == "erosion" && a.Mass != b.Mass {
			return a.Mass > b.Mass
		}
		if a.File != b.File {
			return a.File < b.File
		}
		if a.Line != b.Line {
			return a.Line < b.Line
		}
		return a.Rule < b.Rule
	})
	return report, nil
}

func printGoReport(r Report, top int) {
	fmt.Printf("Slop Go — %s (root: %s)\n", r.Scope, r.Root)
	fmt.Printf("Authored Go: %d files, %d SLOC, %d callables; excluded: %v; .templ not scored: %d\n", r.FilesScanned, r.SourceLines, r.TotalFunctions, r.Excluded, r.TemplFiles)
	fmt.Printf("Verbosity: %.1f%% (%d/%d union lines; clones: %d, rules: %d, overlap counted once)\n", 100*r.Verbosity, r.FlaggedLines, r.SourceLines, r.CloneLines, r.RuleLines)
	fmt.Printf("Erosion: %.1f%% (mass %.1f/%.1f at CC > 10; %d high-CC callables)\n", 100*r.Erosion, r.HighCCMass, r.TotalMass, r.HighCCFunctions)
	if r.Maintainability == nil {
		fmt.Println("MI (per callable, 0–100): unavailable — no callables with measurable volume")
	} else {
		fmt.Printf("MI (per callable, 0–100): median %.1f, lowest %.1f across %d callables\n", r.Maintainability.Median, r.Maintainability.Min, r.Maintainability.Count)
	}
	if r.TotalFunctions == 0 {
		fmt.Println("Halstead: unavailable — no measurable callables")
	} else {
		fmt.Printf("Halstead (callable tokens combined): operators %d distinct/%d total, operands %d distinct/%d total\n", r.Halstead.DistinctOperators, r.Halstead.TotalOperators, r.Halstead.DistinctOperands, r.Halstead.TotalOperands)
		fmt.Printf("  vocabulary %d, length %d, volume %.1f, difficulty %.1f, effort %.1f\n", r.Halstead.Vocabulary, r.Halstead.Length, r.Halstead.Volume, r.Halstead.Difficulty, r.Halstead.Effort)
	}
	printGoMetricSuspects(r.Callables, top)
	for _, kind := range []string{"erosion", "clone", "rule"} {
		fmt.Printf("\n%s suspects:\n", kind)
		n := 0
		for _, f := range r.Findings {
			if f.Kind != kind {
				continue
			}
			if n >= top {
				break
			}
			fmt.Printf("  %s:%d %s", f.File, f.Line, f.Message)
			if kind == "erosion" {
				fmt.Printf(" (CC %d, SLOC %d, mass %.1f)", f.CC, f.SLOC, f.Mass)
			}
			if len(f.Related) != 0 {
				fmt.Printf(" [also %v]", f.Related)
			}
			fmt.Println()
			n++
		}
		if n == 0 {
			fmt.Println("  none")
		}
	}
	fmt.Println("\nScores are review prompts, not build gates. Compare only identical scopes, exclusions and analyzer versions.")
}

func printGoMetricSuspects(callables []CallableMetric, top int) {
	byMI := append([]CallableMetric(nil), callables...)
	sort.Slice(byMI, func(i, j int) bool {
		a, b := byMI[i].MaintainabilityIndex, byMI[j].MaintainabilityIndex
		if a == nil {
			return false
		}
		if b == nil {
			return true
		}
		if *a != *b {
			return *a < *b
		}
		if byMI[i].File != byMI[j].File {
			return byMI[i].File < byMI[j].File
		}
		return byMI[i].Line < byMI[j].Line
	})
	fmt.Println("\nLowest MI callables (inspect before judging):")
	printed := 0
	for _, c := range byMI {
		if c.MaintainabilityIndex == nil || printed >= top {
			break
		}
		fmt.Printf("  %s:%d %s — MI %.1f, CC %d, SLOC %d, Halstead volume %.1f\n", c.File, c.Line, c.Name, *c.MaintainabilityIndex, c.CC, c.SLOC, c.Halstead.Volume)
		printed++
	}
	if printed == 0 {
		fmt.Println("  none")
	}
	byVolume := append([]CallableMetric(nil), callables...)
	sort.Slice(byVolume, func(i, j int) bool {
		if byVolume[i].Halstead.Volume != byVolume[j].Halstead.Volume {
			return byVolume[i].Halstead.Volume > byVolume[j].Halstead.Volume
		}
		if byVolume[i].File != byVolume[j].File {
			return byVolume[i].File < byVolume[j].File
		}
		return byVolume[i].Line < byVolume[j].Line
	})
	fmt.Println("\nLargest Halstead volumes (size signal, not a defect):")
	printed = 0
	for _, c := range byVolume {
		if printed >= top || c.Halstead.Volume == 0 {
			break
		}
		fmt.Printf("  %s:%d %s — volume %.1f, difficulty %.1f, effort %.1f\n", c.File, c.Line, c.Name, c.Halstead.Volume, c.Halstead.Difficulty, c.Halstead.Effort)
		printed++
	}
	if printed == 0 {
		fmt.Println("  none")
	}
}

func massForGoFunction(cc, sloc int) float64 { return float64(cc) * math.Sqrt(float64(sloc)) }
