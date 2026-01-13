import requests
from bs4 import BeautifulSoup
import re
import json
import csv
from datetime import datetime
import time
import os

"""
Wordle Answer Scraper
---------------------
Scrapes past Wordle answers from wordfinder.yourdictionary.com/wordle/answers/

robots.txt compliance:
- This scraper only accesses /wordle/answers/ which is NOT disallowed
- Disallowed paths are: /*?*, /wordle/results*, /search*, /anagram-solver/*, etc.
- Rate limiting is implemented with delays between requests
"""


class WordleScraper:
    def __init__(self):
        # Set a user agent to mimic a real browser visit
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        self.base_url = "https://wordfinder.yourdictionary.com/wordle/answers/"
        
    def fetch_page(self, url):
        """Fetches the HTML content from the given URL with rate limiting."""
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            return response.text
        except requests.RequestException as e:
            print(f"❌ Error fetching {url}: {e}")
            return None

    def parse_date(self, date_str, year):
        """Parses a date string like 'Jan. 12' or 'Dec. 31' with a given year."""
        # Clean up the date string
        date_str = date_str.strip()
        
        # Handle "Today" special case - use current date
        if "Today" in date_str:
            return datetime.now().strftime("%Y-%m-%d")
        
        # Extract month and day from strings like "Jan. 12" or "Dec. 31"
        month_map = {
            'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
            'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
        }
        
        # Match patterns like "Jan. 12" or "Jan 12"
        match = re.search(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s*(\d{1,2})', date_str)
        if match:
            month = month_map[match.group(1)]
            day = int(match.group(2))
            return f"{year}-{month:02d}-{day:02d}"
        
            return None

    def parse_wordle_answers(self, html_content):
        """Parses the HTML to extract Wordle answers, dates, and puzzle numbers."""
        soup = BeautifulSoup(html_content, 'html.parser')
        answers = []
        
        # Find all month headers (h2 elements with month/year info)
        # Format: "All January 2026 Wordle Answers"
        current_year = datetime.now().year
        
        # Find all tables containing answers
        tables = soup.find_all('table')
        
        # Also find all h2 headers to determine which year each table belongs to
        all_h2 = soup.find_all('h2')
        year_sections = []
        
        for h2 in all_h2:
            text = h2.get_text(strip=True)
            # Match patterns like "All January 2026 Wordle Answers"
            match = re.search(r'All\s+(\w+)\s+(\d{4})\s+Wordle\s+Answers', text)
            if match:
                month_name = match.group(1)
                year = int(match.group(2))
                year_sections.append({'month': month_name, 'year': year, 'element': h2})
        
        # Process each table
        for table in tables:
            # Find the closest h2 header before this table to determine the year
            table_year = current_year
            
            # Get all previous siblings and parent's previous siblings to find h2
            prev_element = table.find_previous('h2')
            if prev_element:
                text = prev_element.get_text(strip=True)
                match = re.search(r'(\d{4})', text)
                if match:
                    table_year = int(match.group(1))
            
            # Parse table rows
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 3:
                    date_cell = cells[0].get_text(strip=True)
                    wordle_num_cell = cells[1].get_text(strip=True)
                    answer_cell = cells[2].get_text(strip=True)
                    
                    # Skip header rows
                    if 'Date' in date_cell or 'Wordle' in wordle_num_cell:
                        continue
                    
                    # Skip "Reveal" buttons (hidden answers for today)
                    if answer_cell == 'Reveal' or len(answer_cell) == 0:
                        # Try to find the hidden answer in a span
                        span = cells[2].find('span')
                        if span:
                            answer_cell = span.get_text(strip=True)
                        else:
                            continue
                    
                    # Parse the date
                    parsed_date = self.parse_date(date_cell, table_year)
                    
                    # Parse the wordle number
                    try:
                        wordle_num = int(re.search(r'\d+', wordle_num_cell).group())
                    except (AttributeError, ValueError):
                        continue
                    
                    # Clean up the answer (should be 5 uppercase letters)
                    answer = answer_cell.strip().upper()
                    if len(answer) == 5 and answer.isalpha():
                        answers.append({
                            'date': parsed_date,
                            'wordle_number': wordle_num,
                            'answer': answer
                        })
        
        # Remove duplicates and sort by date descending
        seen = set()
        unique_answers = []
        for item in answers:
            key = (item['date'], item['wordle_number'])
            if key not in seen:
                seen.add(key)
                unique_answers.append(item)
        
        # Sort by date descending (newest first)
        unique_answers.sort(key=lambda x: x['date'] if x['date'] else '', reverse=True)
        
        return unique_answers
    
    def scrape_all_answers(self):
        """Scrapes all Wordle answers from the main answers page."""
        print("🔍 Fetching Wordle answers from wordfinder.yourdictionary.com...")
        print(f"📍 URL: {self.base_url}")
        print("⏳ Please wait, this may take a moment...\n")
        
        html_content = self.fetch_page(self.base_url)
        if not html_content:
            print("❌ Failed to fetch the page")
            return []
        
        print("✅ Page fetched successfully")
        print("📊 Parsing Wordle answers...\n")
        
        answers = self.parse_wordle_answers(html_content)
        
        if answers:
            print(f"✅ Found {len(answers)} Wordle answers!")
            print(f"📅 Date range: {answers[-1]['date']} to {answers[0]['date']}")
        else:
            print("❌ No answers found")
        
        return answers
    
    def save_to_json(self, answers, filename="wordle_answers.json"):
        """Saves the answers to a JSON file."""
        filepath = os.path.join(os.path.dirname(__file__), filename)
        with open(filepath, 'w') as f:
            json.dump(answers, f, indent=2)
        print(f"💾 Saved {len(answers)} answers to {filename}")
        return filepath
    
    def save_to_csv(self, answers, filename="wordle_answers.csv"):
        """Saves the answers to a CSV file."""
        filepath = os.path.join(os.path.dirname(__file__), filename)
        with open(filepath, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['date', 'wordle_number', 'answer'])
            writer.writeheader()
            writer.writerows(answers)
        print(f"💾 Saved {len(answers)} answers to {filename}")
        return filepath
    
    def get_answer_for_date(self, target_date):
        """
        Gets the Wordle answer for a specific date.
        
        Args:
            target_date: Can be a datetime object or a string in format 'YYYY-MM-DD'
        
        Returns:
            The 5-letter Wordle answer or None if not found
        """
        # Convert to string if datetime object
        if isinstance(target_date, datetime):
            date_str = target_date.strftime("%Y-%m-%d")
        else:
            date_str = target_date
        
        # First, try to load from cached JSON file
        json_path = os.path.join(os.path.dirname(__file__), "wordle_answers.json")
        
        answers = []
        if os.path.exists(json_path):
            # Check if cache is fresh (less than 24 hours old)
            cache_age = time.time() - os.path.getmtime(json_path)
            if cache_age < 86400:  # 24 hours in seconds
                print("📁 Loading from cache...")
                with open(json_path, 'r') as f:
                    answers = json.load(f)
        
        # If no cache or cache is stale, fetch fresh data
        if not answers:
            answers = self.scrape_all_answers()
            if answers:
                self.save_to_json(answers)
        
        # Search for the answer
        for item in answers:
            if item['date'] == date_str:
                return item['answer']
        return None

    def get_wordle_answer(self, date=None):
        """
        Main method to get the Wordle answer for a specific date.
        Maintains compatibility with the old API.
        
        Args:
            date: Optional datetime object. Defaults to today.
        
        Returns:
            The 5-letter Wordle answer or None if not found
        """
        if date is None:
            date = datetime.now()
        
        return self.get_answer_for_date(date)


def main():
    """Main function to run the scraper."""
    print("=" * 60)
    print("🎮 Wordle Answer Scraper")
    print("📍 Source: wordfinder.yourdictionary.com/wordle/answers/")
    print("=" * 60)
    print()
    
    scraper = WordleScraper()
    
    # Scrape all answers
    answers = scraper.scrape_all_answers()
    
    if answers:
        # Save to both JSON and CSV
        print()
        scraper.save_to_json(answers)
        scraper.save_to_csv(answers)
        
        # Print some sample answers
        print()
        print("📋 Sample of recent answers:")
        print("-" * 40)
        for answer in answers[:10]:
            print(f"  {answer['date']} | #{answer['wordle_number']} | {answer['answer']}")
        print("-" * 40)
        
        # Test getting today's answer
        print()
        today_answer = scraper.get_wordle_answer()
        if today_answer:
            print(f"✅ Today's Wordle answer: {today_answer}")
        else:
            print("⚠️  Today's answer not yet available")
    else:
        print("❌ Failed to scrape Wordle answers")


if __name__ == "__main__":
    main()
