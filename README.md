# OntoScope

**An Interactive LLM-Based System for Supporting Divergent and Convergent Thinking in Ontology Scoping**

[![Paper](https://img.shields.io/badge/Paper-IUI%202026-blue)](https://dl.acm.org/doi/10.1145/3742413.3789225)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

OntoScope is a web-based system prototype that helps ontology engineers define the scope of an ontology with competency questions (CQs). It accompanies our ACM IUI 2026 paper, *OntoScope: Using a Divergent-Convergent Interaction Framework to Support LLM-based Ontology Scoping*.

▶️ **[Watch the video presentation](https://yihangzhao.com/api/storage/public-objects/videos/ontoscope.mp4)**

## Overview

An ontology models knowledge in a domain. A domain has no natural boundary, so deciding what an ontology should cover relies on human judgement. Most existing tools, including LLM-based ones, automate this step and produce a large set of CQs in one go. This leaves people with limited control and output that is hard to audit.

OntoScope instead represents the ontology scope as an externalised design space. The design space has two dimensions.

- **Subdomain dimension** (horizontal) covers the breadth of the domain. Its values are subdomains.
- **Granularity dimension** (vertical) covers the depth of the domain. Its values are granularity levels, from general to specific.

Each pair of a subdomain and a granularity level forms a cell. Each cell holds CQs, and each CQ suggests terms for the ontology. The design space therefore contains three kinds of elements. These are the dimension values (subdomains and granularity levels), the CQs, and the terms each CQ suggests.

People can manipulate all three kinds of elements to switch between two modes of thinking.

- **Divergent thinking** means adding new subdomains, granularity levels, CQs, and terms.
- **Convergent thinking** means refining, merging, and removing existing subdomains, granularity levels, CQs, and terms.

## Features

- Generate an initial design space from a target domain with an LLM, including subdomains, granularity levels, CQs, and terms
- Add new subdomains, granularity levels, CQs, and terms to expand the scope
- Spot gaps and redundancies across the design space through a visualisation
- Refine, merge, and remove subdomains, granularity levels, CQs, and terms to narrow the scope
- Export the final design space as JSON for use in ontology development tools

## Tech Stack

- **Frontend** React, TypeScript, Vite, Tailwind CSS
- **Backend** Node.js server (in `server/`)
- **LLM** OpenAI API

## Project Structure

```
OntoScope/
├── client/            # Frontend application
├── server/            # Backend server and LLM integration
├── shared/            # Types and schemas shared by client and server
├── attached_assets/   # Static assets
├── package.json
└── vite.config.ts
```

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm (included with Node.js)
- An OpenAI API key

### Installation

1. Clone the repository.

   ```bash
   git clone https://github.com/King-s-Knowledge-Graph-Lab/OntoScope.git
   cd OntoScope
   ```

2. Install the dependencies.

   ```bash
   npm install
   ```

3. Start the development server.

   ```bash
   npm run dev
   ```

4. Open `http://localhost:5000` in your browser.

5. Enter your OpenAI API key when prompted. The key enables LLM-based generation.

## Usage

1. Enter a target domain, for example "University Administration" or "Healthcare Informatics".
2. Click **Generate Space** to create the design space with LLM-generated subdomains, granularity levels, CQs, and terms.
3. Click any cell to explore it, and add new subdomains, granularity levels, CQs, or terms.
4. Use the visualisation to identify gaps, then refine, merge, or remove subdomains, granularity levels, CQs, and terms.
5. Export the final design space as JSON.

## Citation

If you use OntoScope in your research, please cite our paper.

```bibtex
@inproceedings{10.1145/3742413.3789225,
author = {Zhao, Yihang and Mero{\~n}o Pe{\~n}uela, Albert and Simperl, Elena},
title = {OntoScope: Using a Divergent-Convergent Interaction Framework to Support LLM-based Ontology Scoping},
year = {2026},
isbn = {9798400719844},
publisher = {Association for Computing Machinery},
address = {New York, NY, USA},
url = {https://doi.org/10.1145/3742413.3789225},
doi = {10.1145/3742413.3789225},
booktitle = {Proceedings of the 31st International Conference on Intelligent User Interfaces},
pages = {67–84},
numpages = {18},
keywords = {Knowledge works, Knowledge engineering, Ontology engineering, KE, KG, OE, Requirements engineering, RE, Competency questions, CQ, Generative AI, GenAI, Artificial intelligence, AI, Large language models, LLM, User interface, UI, Interaction technics, Interaction design, IxD, Computational creativity, Creative thinking, Divergent thinking, Convergent thinking, Cognitive process},
location = {Paphos, Cyprus},
series = {IUI '26}
}
```

## License

This project is released under the [MIT License](LICENSE).

## Contact

For questions or feedback, please open an [issue](https://github.com/King-s-Knowledge-Graph-Lab/OntoScope/issues) or contact Yihang Zhao (King's College London).