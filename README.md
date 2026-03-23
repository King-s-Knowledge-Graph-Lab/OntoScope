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
