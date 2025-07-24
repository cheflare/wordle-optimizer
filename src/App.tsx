import { useState, useEffect } from 'react';
import { AlertCircle, Target, RefreshCw, Lightbulb, Upload, FileText, Shuffle, Calendar } from 'lucide-react';
import wordListRaw from './word-list.txt?raw';
import AnimatedBackground from './AnimatedBackground';

// Main component for the Wordle Optimizer application
const WordleOptimizer = () => {
  // State variables for the application
  const [guesses, setGuesses] = useState<{ word: string; feedback: string; attempt: number }[]>([]); // Stores the list of guesses made by the user
  const [currentGuess, setCurrentGuess] = useState<string>(''); // The current guess being typed by the user
  const [targetWord, setTargetWord] = useState<string>(''); // The word to be guessed
  const [possibleWords, setPossibleWords] = useState<string[]>([]); // The list of words that are still possible answers
  const [recommendation, setRecommendation] = useState<string>(''); // Probability-based recommended next guess
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing'); // Can be 'playing', 'won', or 'lost'
  const [attempt, setAttempt] = useState<number>(1); // The current attempt number
  const [wordList, setWordList] = useState<string[]>([]); // The full list of words loaded from the file
  const [letterFreq, setLetterFreq] = useState<Record<string, number>>({}); // The frequency of each letter in the word list
  const [isLoading, setIsLoading] = useState<boolean>(false); // Whether the app is in a loading state
  const [targetWordSource, setTargetWordSource] = useState<string>(''); // 'random', 'daily', or 'manual'
  const [dailyWordDate, setDailyWordDate] = useState<string>(''); // The date of the daily Wordle word
  // Add new state for landing page
  const [page, setPage] = useState<'landing' | 'gameMode' | 'game'>('landing');
  // Add state for hint expansion
  const [hintExpanded, setHintExpanded] = useState(false);


  // Generates feedback for a guess based on the target word.
  // 'G' for correct letter in correct position (Green)
  // 'Y' for correct letter in wrong position (Yellow)
  // 'B' for incorrect letter (Black)
  const generateFeedback = (guess, target) => {
    const feedback = ['B', 'B', 'B', 'B', 'B'];
    const targetLetters = target.split('');
    const guessLetters = guess.split('');

    // First pass: mark correct positions (Green)
    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        feedback[i] = 'G';
        targetLetters[i] = null; // Mark as used
        guessLetters[i] = null; // Mark as used
      }
    }

    // Second pass: mark wrong positions (Yellow)
    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] !== null) {
        const targetIndex = targetLetters.indexOf(guessLetters[i]);
        if (targetIndex !== -1) {
          feedback[i] = 'Y';
          targetLetters[targetIndex] = null; // Mark as used
        }
      }
    }

    return feedback.join('');
  };

  // Calculates the frequency of each letter in a list of words.
  const calculateLetterFrequency = (words) => {
    const freq = {};
    const totalLetters = words.length * 5; // Each word has 5 letters

    // Initialize all letters to 0
    for (let i = 97; i <= 122; i++) {
      freq[String.fromCharCode(i)] = 0;
    }

    if (words.length === 0) {
      return freq;
    }

    // Count letter occurrences
    words.forEach(word => {
      word.toLowerCase().split('').forEach(letter => {
        if (freq[letter] !== undefined) {
          freq[letter]++;
        }
      });
    });

    // Convert to percentages
    Object.keys(freq).forEach(letter => {
      freq[letter] = (freq[letter] / totalLetters) * 100;
    });

    return freq;
  };

  // Gets a random word from the word list.
  const getRandomWord = () => {
    if (wordList.length === 0) return '';
    const randomIndex = Math.floor(Math.random() * wordList.length);
    return wordList[randomIndex];
  };

  // Fetches the daily Wordle word from a local API.
  const fetchDailyWordle = async () => {
    setIsLoading(true);
    try {
      // Try to fetch from the local API
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/today`);
      if (!response.ok) {
        throw new Error('Failed to fetch daily Wordle from local API');
      }

      const data = await response.json();
      const dailyWord = data.word?.toLowerCase();

      if (!dailyWord) {
        throw new Error('No word found in response from local API');
      }

      // Check if the word is in our word list
      if (wordList.length > 0 && !wordList.includes(dailyWord)) {
        console.warn('Daily word not in your word list, but using it anyway.');
      }

      const today = new Date();
      setDailyWordDate(today.toLocaleDateString());
      return dailyWord;
    } catch (error) {
      console.error('Error fetching daily Wordle:', error);
      alert("Could not fetch today's Wordle word. Please ensure the backend API is running. Using a random word instead.");
      return getRandomWord(); // Fallback to random word
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Load built-in word list from file
    setIsLoading(true);
    const words = wordListRaw.split(/\r?\n/).map(word => word.trim().toLowerCase())
      .filter(word => word.length === 5 && /^[a-z]+$/.test(word));
    const initialFrequencies = calculateLetterFrequency(words);
    setWordList(words);
    setLetterFreq(initialFrequencies);
    setPossibleWords(words);
    setRecommendation(getOptimalGuess(words, [], initialFrequencies));
    setIsLoading(false);
  }, []);

  // Calculates a score for a word based on letter frequency and position.
  const calculateWordScore = (word, possibleWords, frequencies) => {
    let score = 0;
    const uniqueLetters = new Set<string>(word);

    // Bonus for unique letters (more unique letters provide more information)
    score += uniqueLetters.size * 10;

    // Add points based on the frequency of each unique letter in the word.
    for (let letter of uniqueLetters) {
      score += frequencies[letter] || 0;
    }

    // Add a bonus for letters that are common in specific positions.
    const positionFreq = getPositionalFrequency(possibleWords);
    for (let i = 0; i < word.length; i++) {
      const letter = word[i];
      if (positionFreq[i] && positionFreq[i][letter]) {
        score += positionFreq[i][letter] * 2; // Positional bonus
      }
    }

    return score;
  };

  // Calculates the frequency of each letter at each position in the word.
  const getPositionalFrequency = (words: string[]): Record<string, number>[] => {
    const positions: Record<string, number>[] = [{}, {}, {}, {}, {}];

    words.forEach(word => {
      for (let i = 0; i < 5; i++) {
        const letter = word[i];
        positions[i][letter] = (positions[i][letter] || 0) + 1;
      }
    });

    // Convert counts to percentages for normalization.
    positions.forEach(pos => {
      const total = Object.values(pos).reduce((sum, count) => (sum as number) + (count as number), 0) as number;
      Object.keys(pos).forEach(letter => {
        pos[letter] = (pos[letter] / total) * 100;
      });
    });

    return positions;
  };

  // Determines the optimal guess based on information theory and heuristics.
  const getOptimalGuess = (candidateWords, previousGuesses, frequencies = letterFreq) => {
    if (candidateWords.length === 0) return '';
    if (candidateWords.length === 1) return candidateWords[0];

    // For the first guess, use a common starter word if available.
    if (previousGuesses.length === 0) {
      const commonStarters = ['adieu', 'audio', 'orate', 'arise', 'raise', 'slate', 'trace', 'crate', 'stare'];
      const availableStarter = commonStarters.find(word => candidateWords.includes(word));
      if (availableStarter) return availableStarter;
    }

    // Calculate the best word based on its potential to eliminate other words.
    let bestWord = candidateWords[0];
    let bestScore = -1;

    // Limit the search space for performance, especially with large word lists.
    const searchLimit = Math.min(100, candidateWords.length);
    const wordsToCheck = candidateWords.slice(0, searchLimit);

    for (let word of wordsToCheck) {
      const score = calculateWordScore(word, candidateWords, frequencies);
      if (score > bestScore) {
        bestScore = score;
        bestWord = word;
      }
    }

    return bestWord;
  };

  // Filters the list of possible words based on the feedback from a guess.
  const filterWords = (words, guess, feedback) => {
    return words.filter(word => {
      for (let i = 0; i < 5; i++) {
        const letter = guess[i];
        const fb = feedback[i];

        if (fb === 'G') { // Green: Letter must be in this position.
          if (word[i] !== letter) return false;
        } else if (fb === 'Y') { // Yellow: Letter is in the word, but not in this position.
          if (word[i] === letter || !word.includes(letter)) return false;
        } else if (fb === 'B') { // Black: Letter is not in the word.
          if (word.includes(letter)) {
            // Handle cases with duplicate letters in the guess.
            let appearsElsewhere = false;
            for (let j = 0; j < 5; j++) {
              if (j !== i && guess[j] === letter && (feedback[j] === 'G' || feedback[j] === 'Y')) {
                appearsElsewhere = true;
                break;
              }
            }
            if (!appearsElsewhere) return false;
          }
        }
      }
      return true;
    });
  };

  // Adds a new guess to the game state and updates the game accordingly.
  const addGuess = () => {
    if (!targetWord) {
      alert('Please set a target word first');
      return;
    }

    if (currentGuess.length !== 5) {
      alert('Please enter a 5-letter guess');
      return;
    }

    if (!/^[a-zA-Z]+$/.test(currentGuess)) {
      alert('Please enter only letters');
      return;
    }

    if (!wordList.includes(currentGuess.toLowerCase())) {
      alert('Invalid word, Please enter a valid one');
      return;
    }

    const feedback = generateFeedback(currentGuess.toLowerCase(), targetWord.toLowerCase());

    const newGuess = {
      word: currentGuess.toLowerCase(),
      feedback: feedback,
      attempt: attempt
    };

    const newGuesses = [...guesses, newGuess];
    setGuesses(newGuesses);

    // Check for win or loss conditions.
    if (feedback === 'GGGGG') {
      setGameState('won');
      setRecommendation('🎉 Congratulations! You solved it!');
    } else if (attempt >= 6) {
      setGameState('lost');
      setRecommendation(`😔 Game over! The word was: ${targetWord.toUpperCase()}`);
    } else {
      // Filter possible words and get the next recommendation.
      const filtered = filterWords(possibleWords, currentGuess.toLowerCase(), feedback);
      setPossibleWords(filtered);

      const nextRec = getOptimalGuess(filtered, newGuesses, letterFreq);
      setRecommendation(nextRec);
      setAttempt(attempt + 1);
    }

    setCurrentGuess('');
  };

  // Resets the game to its initial state.
  const reset = () => {
    setGuesses([]);
    setCurrentGuess('');
    setTargetWord('');
    setTargetWordSource('');
    setDailyWordDate('');
    setPossibleWords(wordList);
    setGameState('playing');
    setAttempt(1);
    setRecommendation(getOptimalGuess(wordList, [], letterFreq));
    setPage('gameMode');
  };

  // Starts a new game with a random word.
  const startRandomGame = () => {
    const randomWord = getRandomWord();
    setTargetWord(randomWord);
    setTargetWordSource('random');
    setPossibleWords(wordList);
    setGuesses([]);
    setCurrentGuess('');
    setGameState('playing');
    setAttempt(1);
    setRecommendation(getOptimalGuess(wordList, [], letterFreq));
    setPage('game');
  };

  // Starts a new game with the daily Wordle word.
  const startDailyWordle = async () => {
    const dailyWord = await fetchDailyWordle();
    setTargetWord(dailyWord);
    setTargetWordSource('daily');
    setPossibleWords(wordList);
    setGuesses([]);
    setCurrentGuess('');
    setGameState('playing');
    setAttempt(1);
    setRecommendation(getOptimalGuess(wordList, [], letterFreq));
    setPage('game');
  };

  // Starts a new game with a manually entered word.
  const startManualGame = () => {
    setTargetWordSource('manual');
    setTargetWord('');
    setPossibleWords(wordList);
    setGuesses([]);
    setCurrentGuess('');
    setGameState('playing');
    setAttempt(1);
    setRecommendation(getOptimalGuess(wordList, [], letterFreq));
  };

  // Returns the appropriate background color for a given feedback letter.
  const getFeedbackColor = (letter) => {
    switch (letter) {
      case 'G': return 'bg-green-500';
      case 'Y': return 'bg-yellow-500';
      case 'B': return 'bg-gray-500';
      default: return 'bg-gray-200';
    }
  };

  // Gets the top 8 most frequent letters from the current list of possible words.
  const getTopLetters = () => {
    const currentFrequencies = calculateLetterFrequency(possibleWords);
    if (!currentFrequencies || Object.keys(currentFrequencies).length === 0) return [];

    return (Object.entries(currentFrequencies) as [string, number][]) // cast to correct type
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([letter, freq]) => ({ letter: letter.toUpperCase(), freq: freq.toFixed(1) }));
  };

  // JSX for rendering the component
  return (
    <div className="min-h-screen bg-transparent p-4">
      <AnimatedBackground />
      <div className="max-w-4xl mx-auto">
        {page === 'landing' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <h1 className="text-5xl font-bold text-gray-800 mb-4 flex items-center gap-3">
              <Target className="text-indigo-600" size={48} />
              Wordle Optimization Bot
            </h1>
            <p className="text-gray-600 mb-8 text-xl max-w-2xl">
              Elevate your Wordle game with our smart helper. Using probability and advanced algorithms, we recommend the best possible guesses to help you solve the puzzle in the fewest attempts.
            </p>

            {/* Buttons */}
            <div className="flex flex-col md:flex-row gap-6 w-full max-w-lg">

              {/* Guest Button */}
              <div className="flex-1">
                <button
                  onClick={() => setPage('gameMode')}
                  className="w-full bg-indigo-600 text-white py-8 px-6 rounded-lg text-xl font-semibold shadow-lg hover:bg-indigo-700 transition-transform transform hover:scale-105"
                >
                  Play as Guest
                </button>
              </div>

              {/* Google Button + Label */}
              <div className="flex flex-col items-center flex-1 w-full">
                <button
                  disabled
                  className="w-full bg-white border-2 border-gray-300 text-gray-500 py-4 px-6 rounded-lg text-xl font-semibold shadow-lg cursor-not-allowed flex items-center justify-center gap-3"
                >
                  <svg className="w-6 h-6" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                  Sign in with Google
                </button>
                <p className="text-xs text-gray-500 mt-2">(Coming Soon, Allows Progress Saving)</p>
              </div>
            </div>
          </div>
        )}

        {
          page === 'gameMode' && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
                  <Target className="text-indigo-600" />
                  Wordle Optimization Bot
                </h1>
                <p className="text-gray-600">Probability-Based Smart Wordle Helper</p>
              </div>
              <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Choose Game Mode</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  <button
                    onClick={startRandomGame}
                    disabled={isLoading}
                    className="p-4 border-2 border-indigo-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                  >
                    <Shuffle className="mx-auto text-indigo-600 mb-2" size={32} />
                    <h3 className="font-semibold text-gray-800">Random Word</h3>
                    <p className="text-sm text-gray-600 mt-1">Take on a random Wordle challenge</p>
                  </button>
                  <button
                    onClick={startDailyWordle}
                    disabled={isLoading}
                    className="p-4 border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors disabled:opacity-50"
                  >
                    <Calendar className="mx-auto text-green-600 mb-2" size={32} />
                    <h3 className="font-semibold text-gray-800">Daily Wordle</h3>
                    <p className="text-sm text-gray-600 mt-1">Practice with today's actual Wordle word</p>
                    {isLoading && <div className="text-xs text-green-600 mt-1">Fetching today's word...</div>}
                  </button>
                  <button
                    disabled
                    className="p-4 border-2 border-gray-200 rounded-lg transition-colors disabled:opacity-50 cursor-not-allowed"
                  >
                    <Calendar className="mx-auto text-gray-400 mb-2" size={32} />
                    <h3 className="font-semibold text-gray-500">Previous Daily Wordles</h3>
                    <p className="text-sm text-gray-400 mt-1">Coming Soon</p>
                  </button>
                </div>
              </div>
            </>
          )
        }

        {
          page === 'game' && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
                  <Target className="text-indigo-600" />
                  Wordle Optimization Bot
                </h1>
                <p className="text-gray-600">Probability-Based Smart Wordle Helper</p>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Input Section */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-semibold mb-4 text-gray-800">Enter Your Guess</h2>

                  <div className="space-y-4">
                    {/* Target Word Display */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Target Word:</span>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {targetWordSource === 'random' && <><Shuffle size={12} /> Random</>}
                          {targetWordSource === 'daily' && <><Calendar size={12} /> Daily ({dailyWordDate})</>}
                        </div>
                      </div>
                      <div className="text-2xl font-mono font-bold text-center text-gray-800 uppercase tracking-widest bg-white p-3 rounded border-2 border-gray-200">
                        {gameState === 'playing' ? '? ? ? ? ?' : targetWord.toUpperCase()}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Guess (5 letters):
                      </label>
                      <input
                        type="text"
                        value={currentGuess}
                        onChange={(e) => setCurrentGuess(e.target.value.toLowerCase())}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase tracking-widest text-center text-lg font-mono"
                        maxLength={5}
                        placeholder="WORDS"
                        disabled={gameState !== 'playing'}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={addGuess}
                        disabled={gameState !== 'playing'}
                        className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        Add Guess
                      </button>
                      <button
                        onClick={reset}
                        className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <RefreshCw size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="text-blue-600" size={20} />
                      <h3 className="font-medium text-blue-800">Colors in Guess History:</h3>
                    </div>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li><strong>Green</strong> = correct letter, correct position</li>
                      <li><strong>Yellow</strong> = correct letter, wrong position</li>
                      <li><strong>Gray</strong> = letter not in word</li>
                    </ul>
                  </div>

                  {/* Guess History */}
                  {guesses.length > 0 && (
                    <div className="mt-6 bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 text-gray-800">Guess History</h3>
                      <div className="space-y-2">
                        {guesses.map((guess, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-2 bg-white rounded">
                            <div className="text-sm font-medium text-gray-600 w-8">#{guess.attempt}</div>
                            <div className="flex gap-1">
                              {guess.word.split('').map((letter, letterIdx) => (
                                <div key={letterIdx} className="w-8 h-8 flex items-center justify-center text-white font-bold rounded">
                                  <div className={`w-full h-full flex items-center justify-center rounded ${getFeedbackColor(guess.feedback[letterIdx])}`}>
                                    {letter.toUpperCase()}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="text-xs text-gray-600 font-mono">{guess.feedback}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Analysis Section */}
                {hintExpanded ? (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    {/* Collapsible Hint Header */}
                    <div
                      className={`select-none cursor-pointer flex items-center gap-2 text-xl font-semibold text-gray-800 mb-4`}
                      onClick={() => setHintExpanded((v) => !v)}
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setHintExpanded(v => !v); }}
                      aria-expanded={hintExpanded}
                      aria-controls="hint-content"
                    >
                      <span>Hint</span>
                      <span className="ml-1 text-gray-500 text-base">▲</span>
                    </div>
                    <div id="hint-content" className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="text-green-600" size={20} />
                          <h3 className="font-medium text-green-800">Recommended Next Guess:</h3>
                        </div>
                        <div className="text-2xl font-mono font-bold text-green-700 uppercase tracking-widest">
                          {recommendation}
                        </div>
                      </div>
                      <div className="grid grid-cols-[1fr_2fr] gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm text-gray-600">Attempt</div>
                          <div className="text-xl font-bold text-gray-800">{attempt}/6</div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm text-gray-600">Possible Words Remaining</div>
                          <div className="text-xl font-bold text-gray-800">{possibleWords.length}</div>
                        </div>
                      </div>
                      {possibleWords.length <= 10 && possibleWords.length > 1 && (
                        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <h3 className="font-medium text-yellow-800 mb-2">Remaining Possibilities:</h3>
                          <div className="flex flex-wrap gap-2">
                            {possibleWords.slice(0, 10).map((word, idx) => (
                              <span key={idx} className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-sm font-mono uppercase">
                                {word}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Letter Frequency Display */}
                      <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                        <h3 className="font-medium text-indigo-800 mb-2">Most Common Letter Probabilities in Remaining Words:</h3>
                        <div className="grid grid-cols-4 gap-2">
                          {getTopLetters().map(({ letter, freq }) => (
                            <div key={letter} className="text-center">
                              <div className="font-mono font-bold text-indigo-700">{letter}</div>
                              <div className="text-xs text-indigo-600">{freq}%</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="select-none cursor-pointer flex flex-row items-center gap-1 text-xl font-semibold text-gray-800 bg-white rounded-full shadow px-20 py-10 w-fit"
                    style={{ margin: 0, minHeight: 'unset', background: 'white', height: '2.2rem', lineHeight: '2.2rem' }}
                    onClick={() => setHintExpanded(true)}
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setHintExpanded(true); }}
                    aria-expanded={false}
                    aria-controls="hint-content"
                  >
                    <span style={{ padding: 0, margin: 0, lineHeight: '2rem', height: '2rem', display: 'inline-block' }}>Hint</span>
                    <span className="text-gray-500 text-base" style={{ lineHeight: '2rem', height: '2rem', display: 'inline-block' }}>▼</span>
                  </div>
                )}
              </div>
            </>
          )
        }
      </div >
    </div >
  );
};

export default WordleOptimizer;