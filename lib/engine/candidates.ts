export interface CandidateProfile {
  name: string;
  tags: readonly string[];
  /** Slightly higher priors are reserved for extremely common guesses. */
  prior?: number;
}

const real = (name: string, tags: readonly string[], prior?: number): CandidateProfile => ({
  name,
  tags: ["real", ...tags],
  prior,
});

const fictional = (name: string, tags: readonly string[], prior?: number): CandidateProfile => ({
  name,
  tags: ["fictional", ...tags],
  prior,
});

/**
 * Curated high-frequency seed pool.
 *
 * This is deliberately not the complete knowledge base. The hybrid engine uses
 * this pool for deterministic probability + information-gain turns and falls
 * back to the configured LLM for people/characters outside it.
 */
export const CANDIDATES: readonly CandidateProfile[] = [
  // Cricket / India
  real("Virat Kohli", ["alive", "man", "india", "sports", "cricket", "born_after_1980"], 1.35),
  real("MS Dhoni", ["alive", "man", "india", "sports", "cricket", "born_after_1980"], 1.25),
  real("Sachin Tendulkar", ["alive", "man", "india", "sports", "cricket", "born_before_1980"], 1.2),
  real("Rohit Sharma", ["alive", "man", "india", "sports", "cricket", "born_after_1980"], 1.1),
  real("Jasprit Bumrah", ["alive", "man", "india", "sports", "cricket", "born_after_1980"], 0.95),
  real("Hardik Pandya", ["alive", "man", "india", "sports", "cricket", "born_after_1980"], 0.95),
  real("Smriti Mandhana", ["alive", "woman", "india", "sports", "cricket", "born_after_1980"], 0.9),

  // Football / global sport
  real("Cristiano Ronaldo", ["alive", "man", "sports", "football", "europe", "born_after_1980"], 1.35),
  real("Lionel Messi", ["alive", "man", "sports", "football", "south_america", "born_after_1980"], 1.35),
  real("Neymar", ["alive", "man", "sports", "football", "south_america", "born_after_1980"], 1.05),
  real("Kylian Mbappe", ["alive", "man", "sports", "football", "europe", "born_after_1980"], 1.05),
  real("Erling Haaland", ["alive", "man", "sports", "football", "europe", "born_after_2000"], 0.95),
  real("Michael Jordan", ["alive", "man", "sports", "basketball", "usa", "born_before_1980"], 1.1),
  real("LeBron James", ["alive", "man", "sports", "basketball", "usa", "born_after_1980"], 1.1),
  real("Stephen Curry", ["alive", "man", "sports", "basketball", "usa", "born_after_1980"], 0.95),
  real("Serena Williams", ["alive", "woman", "sports", "tennis", "usa", "born_after_1980"], 1.0),
  real("Roger Federer", ["alive", "man", "sports", "tennis", "europe", "born_after_1980"], 1.0),
  real("Novak Djokovic", ["alive", "man", "sports", "tennis", "europe", "born_after_1980"], 1.0),
  real("Rafael Nadal", ["alive", "man", "sports", "tennis", "europe", "born_after_1980"], 1.0),
  real("Lewis Hamilton", ["alive", "man", "sports", "motorsport", "europe", "born_after_1980"], 0.95),
  real("Max Verstappen", ["alive", "man", "sports", "motorsport", "europe", "born_after_1980"], 0.95),
  real("Conor McGregor", ["alive", "man", "sports", "combat_sports", "europe", "born_after_1980"], 0.85),
  real("Muhammad Ali", ["man", "sports", "combat_sports", "usa", "historical", "born_before_1980"], 0.9),

  // Indian cinema
  real("Shah Rukh Khan", ["alive", "man", "india", "acting", "bollywood", "born_before_1980"], 1.3),
  real("Salman Khan", ["alive", "man", "india", "acting", "bollywood", "born_before_1980"], 1.2),
  real("Aamir Khan", ["alive", "man", "india", "acting", "bollywood", "born_before_1980"], 1.1),
  real("Amitabh Bachchan", ["alive", "man", "india", "acting", "bollywood", "born_before_1980"], 1.1),
  real("Ranbir Kapoor", ["alive", "man", "india", "acting", "bollywood", "born_after_1980"], 1.0),
  real("Ranveer Singh", ["alive", "man", "india", "acting", "bollywood", "born_after_1980"], 0.95),
  real("Hrithik Roshan", ["alive", "man", "india", "acting", "bollywood", "born_before_1980"], 1.0),
  real("Deepika Padukone", ["alive", "woman", "india", "acting", "bollywood", "born_after_1980"], 1.05),
  real("Alia Bhatt", ["alive", "woman", "india", "acting", "bollywood", "born_after_1980"], 1.05),
  real("Priyanka Chopra", ["alive", "woman", "india", "acting", "bollywood", "hollywood", "born_after_1980"], 1.0),
  real("Prabhas", ["alive", "man", "india", "acting", "tollywood", "born_after_1980"], 1.2),
  real("Allu Arjun", ["alive", "man", "india", "acting", "tollywood", "born_after_1980"], 1.2),
  real("Ram Charan", ["alive", "man", "india", "acting", "tollywood", "born_after_1980"], 1.1),
  real("Jr NTR", ["alive", "man", "india", "acting", "tollywood", "born_after_1980"], 1.1),
  real("Mahesh Babu", ["alive", "man", "india", "acting", "tollywood", "born_before_1980"], 1.05),
  real("Vijay Deverakonda", ["alive", "man", "india", "acting", "tollywood", "born_after_1980"], 0.95),
  real("Samantha Ruth Prabhu", ["alive", "woman", "india", "acting", "tollywood", "born_after_1980"], 0.95),
  real("Rajinikanth", ["alive", "man", "india", "acting", "south_cinema", "born_before_1980"], 1.1),
  real("Vijay", ["alive", "man", "india", "acting", "south_cinema", "born_before_1980"], 1.05),

  // Hollywood
  real("Leonardo DiCaprio", ["alive", "man", "acting", "hollywood", "usa", "born_before_1980"], 1.15),
  real("Tom Cruise", ["alive", "man", "acting", "hollywood", "usa", "born_before_1980"], 1.15),
  real("Robert Downey Jr.", ["alive", "man", "acting", "hollywood", "usa", "born_before_1980"], 1.15),
  real("Dwayne Johnson", ["alive", "man", "acting", "hollywood", "usa", "sports", "born_before_1980"], 1.0),
  real("Keanu Reeves", ["alive", "man", "acting", "hollywood", "born_before_1980"], 1.0),
  real("Brad Pitt", ["alive", "man", "acting", "hollywood", "usa", "born_before_1980"], 1.0),
  real("Johnny Depp", ["alive", "man", "acting", "hollywood", "usa", "born_before_1980"], 1.0),
  real("Margot Robbie", ["alive", "woman", "acting", "hollywood", "born_after_1980"], 1.0),
  real("Emma Stone", ["alive", "woman", "acting", "hollywood", "usa", "born_after_1980"], 0.95),
  real("Zendaya", ["alive", "woman", "acting", "hollywood", "usa", "born_after_1980"], 1.05),
  real("Jenna Ortega", ["alive", "woman", "acting", "hollywood", "usa", "born_after_2000"], 0.95),
  real("Tom Holland", ["alive", "man", "acting", "hollywood", "europe", "born_after_1980"], 1.05),
  real("Chris Hemsworth", ["alive", "man", "acting", "hollywood", "born_after_1980"], 1.0),

  // Music
  real("Taylor Swift", ["alive", "woman", "music", "usa", "born_after_1980"], 1.35),
  real("Billie Eilish", ["alive", "woman", "music", "usa", "born_after_2000"], 1.05),
  real("Ariana Grande", ["alive", "woman", "music", "usa", "born_after_1980"], 1.05),
  real("Beyonce", ["alive", "woman", "music", "usa", "born_after_1980"], 1.05),
  real("Rihanna", ["alive", "woman", "music", "born_after_1980"], 1.0),
  real("The Weeknd", ["alive", "man", "music", "born_after_1980"], 1.05),
  real("Drake", ["alive", "man", "music", "born_after_1980"], 1.0),
  real("Ed Sheeran", ["alive", "man", "music", "europe", "born_after_1980"], 1.0),
  real("Justin Bieber", ["alive", "man", "music", "born_after_1980"], 1.05),
  real("Eminem", ["alive", "man", "music", "usa", "born_before_1980"], 1.05),
  real("Michael Jackson", ["man", "music", "usa", "historical", "born_before_1980"], 1.2),
  real("Selena Gomez", ["alive", "woman", "music", "acting", "usa", "born_after_1980"], 0.95),
  real("Dua Lipa", ["alive", "woman", "music", "europe", "born_after_1980"], 0.9),
  real("Bruno Mars", ["alive", "man", "music", "usa", "born_after_1980"], 0.95),
  real("Arijit Singh", ["alive", "man", "india", "music", "born_after_1980"], 1.0),
  real("Shreya Ghoshal", ["alive", "woman", "india", "music", "born_after_1980"], 0.95),
  real("A. R. Rahman", ["alive", "man", "india", "music", "born_before_1980"], 1.0),
  real("Diljit Dosanjh", ["alive", "man", "india", "music", "acting", "born_after_1980"], 0.95),

  // Business / politics / science / internet
  real("Elon Musk", ["alive", "man", "business", "tech", "usa", "born_before_1980"], 1.25),
  real("Jeff Bezos", ["alive", "man", "business", "tech", "usa", "born_before_1980"], 1.0),
  real("Mark Zuckerberg", ["alive", "man", "business", "tech", "usa", "born_after_1980"], 1.05),
  real("Bill Gates", ["alive", "man", "business", "tech", "usa", "born_before_1980"], 1.1),
  real("Steve Jobs", ["man", "business", "tech", "usa", "historical", "born_before_1980"], 1.0),
  real("Sundar Pichai", ["alive", "man", "business", "tech", "india", "usa", "born_before_1980"], 0.95),
  real("Satya Nadella", ["alive", "man", "business", "tech", "india", "usa", "born_before_1980"], 0.9),
  real("Mukesh Ambani", ["alive", "man", "business", "india", "born_before_1980"], 1.0),
  real("Narendra Modi", ["alive", "man", "politics", "india", "born_before_1980"], 1.25),
  real("Donald Trump", ["alive", "man", "politics", "business", "usa", "born_before_1980"], 1.2),
  real("Barack Obama", ["alive", "man", "politics", "usa", "born_before_1980"], 1.05),
  real("Joe Biden", ["alive", "man", "politics", "usa", "born_before_1980"], 0.95),
  real("Vladimir Putin", ["alive", "man", "politics", "europe", "born_before_1980"], 1.0),
  real("Volodymyr Zelenskyy", ["alive", "man", "politics", "europe", "born_after_1980"], 0.9),
  real("Rahul Gandhi", ["alive", "man", "politics", "india", "born_before_1980"], 0.9),
  real("Albert Einstein", ["man", "science", "historical", "europe", "born_before_1980"], 1.15),
  real("Isaac Newton", ["man", "science", "historical", "europe", "born_before_1980"], 1.0),
  real("Marie Curie", ["woman", "science", "historical", "europe", "born_before_1980"], 1.0),
  real("Stephen Hawking", ["man", "science", "historical", "europe", "born_before_1980"], 1.0),
  real("A. P. J. Abdul Kalam", ["man", "science", "historical", "india", "born_before_1980"], 1.05),
  real("Nikola Tesla", ["man", "science", "historical", "europe", "born_before_1980"], 0.95),
  real("MrBeast", ["alive", "man", "internet", "creator", "usa", "born_after_1980"], 1.2),
  real("PewDiePie", ["alive", "man", "internet", "creator", "europe", "born_after_1980"], 1.0),
  real("Kai Cenat", ["alive", "man", "internet", "creator", "usa", "born_after_2000"], 0.9),
  real("IShowSpeed", ["alive", "man", "internet", "creator", "usa", "born_after_2000"], 1.0),
  real("CarryMinati", ["alive", "man", "internet", "creator", "india", "born_after_1980"], 0.95),
  real("Bhuvan Bam", ["alive", "man", "internet", "creator", "india", "born_after_1980"], 0.9),

  // Fictional: comics / film / books
  fictional("Spider-Man", ["man", "superhero", "marvel", "comics"], 1.35),
  fictional("Iron Man", ["man", "superhero", "marvel", "comics"], 1.3),
  fictional("Captain America", ["man", "superhero", "marvel", "comics"], 1.05),
  fictional("Thor", ["man", "superhero", "marvel", "comics"], 1.1),
  fictional("Hulk", ["man", "superhero", "marvel", "comics"], 1.05),
  fictional("Deadpool", ["man", "superhero", "marvel", "comics"], 1.0),
  fictional("Thanos", ["man", "supervillain", "marvel", "comics"], 1.05),
  fictional("Loki", ["man", "supervillain", "marvel", "comics"], 1.0),
  fictional("Batman", ["man", "superhero", "dc", "comics"], 1.3),
  fictional("Superman", ["man", "superhero", "dc", "comics"], 1.2),
  fictional("Wonder Woman", ["woman", "superhero", "dc", "comics"], 1.05),
  fictional("Joker", ["man", "supervillain", "dc", "comics"], 1.2),
  fictional("Harry Potter", ["man", "books", "magic", "europe"], 1.25),
  fictional("Hermione Granger", ["woman", "books", "magic", "europe"], 1.0),
  fictional("Lord Voldemort", ["man", "books", "magic", "supervillain", "europe"], 1.0),
  fictional("Sherlock Holmes", ["man", "books", "detective", "europe"], 1.0),
  fictional("Wednesday Addams", ["woman", "tv", "gothic", "usa"], 0.95),
  fictional("Darth Vader", ["man", "star_wars", "supervillain", "space"], 1.05),
  fictional("Yoda", ["man", "star_wars", "space"], 0.9),

  // Anime
  fictional("Naruto Uzumaki", ["man", "anime", "japan", "ninja"], 1.25),
  fictional("Sasuke Uchiha", ["man", "anime", "japan", "ninja"], 1.0),
  fictional("Goku", ["man", "anime", "japan", "fighter"], 1.25),
  fictional("Vegeta", ["man", "anime", "japan", "fighter"], 1.0),
  fictional("Monkey D. Luffy", ["man", "anime", "japan", "pirate"], 1.2),
  fictional("Roronoa Zoro", ["man", "anime", "japan", "pirate"], 0.95),
  fictional("Satoru Gojo", ["man", "anime", "japan", "magic"], 1.05),
  fictional("Ryomen Sukuna", ["man", "anime", "japan", "supervillain", "magic"], 0.9),
  fictional("Eren Yeager", ["man", "anime", "japan"], 0.95),
  fictional("Tanjiro Kamado", ["man", "anime", "japan", "fighter"], 0.9),

  // Games / animation
  fictional("Mario", ["man", "video_game", "animated"], 1.15),
  fictional("Sonic the Hedgehog", ["man", "video_game", "animated"], 1.05),
  fictional("Kratos", ["man", "video_game", "fighter"], 1.0),
  fictional("Lara Croft", ["woman", "video_game"], 0.9),
  fictional("Mickey Mouse", ["man", "animated", "cartoon"], 1.05),
  fictional("SpongeBob SquarePants", ["man", "animated", "cartoon"], 1.15),
  fictional("Shrek", ["man", "animated", "movie"], 1.1),
  fictional("Elsa", ["woman", "animated", "movie", "magic"], 1.0),
  fictional("Woody", ["man", "animated", "movie"], 0.9),
  fictional("Buzz Lightyear", ["man", "animated", "movie", "space"], 0.9),
  fictional("Scooby-Doo", ["animated", "cartoon", "detective"], 0.9),
  fictional("Tom", ["man", "animated", "cartoon"], 0.9),
  fictional("Jerry", ["man", "animated", "cartoon"], 0.9),
];
