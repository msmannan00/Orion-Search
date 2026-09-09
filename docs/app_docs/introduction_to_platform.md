![Build](https://github.com/Orion-Intelligence/Orion-Intelligence/actions/workflows/build.yml/badge.svg?branch=trusted-main)
![Tests](https://github.com/Orion-Intelligence/Orion-Intelligence/actions/workflows/test.yml/badge.svg?branch=trusted-main)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/54342c0b3ffd4ae2ad9bcf701b2500f7)](https://app.codacy.com/gh/Orion-Intelligence/Orion-Intelligence/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![CodeQL Analysis](https://github.com/Orion-Intelligence/Orion-Intelligence/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/Orion-Intelligence/Orion-Intelligence/actions/workflows/github-code-scanning/codeql)
[![MDN HTTP Observatory](https://img.shields.io/badge/observatory-A%2B-brightgreen)](https://developer.mozilla.org/en-US/observatory/analyze?host=try.orionintelligence.org)
[![Security Headers](https://img.shields.io/badge/security%20headers-A%2B-brightgreen)](https://securityheaders.com/?q=https%3A%2F%2Ftry.orionintelligence.org%2F&followRedirects=on)
[![SSLLabs](https://img.shields.io/static/v1?label=SSLLabs&message=A%2B&color=brightgreen)](https://www.ssllabs.com/ssltest/analyze.html?d=try.orionintelligence.org&latest)
[![PageSpeed Insights](https://img.shields.io/badge/PageSpeed%20Insights-100%25-brightgreen)](https://pagespeed.web.dev/analysis/https-orion-genesistechnologies-org/hfe5h3u485?form_factor=desktop)
[![Lighthouse Performance](https://img.shields.io/badge/Lighthouse%20Performance-Run%20Artifacts-blue)](https://github.com/Orion-Intelligence/Orion-Intelligence/actions/workflows/build.yml)
[![Codacy Badge](https://app.codacy.com/project/badge/Coverage/54342c0b3ffd4ae2ad9bcf701b2500f7)](https://app.codacy.com/gh/Orion-Intelligence/Orion-Intelligence/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_coverage)

<img width="5121" height="2909" alt="CYBERATTACK HITS FRENCH INTERIOR(3)" src="https://github.com/user-attachments/assets/4266afc8-1d52-41ac-a2fe-b445e1b6b848" />

<br>

![Web App](https://img.shields.io/uptimerobot/status/m802042352-33d9c489257791a41a505a06?label=web%20app&logo=googlechrome)
![Docs](https://img.shields.io/uptimerobot/status/m802042420-50c04caf485479764330029b?label=docs&logo=readthedocs)

# Orion Platform

DOCUMENTATION  https://orion-search.readthedocs.io

<br>
Orion Platform is a comprehensive, web-based solution that combines the functionality of a browser, search engine, crawler, and data aggregation tools to empower OSINT (Open Source Intelligence) experts. Built on top of Docker, Orion provides a user-friendly interface to explore, search, and visualize data extracted by its powerful Orion Crawler.<br><br>

The platform integrates seamlessly with machine learning models, enhancing search relevance and enabling advanced
content analysis. Orion supports a broad range of functionalities, including the ability to search, filter, and
visualize data across multiple categories, making it an invaluable tool for data exploration and intelligence
gathering.<br>

Designed with flexibility and scalability in mind, Orion enables OSINT experts to feed data directly into the platform,
ensuring up-to-date and comprehensive datasets. Whether for investigative research, competitive analysis, or general
information gathering, Orion provides a unified ecosystem that enhances the workflow of professionals who rely on
actionable insights.<br>
<br>

## Platform Preview

The Orion homepage provides a search-first investigation workspace with summary panels, recent findings, and
visual pivots that help analysts move quickly from overview to deeper investigation.

<img src="https://raw.githubusercontent.com/Orion-Intelligence/Orion-Intelligence/trusted-main/docs/screenshots/homepage-overview-20260326.png" alt="Homepage Overview" />

## Getting Started

To explore the platform and project materials quickly:

1. Open the documentation: https://orion-search.readthedocs.io
2. Review the main platform repository: https://github.com/Orion-Intelligence/Orion-Intelligence
3. Explore the wider Orion module set in the tables below
4. Use the project documentation and repository modules to understand how collection, processing, and analyst workflows connect end to end

## Core Capabilities

Orion is built as an operational intelligence environment rather than a single search page. At a project level, the
platform is centered around:

- collection and ingestion from multiple sources
- processing, normalization, and enrichment of collected data
- indexing and retrieval for large investigative datasets
- analyst-facing search, filtering, and correlation workflows
- modular services that allow the ecosystem to expand as new investigative needs emerge

## Who It's For

Orion is intended for teams and individuals who need a unified investigation environment, including OSINT analysts,
research teams, cyber threat investigators, and operators who work across collection, search, enrichment, and review
workflows.

## Orion Ecosystem

The Orion ecosystem is composed of multiple connected repositories that together support the full intelligence
lifecycle. Some modules focus on collection, some on storage or microservices, some on presentation and analyst
experience, and others on specialized workflows such as browser-assisted acquisition or social-data handling.

At a high level, the project operates as a connected flow:

`Collection -> Processing -> Orion Platform -> Access`

## Technology Stack

The Orion platform is built using various technologies to provide optimal search capabilities and data handling. Below
is the list of libraries and frameworks used:

![MongoDB](https://badgen.net/badge/search-crawler/MongoDB/green)
![Redis](https://badgen.net/badge/search-crawler/Redis/red)
![Celery](https://badgen.net/badge/crawler/Celery/red)
![Python](https://badgen.net/badge/search-crawler/Python/blue)
![Tor](https://badgen.net/badge/search-crawler/Tor/purple)
![Traefik](https://badgen.net/badge/search/Traefik/orange)
![elastic](https://badgen.net/badge/search/elastic/pink)
![java](https://badgen.net/badge/browser/java/cyan)
![kotlin](https://badgen.net/badge/browser/kotlin/yellow)

### Modules

| Module                                                                         | Purpose                                          | Stats                                                                                                                                                                                             |
|--------------------------------------------------------------------------------|--------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [**Orion Platform**](https://github.com/Orion-Intelligence/Orion-Intelligence) | Analyst-facing investigation platform.           | ![Stars](https://img.shields.io/github/stars/Orion-Intelligence/Orion-Intelligence?style=social) ![Forks](https://img.shields.io/github/forks/Orion-Intelligence/Orion-Intelligence?style=social) |
| [**Orion Crawler**](https://github.com/Orion-Intelligence/Orion-Crawler)       | Hidden-web and monitored-source crawling engine. | ![Stars](https://img.shields.io/github/stars/Orion-Intelligence/Orion-Crawler?style=social) ![Forks](https://img.shields.io/github/forks/Orion-Intelligence/Orion-Crawler?style=social)           |
| [**Orion Collector**](https://github.com/Orion-Intelligence/Orion-Collector)   | Custom source collection framework.              | ![Stars](https://img.shields.io/github/stars/Orion-Intelligence/Orion-Collector?style=social) ![Forks](https://img.shields.io/github/forks/Orion-Intelligence/Orion-Collector?style=social)       |
| [**Orion Micros**](https://github.com/Orion-Intelligence/Orion-Micros)         | Supporting backend service modules.              | ![Stars](https://img.shields.io/github/stars/Orion-Intelligence/Orion-Micros?style=social) ![Forks](https://img.shields.io/github/forks/Orion-Intelligence/Orion-Micros?style=social)             |
| [**Orion Browser**](https://github.com/Orion-Intelligence/Orion-Browser)       | Browser-assisted private collection workflows.   | ![Stars](https://img.shields.io/github/stars/Orion-Intelligence/Orion-Browser?style=social) ![Forks](https://img.shields.io/github/forks/Orion-Intelligence/Orion-Browser?style=social)           |
| [**Orion Social**](https://github.com/Orion-Intelligence/Orion-Social)         | Social intelligence data workflows.              | ![Stars](https://img.shields.io/github/stars/Orion-Intelligence/Orion-Social?style=social) ![Forks](https://img.shields.io/github/forks/Orion-Intelligence/Orion-Social?style=social)             |
| [**Orion Leaks**](https://github.com/Orion-Intelligence/Orion-Leaks)           | Leak-focused ingestion and handling.             | ![Stars](https://img.shields.io/github/stars/Orion-Intelligence/Orion-Leaks?style=social) ![Forks](https://img.shields.io/github/forks/Orion-Intelligence/Orion-Leaks?style=social)               |
| [**Orion Tor2Web**](https://github.com/Orion-Intelligence/Orion-Tor2Web)       | Tor-to-web access support component.             | ![Stars](https://img.shields.io/github/stars/Orion-Intelligence/Orion-Tor2Web?style=social) ![Forks](https://img.shields.io/github/forks/Orion-Intelligence/Orion-Tor2Web?style=social)           |
## Contribution

We welcome contributions to improve Orion Platform. If you'd like to contribute, please fork the repository and submit a
pull request.

### Steps to Contribute

1. Fork the repository.
2. Create a new feature branch (`git checkout -b feature-branch`).
3. Commit your changes (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature-branch`).
5. Create a new Pull Request.

## License

Orion Platform is licensed under the [MIT License](https://github.com/Orion-Intelligence/Orion-Intelligence/blob/trusted-main/LICENSE).

## Disclaimer

This project is intended for research purposes only. The authors of Orion Platform do not support or endorse illegal
activities, and users of this project are responsible for ensuring their actions comply with the law.

## GitHub Repository

GitHub Repository URL: [https://github.com/Orion-Intelligence/Orion-Intelligence](https://github.com/Orion-Intelligence/Orion-Intelligence)

## Project Information

https://www.canva.com/design/DAF8Sa8KkDE/1H8z3RVausdHIMcE98Kvfg/edit

## Documentation

https://orion-search.readthedocs.io/en/latest/app_docs/introduction_to_platform.html
