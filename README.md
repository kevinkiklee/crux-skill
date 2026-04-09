# CrUX Skills

A collection of skills for interacting with the Chrome User Experience Report (CrUX).

## Installation

This project does not require any complex installation steps as it consists of standalone Node.js scripts.

### Prerequisites

- **Node.js**: Ensure you have Node.js installed (version 18 or higher is recommended as the scripts use native `fetch`).

### Setup

1. Clone this repository to your local machine.
2. The scripts require a CrUX API key to function.
3. Set the `CRUX_API_KEY` environment variable:

   ```bash
   export CRUX_API_KEY="your_api_key_here"
   ```

## Usage

The main skill available is the CrUX Metrics skill.

For detailed usage instructions, options, and examples, please refer to [SKILL.md](SKILL.md).

### Quick Example

```bash
node scripts/query_crux.cjs --url https://developer.chrome.com
```
