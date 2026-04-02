## OntoScope

**OntoScope** is a web-based system prototype that implements a conceptual interaction model for LLM-based ontology scoping with competency questions (CQs), accessible at [ontoscope.digital](https://ontoscope.digital). It supports ontology engineers in progressively defining a well-scoped ontology by organising LLM-generated CQ candidates spatially along two dimensions: subdomains (horizontal) and term granularity (vertical), enabling both divergent thinking (exploring and generating new CQ candidates) and convergent thinking (refining and eliminating existing ones).

[https://github.com/user-attachments/assets/849950d7-edc6-450e-a9ae-82430d413a4b](https://github.com/user-attachments/assets/c18ed333-c136-472c-94ca-0cc70e32d013)

## Installation

### Prerequisites

- Node.js 20.x or higher
- npm (comes with Node.js)
- An OpenAI API key

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/King-s-Knowledge-Graph-Lab/OntoScope.git
   cd ontoscope
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm run dev
   ```

4. **Access the application**
   
   Open your browser and navigate to `http://localhost:5000`

5. **Enter your OpenAI API key**
   
   When prompted, enter your OpenAI API key to enable AI-powered CQ generation.

### Usage

1. Enter a target domain (e.g., "University Administration", "Healthcare Informatics")
2. Click "Generate Space" to initialize the CQ space with AI-generated subdomains and granularity levels
3. Click on any intersection to explore and add competency questions
4. Use the visualization to identify gaps, delete redundant CQs, and refine terminology
5. Export your finalized CQ space as JSON for use in ontology development tools
