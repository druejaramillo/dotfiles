"""Portable structural checks for the consolidated skills; run with python -m unittest discover."""

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NAMES = ("sentry-go", "show-me", "cro", "seo", "pptx", "templ")


class SkillStructureTests(unittest.TestCase):
    def test_skill_names_and_descriptions(self):
        for name in NAMES:
            with self.subTest(name=name):
                text = (ROOT / name / "SKILL.md").read_text()
                self.assertTrue(text.startswith("---\n"))
                self.assertRegex(text, rf"(?m)^name: {re.escape(name)}$")
                self.assertRegex(text, r"(?m)^description: .+\S$")
                self.assertEqual(len(list((ROOT / name).rglob("SKILL.md"))), 1)

    def test_relative_markdown_links_resolve(self):
        for name in NAMES:
            for path in (ROOT / name).rglob("*.md"):
                targets: list[str] = re.findall(r"\]\(([^)]+)\)", path.read_text())
                for target in targets:
                    if target.startswith(("references/", "./", "../")):
                        with self.subTest(path=path, target=target):
                            self.assertTrue((path.parent / target.split("#", 1)[0]).exists())

    def test_show_me_keeps_inline_and_html_routes(self):
        text = (ROOT / "show-me/SKILL.md").read_text()
        for marker in ("pseudocode", "call tree", "diff", "Implementation plan", "PR, diff", "plannotator annotate", "render every diagram with Mermaid 11", "the explainer is not deliverable"):
            with self.subTest(marker=marker):
                self.assertIn(marker, text)

    def test_mermaid_theme_uses_literal_colors_and_host_opt_in(self):
        theme = (ROOT / "show-me/references/theme-override.md").read_text()
        section = theme.split("## Mermaid theming", 1)[1].split("\n## ", 1)[0]
        self.assertGreaterEqual(len(re.findall(r"#[0-9a-f]{6}\b", section, re.IGNORECASE)), 10)
        self.assertIn("mermaid.initialize", section)
        self.assertIn('<meta name="plannotator-theme" content="host">', theme)


if __name__ == "__main__":
    _ = unittest.main()
