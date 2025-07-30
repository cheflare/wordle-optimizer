import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from WordleScraper import WordleScraper

app = FastAPI()

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/today")
def get_daily_wordle():
    scraper = WordleScraper()
    answer = scraper.get_wordle_answer()
    if answer:
        return {"word": answer.lower()}
    return {"error": "Could not find the daily Wordle answer"}

@app.get("/api/wordle/{date_str}")
def get_wordle_for_date(date_str: str):
    try:
        # The date will be passed in YYYY-MM-DD format from the frontend
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        scraper = WordleScraper()
        answer = scraper.get_wordle_answer(date=date_obj)
        if answer:
            return {"word": answer.lower()}
        return {"error": f"Could not find the Wordle answer for {date_str}"}
    except ValueError:
        return {"error": "Invalid date format. Please use YYYY-MM-DD."}
    except Exception as e:
        return {"error": str(e)}
