import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
