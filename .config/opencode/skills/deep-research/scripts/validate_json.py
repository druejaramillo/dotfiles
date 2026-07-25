#!/usr/bin/env python3
"""Validate structured deep-research results against a fields.yaml schema."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import yaml

INTERNAL_KEYS = {"uncertain", "sources", "_source_file"}


def load_schema(path: Path) -> tuple[set[str], set[str]]:
    with path.open(encoding="utf-8") as file:
        data = yaml.safe_load(file) or {}

    categories = data.get("field_categories")
    if not isinstance(categories, list):
        raise ValueError("fields.yaml must contain a field_categories list")

    fields: set[str] = set()
    required: set[str] = set()
    for category in categories:
        if not isinstance(category, dict) or not isinstance(category.get("fields"), list):
            raise ValueError("each field category must contain a fields list")
        for field in category["fields"]:
            if not isinstance(field, dict) or not isinstance(field.get("name"), str):
                raise ValueError("each field must have a string name")
            name = field["name"]
            if name in fields:
                raise ValueError(f"duplicate field name: {name}")
            fields.add(name)
            if field.get("required", False):
                required.add(name)
    return fields, required


def flatten_fields(value: Any) -> set[str]:
    if not isinstance(value, dict):
        return set()
    fields: set[str] = set()
    for key, child in value.items():
        if key in INTERNAL_KEYS:
            continue
        fields.add(key)
        if isinstance(child, dict):
            fields.update(flatten_fields(child))
    return fields


def source_error(data: dict[str, Any]) -> str | None:
    sources = data.get("sources")
    if not isinstance(sources, list) or not sources:
        return "missing non-empty sources array"
    for index, source in enumerate(sources, start=1):
        if not isinstance(source, dict):
            return f"source {index} is not an object"
        missing = [key for key in ("title", "url", "supports") if not source.get(key)]
        if missing:
            return f"source {index} is missing {', '.join(missing)}"
    return None


def validate_result(path: Path, fields: set[str], required: set[str]) -> dict[str, Any]:
    with path.open(encoding="utf-8") as file:
        data = json.load(file)
    if not isinstance(data, dict):
        raise ValueError("result must be a JSON object")

    present = flatten_fields(data)
    missing = sorted(fields - present)
    missing_required = sorted(required - present)
    uncertain = data.get("uncertain", [])
    if not isinstance(uncertain, list) or not all(isinstance(item, str) for item in uncertain):
        raise ValueError("uncertain must be an array of field names")

    invalid_uncertain = sorted(set(uncertain) - fields)
    error = source_error(data)
    valid = not missing_required and not invalid_uncertain and error is None
    return {
        "file": path.name,
        "defined": len(fields),
        "covered": len(fields & present),
        "missing": missing,
        "missing_required": missing_required,
        "invalid_uncertain": invalid_uncertain,
        "source_error": error,
        "valid": valid,
    }


def print_result(result: dict[str, Any], quiet: bool) -> None:
    status = "PASS" if result["valid"] else "FAIL"
    print(f"[{status}] {result['file']}: {result['covered']}/{result['defined']} fields covered")
    if quiet:
        return
    if result["missing_required"]:
        print(f"  Missing required: {', '.join(result['missing_required'])}")
    if result["missing"] and not result["missing_required"]:
        print(f"  Missing optional: {', '.join(result['missing'])}")
    if result["invalid_uncertain"]:
        print(f"  Unknown uncertain fields: {', '.join(result['invalid_uncertain'])}")
    if result["source_error"]:
        print(f"  Source evidence: {result['source_error']}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fields", "-f", required=True, type=Path)
    parser.add_argument("--json", "-j", nargs="*", type=Path)
    parser.add_argument("--dir", "-d", type=Path)
    parser.add_argument("--quiet", "-q", action="store_true")
    args = parser.parse_args()

    if bool(args.json) == bool(args.dir):
        parser.error("provide exactly one of --json or --dir")
    if not args.fields.is_file():
        parser.error(f"fields file not found: {args.fields}")

    try:
        fields, required = load_schema(args.fields)
        paths = args.json if args.json else sorted(args.dir.glob("*.json"))
        if not paths:
            raise ValueError("no JSON result files found")
        results = [validate_result(path, fields, required) for path in paths]
    except (OSError, ValueError, json.JSONDecodeError, yaml.YAMLError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1

    for result in results:
        print_result(result, args.quiet)
    passed = sum(result["valid"] for result in results)
    print(f"Validation passed: {passed}/{len(results)}")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
