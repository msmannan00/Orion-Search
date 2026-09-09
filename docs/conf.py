import os
from pathlib import Path

project = "Orion Documentation"
author = "Abdul Mannan"
release = "1.0.3.8"

extensions = [
    "myst_parser",
    "sphinx_design",
]

source_suffix = [".rst", ".md"]
public_build = os.environ.get("ORION_DOCS_PUBLIC") == "1"
master_doc = "index"
html_theme = "shibuya"
exclude_patterns = [
    "api_docs/**",
    "public_index.md",
]

if public_build:
    exclude_patterns.extend(
        [
            "app_docs/company_and_product_scope.md",
            "app_docs/introduction_to_platform.md",
            "app_docs/organizational_security_policies.md",
            "app_docs/swagger_api_reference.md",
        ]
    )

myst_enable_extensions = [
    "colon_fence",
]

myst_heading_anchors = 3

html_static_path = ["_static"]

html_theme_options = {
    "color_mode": "dark",
}

html_css_files = [
    "custom.css",
]


def _use_public_index(_app, docname, source):
    if public_build and docname == master_doc:
        source[0] = (Path(__file__).parent / "public_index.md").read_text(encoding="utf-8")


def setup(app):
    app.connect("source-read", _use_public_index)
