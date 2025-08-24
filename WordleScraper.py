import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime
import time

# This class scrapes websites to find the daily Wordle answer.
class WordleScraper:
    def __init__(self):
        # Set a user agent to mimic a real browser visit.
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    # Returns a formatted date string for use in URLs.
    def get_date_string(self, date=None):
        if date is None:
            date = datetime.now()
        return date.strftime("%B %d, %Y")

    # Returns a list of known websites that publish the Wordle answer.
    def get_known_wordle_sites(self, date_str):
        date_obj = datetime.strptime(date_str, "%B %d, %Y")
        
        # Define the cutoff date for the URL format change.
        cutoff_date = datetime(2025, 8, 23)

        if date_obj < cutoff_date:
            # Old URL format for dates before August 23, 2025
            # Format day without leading zero for compatibility with the URL structure (e.g., january-1-2025)
            day = date_obj.strftime("%-d" if date_obj.day < 10 else "%d")
            month_day_year = f"{date_obj.strftime('%B').lower()}-{day}-{date_obj.year}"
            return [
                f"https://beebom.com/todays-wordle-hints-answer-{month_day_year}/"
            ]
        else:
            # New URL format for dates on or after August 23, 2025
            day = date_obj.strftime("%d")
            month = date_obj.strftime('%B').lower()
            year = date_obj.year
            date_slug = f"{day}-{month}-{year}"
            return [
                f"https://beebom.com/nyt-wordle-today-{date_slug}/"
            ]

    # Extracts the Wordle answer from the HTML of a webpage using regex patterns.
    def extract_wordle_answer_fallback_from_html(self, html_text, source_url=""):
        try:
            text = html_text.upper()
            # Site-specific regex patterns to find the answer.
            if "beebom.com" in source_url:
                match = re.search(r"THE ANSWER FOR WORDLE.*?IS\s+([A-Z]{5})", text)
                if match:
                    return match.group(1).upper()
            return None
        except Exception as e:
            print(f"Site-specific fallback error: {e}")
            return None

    # Fetches a URL and extracts the Wordle answer from its content.
    def extract_wordle_answer(self, url):
        try:
            response = self.session.get(url, timeout=10)
            soup = BeautifulSoup(response.text, 'html.parser')
            full_text = soup.get_text(separator='\n', strip=True)

            # Use the regex-based fallback method to find the answer.
            answer = self.extract_wordle_answer_fallback_from_html(full_text, url)
            if answer:
                print(f"✅ Extracted via fallback from {url}")
                return answer

            print(f"⚠️ Fallback failed for {url}")
            return None

        except Exception as e:
            print(f"Error extracting from {url}: {e}")
            return None

    # Main method to get the Wordle answer.
    def get_wordle_answer(self, date=None):
        date_str = self.get_date_string(date)
        print(f"🎯 Trying known Wordle answer websites...")
        # First, try the known reliable websites.
        for site in self.get_known_wordle_sites(date_str):
            print(f"🌐 Checking: {site}")
            answer = self.extract_wordle_answer(site)
            if answer:
                return answer
            time.sleep(1) # Be respectful and don't spam requests.
        return None

# Main function to run the scraper.
def main():
    print("🔍 Searching for today's Wordle answer...")
    scraper = WordleScraper()
    answer = scraper.get_wordle_answer()
    if answer:
        print(f"\n✅ Today's Wordle answer is: {answer}")
    else:
        print(f"\n❌ Could not find today's Wordle answer")

if __name__ == "__main__":
    main()
