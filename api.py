from fastapi import FastAPI

from WordleScraper import WordleScraper

app = FastAPI()



@app.get("/api/today")
def get_daily_wordle():
    scraper = WordleScraper()
    answer = scraper.get_wordle_answer()
    if answer:
        return {"word": answer.lower()}
    return {"error": "Could not find the daily Wordle answer"}
