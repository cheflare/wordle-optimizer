# WordleOptimizer
A web application providing hints for **probability-based Wordle optimization**, using concepts like **Shannon Entropy**, **Expected Information Gain**, and **Bayesian Updating** to recommend optimal guesses and reduce uncertainty.

Wordle is a popular New York Times word-guessing game where players have six attempts to identify a hidden five-letter word, receiving color-coded feedback after each guess.

Built with **React**, **FastAPI**, and **Python scraping tools**.



## Implemented Features
- **Smart Wordle Hints**: See how many valid words remain based on your previous guesses, view a color-coded guess history, analyze letter frequencies of remaining options, and receive optimal next guesses.
- **Daily Wordle Fetcher**: Automatically retrieves the current day’s Wordle answer through a backend API.
- **Multiple Game Modes**: Play with a random word or the current day's Wordle.

## Planned Features
- Replay Past Wordles Game Mode
- Firebase or Supabase authentication and progress storing
- More advanced statistics and visualizations

## Word List Attribution
The word list used in this project is from [dracos/valid-wordle-words.txt](https://gist.github.com/dracos/dd0668f281e685bad51479e5acaadb93), created by M Somerville ([dracos on GitHub](https://github.com/dracos)). Thanks!

## Scraping Policy
- The backend scrapes only the daily Wordle answer from beebom.com, strictly following [beebom.com's robots.txt](https://www.beebom.com/robots.txt) and terms of service.
- No excessive or abusive requests are made; scraping is limited to the daily answer for research and educational purposes only.

## Project Structure

```
WordleOptimizer/
├── api.py                # FastAPI backend for daily Wordle answer
├── WordleScraper.py      # Python scraper for daily Wordle answer
├── src/
│   ├── App.tsx           # Main React app
│   ├── AnimatedBackground.tsx # Animated background component
│   ├── word-list.txt     # Wordle word list (from dracos)
│   └── ...
├── requirements.txt      # Python backend dependencies
├── package.json          # Frontend dependencies
├── vite.config.ts        # Vite config (with API proxy)
└── ...
```

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- Python 3.8+

### Backend Setup (API)
1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the FastAPI server:
   ```bash
   uvicorn api:app --reload
   ```

### Frontend Setup (React)
1. Install Node dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:5173](http://localhost:5173) in your browser.

### API Usage
- **GET /api/today**: Returns the current day's Wordle answer as `{ "word": "xxxxx" }`.

## Dependencies

### Backend
- `fastapi`
- `uvicorn[standard]`
- `requests`
- `beautifulsoup4`

### Frontend
- `react`, `react-dom`, `lucide-react`, `react-router-dom`
- `vite`, `typescript`, `tailwindcss`, `eslint`, etc.

## License
This project is for educational and research purposes only. Please respect the terms of service of any third-party sites you interact with.

## Author
Developed by cheflare.
