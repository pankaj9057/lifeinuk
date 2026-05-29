# Life in the UK Test Prep Simulator

A lightweight web app for practicing the Life in the UK test with full-length mock papers and detailed explanations.

## Live Site

https://pankaj9057.github.io/lifeinuk/

## Features

- 17 practice papers with 24 questions each (408 total questions)
- Single-choice and multi-select questions
- 45-minute exam timer per paper
- Instant answer checking and end-of-test scoring
- Local progress tracking using browser storage
- Optional question shuffling mode
- Dedicated explanations page with search
- Auto theme mode based on time, with manual override

## Project Structure

- `index.html` - main simulator UI
- `script.js` - quiz logic, state management, scoring, timer
- `explanation.html` - explanations and revision page
- `explanation.js` - explanations rendering and search
- `questiondata.json` - full question dataset
- `favicon.svg` - site icon used by browser tabs

## Run Locally

Because the app fetches `questiondata.json`, run it through a local web server instead of opening the file directly.

### Option 1: VS Code Live Server

1. Install the Live Server extension.
2. Open the project folder.
3. Right-click `index.html` and select **Open with Live Server**.

### Option 2: Python

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## Deployment

This project is deployed with GitHub Pages and served at:

https://pankaj9057.github.io/lifeinuk/

## License

See `LICENSE`.
