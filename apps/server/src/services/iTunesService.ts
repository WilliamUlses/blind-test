import axios from 'axios';
import { normalizeString, similarityScore } from './AnswerChecker';

interface iTunesTrack {
    trackId: number;
    trackName: string;
    artistName: string;
    previewUrl: string;
    artworkUrl100: string;
    kind: string;
    releaseDate?: string;
}

/**
 * Entrée curatée pour les bandes-son de films et séries TV.
 * Le joueur doit deviner le titre du film/série, pas le titre de la chanson.
 */
interface SoundtrackEntry {
    query: string;        // Terme de recherche iTunes (chanson + artiste)
    displayTitle: string; // Titre du film/série — ce que le joueur doit deviner
    artistHint: string;   // Pour vérification du résultat API
    theme: 'movie-soundtracks' | 'tv-themes';
}

// ─── Curated soundtrack entries ─────────────────────────────────────────────

const SOUNDTRACK_ENTRIES: SoundtrackEntry[] = [
    // ── Films ────────────────────────────────────────────────────────────────
    { query: 'My Heart Will Go On Celine Dion', displayTitle: 'Titanic', artistHint: 'Céline Dion', theme: 'movie-soundtracks' },
    { query: 'Eye of the Tiger Survivor', displayTitle: 'Rocky III', artistHint: 'Survivor', theme: 'movie-soundtracks' },
    { query: 'Skyfall Adele', displayTitle: 'Skyfall (James Bond)', artistHint: 'Adele', theme: 'movie-soundtracks' },
    { query: 'Lose Yourself Eminem', displayTitle: '8 Mile', artistHint: 'Eminem', theme: 'movie-soundtracks' },
    { query: 'I Will Always Love You Whitney Houston', displayTitle: 'Bodyguard', artistHint: 'Whitney Houston', theme: 'movie-soundtracks' },
    { query: 'Stayin Alive Bee Gees', displayTitle: 'La Fièvre du Samedi Soir', artistHint: 'Bee Gees', theme: 'movie-soundtracks' },
    { query: 'Ghostbusters Ray Parker Jr', displayTitle: 'Ghostbusters', artistHint: 'Ray Parker Jr.', theme: 'movie-soundtracks' },
    { query: 'Happy Pharrell Williams', displayTitle: 'Moi Moche et Méchant 2', artistHint: 'Pharrell Williams', theme: 'movie-soundtracks' },
    { query: 'Let It Go Idina Menzel', displayTitle: 'La Reine des Neiges', artistHint: 'Idina Menzel', theme: 'movie-soundtracks' },
    { query: 'Circle of Life Elton John', displayTitle: 'Le Roi Lion', artistHint: 'Elton John', theme: 'movie-soundtracks' },
    { query: 'A Whole New World Aladdin', displayTitle: 'Aladdin', artistHint: 'Peabo Bryson', theme: 'movie-soundtracks' },
    { query: 'Mamma Mia ABBA', displayTitle: 'Mamma Mia', artistHint: 'ABBA', theme: 'movie-soundtracks' },
    { query: 'Unchained Melody Righteous Brothers', displayTitle: 'Ghost', artistHint: 'The Righteous Brothers', theme: 'movie-soundtracks' },
    { query: 'Don\'t You Forget About Me Simple Minds', displayTitle: 'Breakfast Club', artistHint: 'Simple Minds', theme: 'movie-soundtracks' },
    { query: 'Take My Breath Away Berlin', displayTitle: 'Top Gun', artistHint: 'Berlin', theme: 'movie-soundtracks' },
    { query: 'Footloose Kenny Loggins', displayTitle: 'Footloose', artistHint: 'Kenny Loggins', theme: 'movie-soundtracks' },
    { query: 'Everything I Do Bryan Adams', displayTitle: 'Robin des Bois : Prince des Voleurs', artistHint: 'Bryan Adams', theme: 'movie-soundtracks' },
    { query: 'You\'re The One That I Want Grease', displayTitle: 'Grease', artistHint: 'John Travolta', theme: 'movie-soundtracks' },
    { query: 'Shallow Lady Gaga', displayTitle: 'A Star Is Born', artistHint: 'Lady Gaga', theme: 'movie-soundtracks' },
    { query: 'See You Again Wiz Khalifa', displayTitle: 'Fast & Furious 7', artistHint: 'Wiz Khalifa', theme: 'movie-soundtracks' },
    { query: 'Hakuna Matata Lion King', displayTitle: 'Le Roi Lion', artistHint: 'Nathan Lane', theme: 'movie-soundtracks' },
    { query: 'Under Pressure Queen David Bowie', displayTitle: 'Le Roi Lion (2019)', artistHint: 'Queen', theme: 'movie-soundtracks' },
    { query: 'What a Wonderful World Louis Armstrong', displayTitle: 'Good Morning Vietnam', artistHint: 'Louis Armstrong', theme: 'movie-soundtracks' },
    { query: 'Born to Be Wild Steppenwolf', displayTitle: 'Easy Rider', artistHint: 'Steppenwolf', theme: 'movie-soundtracks' },
    { query: 'Danger Zone Kenny Loggins', displayTitle: 'Top Gun', artistHint: 'Kenny Loggins', theme: 'movie-soundtracks' },
    { query: 'Purple Rain Prince', displayTitle: 'Purple Rain', artistHint: 'Prince', theme: 'movie-soundtracks' },
    { query: 'My Girl Temptations', displayTitle: 'My Girl', artistHint: 'The Temptations', theme: 'movie-soundtracks' },
    { query: 'Gonna Fly Now Bill Conti', displayTitle: 'Rocky', artistHint: 'Bill Conti', theme: 'movie-soundtracks' },
    { query: 'Chariots of Fire Vangelis', displayTitle: 'Les Chariots de Feu', artistHint: 'Vangelis', theme: 'movie-soundtracks' },
    { query: 'Bella Ciao Money Heist', displayTitle: 'La Casa de Papel', artistHint: 'Bella Ciao', theme: 'movie-soundtracks' },

    // ── Séries TV ────────────────────────────────────────────────────────────
    { query: 'I\'ll Be There For You Rembrandts', displayTitle: 'Friends', artistHint: 'The Rembrandts', theme: 'tv-themes' },
    { query: 'Game of Thrones Main Theme Ramin Djawadi', displayTitle: 'Game of Thrones', artistHint: 'Ramin Djawadi', theme: 'tv-themes' },
    { query: 'Stranger Things Theme', displayTitle: 'Stranger Things', artistHint: 'Kyle Dixon', theme: 'tv-themes' },
    { query: 'The Office Theme Song', displayTitle: 'The Office', artistHint: 'The Scrantones', theme: 'tv-themes' },
    { query: 'Woke Up This Morning Alabama 3', displayTitle: 'Les Soprano', artistHint: 'Alabama 3', theme: 'tv-themes' },
    { query: 'Theme from New York New York Sinatra', displayTitle: 'New York Unité Spéciale', artistHint: 'Frank Sinatra', theme: 'tv-themes' },
    { query: 'Breaking Bad Main Title Theme', displayTitle: 'Breaking Bad', artistHint: 'Dave Porter', theme: 'tv-themes' },
    { query: 'Simpsons Theme Danny Elfman', displayTitle: 'Les Simpson', artistHint: 'Danny Elfman', theme: 'tv-themes' },
    { query: 'Imperial March Star Wars', displayTitle: 'Star Wars', artistHint: 'John Williams', theme: 'tv-themes' },
    { query: 'Peaky Blinders Red Right Hand', displayTitle: 'Peaky Blinders', artistHint: 'Nick Cave', theme: 'tv-themes' },
    { query: 'Hawaii Five-0 Theme', displayTitle: 'Hawaii 5-0', artistHint: 'The Ventures', theme: 'tv-themes' },
    { query: 'Mission Impossible Theme', displayTitle: 'Mission Impossible', artistHint: 'Lalo Schifrin', theme: 'tv-themes' },
    { query: 'Pink Panther Theme Henry Mancini', displayTitle: 'La Panthère Rose', artistHint: 'Henry Mancini', theme: 'tv-themes' },
    { query: 'Downton Abbey Theme', displayTitle: 'Downton Abbey', artistHint: 'John Lunn', theme: 'tv-themes' },
    { query: 'The X-Files Theme Mark Snow', displayTitle: 'X-Files', artistHint: 'Mark Snow', theme: 'tv-themes' },
    { query: 'Twin Peaks Theme Angelo Badalamenti', displayTitle: 'Twin Peaks', artistHint: 'Angelo Badalamenti', theme: 'tv-themes' },
    { query: 'Westworld Main Theme Ramin Djawadi', displayTitle: 'Westworld', artistHint: 'Ramin Djawadi', theme: 'tv-themes' },
    { query: 'Succession Theme', displayTitle: 'Succession', artistHint: 'Nicholas Britell', theme: 'tv-themes' },
    { query: 'The Mandalorian Theme Ludwig Goransson', displayTitle: 'The Mandalorian', artistHint: 'Ludwig Göransson', theme: 'tv-themes' },
    { query: 'Dexter Theme Rolfe Kent', displayTitle: 'Dexter', artistHint: 'Rolfe Kent', theme: 'tv-themes' },
];

/**
 * Artistes populaires par genre, connus du public français.
 * Mélange FR / US / international pour chaque genre.
 */
const POPULAR_ARTISTS: Record<string, string[]> = {
    pop: [
        'Dua Lipa', 'Ed Sheeran', 'Adele', 'Bruno Mars', 'Taylor Swift',
        'The Weeknd', 'Billie Eilish', 'Harry Styles', 'Lady Gaga', 'Rihanna',
        'Stromae', 'Angèle', 'Aya Nakamura', 'Céline Dion', 'Indila',
        'Sia', 'Justin Timberlake', 'Shakira', 'Coldplay', 'Maroon 5',
        'Michael Jackson', 'Queen', 'ABBA', 'Whitney Houston', 'Beyoncé',
        'Ariana Grande', 'Katy Perry', 'Pink', 'Elton John', 'Phil Collins',
    ],
    rock: [
        'Queen', 'AC/DC', 'Nirvana', 'The Rolling Stones', 'U2',
        'Muse', 'Red Hot Chili Peppers', 'Foo Fighters', 'Oasis', 'Guns N Roses',
        'Téléphone', 'Noir Désir', 'Indochine', 'Trust', 'Louise Attaque',
        'Imagine Dragons', 'Coldplay', 'Linkin Park', 'Green Day', 'The Cranberries',
        'Eagles', 'Bon Jovi', 'Aerosmith', 'Led Zeppelin', 'Pink Floyd',
    ],
    rap: [
        'Eminem', 'Drake', 'Kendrick Lamar', 'Kanye West', 'Jay-Z',
        'Nekfeu', 'Orelsan', 'PNL', 'Booba', 'Jul',
        'Ninho', 'Damso', 'Soprano', 'Bigflo et Oli', 'Lomepal',
        'MC Solaar', 'IAM', 'NTM', 'Rohff', 'Maître Gims',
        'Travis Scott', '50 Cent', 'Post Malone', 'Snoop Dogg', 'Dr. Dre',
    ],
    'hip-hop': [
        'Drake', 'Kanye West', 'Eminem', 'Kendrick Lamar', 'Jay-Z',
        'PNL', 'Orelsan', 'Nekfeu', 'Booba', 'Jul',
        'Ninho', 'Damso', 'Lomepal', 'Vald', 'Soprano',
        'Post Malone', 'Travis Scott', 'The Notorious B.I.G.', '2Pac', 'Snoop Dogg',
    ],
    dance: [
        'Daft Punk', 'David Guetta', 'Calvin Harris', 'Avicii', 'Martin Garrix',
        'Bob Sinclar', 'DJ Snake', 'Kungs', 'Ofenbach', 'Robin Schulz',
        'Kygo', 'Marshmello', 'Tiësto', 'Swedish House Mafia', 'Major Lazer',
        'Disclosure', 'Clean Bandit', 'Sigala', 'Joel Corry', 'Fisher',
    ],
    electro: [
        'Daft Punk', 'David Guetta', 'Justice', 'DJ Snake', 'Kavinsky',
        'Gesaffelstein', 'Cassius', 'Bob Sinclar', 'Martin Solveig', 'Kungs',
        'Calvin Harris', 'Avicii', 'Deadmau5', 'Skrillex', 'Marshmello',
        'Kygo', 'Flume', 'ODESZA', 'The Chemical Brothers', 'Fatboy Slim',
    ],
    jazz: [
        'Miles Davis', 'John Coltrane', 'Louis Armstrong', 'Ella Fitzgerald', 'Nina Simone',
        'Frank Sinatra', 'Norah Jones', 'Michael Bublé', 'Diana Krall', 'Jamie Cullum',
        'Claude Nougaro', 'Henri Salvador', 'Melody Gardot', 'Ibrahim Maalouf', 'Erik Truffaz',
    ],
    blues: [
        'B.B. King', 'Muddy Waters', 'John Lee Hooker', 'Eric Clapton', 'Stevie Ray Vaughan',
        'Ray Charles', 'Etta James', 'Buddy Guy', 'Robert Johnson', 'Howlin Wolf',
        'Joe Bonamassa', 'Gary Moore', 'Albert King', 'Taj Mahal', 'Keb Mo',
    ],
    country: [
        'Johnny Cash', 'Dolly Parton', 'John Denver', 'Kenny Rogers', 'Willie Nelson',
        'Shania Twain', 'Taylor Swift', 'Carrie Underwood', 'Luke Bryan', 'Morgan Wallen',
        'Tim McGraw', 'Keith Urban', 'Blake Shelton', 'Garth Brooks', 'Alan Jackson',
    ],
    reggae: [
        'Bob Marley', 'Jimmy Cliff', 'Peter Tosh', 'UB40', 'Alpha Blondy',
        'Tiken Jah Fakoly', 'Tryo', 'Dub Inc', 'Groundation', 'Steel Pulse',
        'Sean Paul', 'Shaggy', 'Damian Marley', 'Ziggy Marley', 'Burning Spear',
    ],
};

/**
 * Artistes populaires par décennie
 */
const POPULAR_ARTISTS_BY_DECADE: Record<string, string[]> = {
    '80s': [
        'Michael Jackson', 'Madonna', 'Prince', 'Queen', 'Cyndi Lauper',
        'Bon Jovi', 'Whitney Houston', 'A-ha', 'Depeche Mode', 'Dire Straits',
        'Eurythmics', 'Wham!', 'Phil Collins', 'Tina Turner', 'David Bowie',
        'George Michael', 'The Police', 'U2', 'Culture Club', 'Duran Duran',
    ],
    '90s': [
        'Nirvana', 'Oasis', 'Spice Girls', 'Backstreet Boys', 'Britney Spears',
        'TLC', 'Alanis Morissette', 'No Doubt', 'Radiohead', 'Green Day',
        'The Cranberries', 'Blur', 'R.E.M.', 'Mariah Carey', 'Celine Dion',
        'Ace of Base', 'Fugees', 'Daft Punk', 'MC Solaar', 'IAM',
    ],
    '2000s': [
        'Beyoncé', 'Eminem', 'Coldplay', 'Alicia Keys', 'Usher',
        'Black Eyed Peas', 'Rihanna', 'Amy Winehouse', '50 Cent', 'Kanye West',
        'Shakira', 'Linkin Park', 'Avril Lavigne', 'Nelly Furtado', 'Justin Timberlake',
        'OutKast', 'Jay-Z', 'Stromae', 'Diam\'s', 'M Pokora',
    ],
    '2010s': [
        'Adele', 'Bruno Mars', 'Ed Sheeran', 'Taylor Swift', 'Drake',
        'The Weeknd', 'Ariana Grande', 'Imagine Dragons', 'Lorde', 'Sam Smith',
        'Pharrell Williams', 'Avicii', 'David Guetta', 'Maître Gims', 'Stromae',
        'Angèle', 'Aya Nakamura', 'Nekfeu', 'Orelsan', 'PNL',
    ],
};

/**
 * Artistes par thème spécial (hors films/séries, gérés par SOUNDTRACK_ENTRIES)
 */
const THEME_ARTISTS: Record<string, string[]> = {
    'french-classics': [
        'Édith Piaf', 'Jacques Brel', 'Charles Aznavour', 'Claude François', 'Serge Gainsbourg',
        'Françoise Hardy', 'Johnny Hallyday', 'Michel Sardou', 'France Gall', 'Dalida',
        'Joe Dassin', 'Alain Bashung', 'Jean-Jacques Goldman', 'Michel Polnareff', 'Renaud',
    ],
    'summer-hits': [
        'Luis Fonsi', 'Shakira', 'Sean Paul', 'DJ Snake', 'Major Lazer',
        'Kygo', 'David Guetta', 'Bob Sinclar', 'Ricky Martin', 'Los Del Rio',
        'Gala', 'Daddy Yankee', 'J Balvin', 'Ofenbach', 'Jason Derulo',
    ],
};

/**
 * Used tracks cache to avoid repeating songs within the same game session.
 */
const recentTrackIds = new Set<number>();
const MAX_RECENT_TRACKS = 500;

/** Max results to pick from (top of popularity-sorted list) */
const TOP_N_PICK = 15;

/** Similarity threshold for artist name matching (stricter than answer checking) */
const ARTIST_MATCH_THRESHOLD = 0.8;

export class ITunesService {
    private readonly ITUNES_API_URL = 'https://itunes.apple.com/search';

    /** Artists already used in the current game session — prevents repeats */
    private usedArtists = new Set<string>();

    /** Soundtrack entries already used in the current game session */
    private usedSoundtrackIndices = new Set<number>();

    /**
     * Reset used artists/soundtracks for a new game session.
     * Called from GameManager.startGame() and resetForNewGame().
     */
    public resetUsedArtists(): void {
        this.usedArtists.clear();
        this.usedSoundtrackIndices.clear();
    }

    /**
     * Fetches a random popular track for a given genre.
     * For movie-soundtracks / tv-themes, uses curated entries.
     * For music genres, picks a random artist and searches with artist filtering.
     */
    async getRandomTrack(genre: string = 'pop'): Promise<{
        trackId: string;
        trackTitle: string;
        artistName: string;
        previewUrl: string;
        albumCover: string;
        releaseYear: number;
    } | null> {
        const normalizedGenre = genre.toLowerCase();

        // Soundtrack/TV genres use curated entries
        if (normalizedGenre === 'movie-soundtracks' || normalizedGenre === 'tv-themes') {
            return this.getRandomSoundtrackTrack(normalizedGenre as 'movie-soundtracks' | 'tv-themes');
        }

        return this.getRandomArtistTrack(normalizedGenre);
    }

    /**
     * Standard music genre: pick a random artist, search iTunes with artist filtering,
     * post-filter results, and pick from the top 15 most popular.
     */
    private async getRandomArtistTrack(genre: string): Promise<{
        trackId: string;
        trackTitle: string;
        artistName: string;
        previewUrl: string;
        albumCover: string;
        releaseYear: number;
    } | null> {
        try {
            const artists = POPULAR_ARTISTS[genre]
                || POPULAR_ARTISTS_BY_DECADE[genre]
                || THEME_ARTISTS[genre];

            let searchedArtist: string;

            if (artists && artists.length > 0) {
                // Filter out already-used artists
                const available = artists.filter(a => !this.usedArtists.has(normalizeString(a)));

                if (available.length === 0) {
                    // All artists exhausted — reset and repick
                    this.usedArtists.clear();
                    searchedArtist = artists[Math.floor(Math.random() * artists.length)];
                } else {
                    searchedArtist = available[Math.floor(Math.random() * available.length)];
                }
            } else {
                // Unknown genre: search directly with "hits" qualifier
                const response = await axios.get(this.ITUNES_API_URL, {
                    params: {
                        term: `${genre} hits`,
                        media: 'music',
                        entity: 'song',
                        limit: 50,
                        country: 'FR',
                    },
                });
                const results = response.data.results as iTunesTrack[];
                const validTracks = results.filter(
                    (t) => t.previewUrl && t.kind === 'song' && !recentTrackIds.has(t.trackId)
                );
                if (validTracks.length === 0) {
                    const fallback = results.filter((t) => t.previewUrl && t.kind === 'song');
                    if (fallback.length === 0) return null;
                    return this.pickTrack(fallback);
                }
                return this.pickTrack(validTracks.slice(0, TOP_N_PICK));
            }

            // Mark artist as used
            this.usedArtists.add(normalizeString(searchedArtist));

            const response = await axios.get(this.ITUNES_API_URL, {
                params: {
                    term: searchedArtist,
                    media: 'music',
                    entity: 'song',
                    attribute: 'artistTerm',
                    sort: 'popular',
                    limit: 50,
                    country: 'FR',
                },
            });

            const results = response.data.results as iTunesTrack[];

            // Post-filter: verify the result artist actually matches the searched artist
            const normSearched = normalizeString(searchedArtist);
            const validTracks = results.filter((t) => {
                if (!t.previewUrl || t.kind !== 'song' || recentTrackIds.has(t.trackId)) return false;
                const normResult = normalizeString(t.artistName);
                return normResult.includes(normSearched)
                    || normSearched.includes(normResult)
                    || similarityScore(normResult, normSearched) >= ARTIST_MATCH_THRESHOLD;
            });

            if (validTracks.length === 0) {
                // Fallback: allow any track with preview (skip artist filter)
                const fallback = results.filter((t) => t.previewUrl && t.kind === 'song');
                if (fallback.length === 0) return null;
                return this.pickTrack(fallback.slice(0, TOP_N_PICK));
            }

            // Pick from top N (already sorted by popularity thanks to sort=popular)
            return this.pickTrack(validTracks.slice(0, TOP_N_PICK));

        } catch (error) {
            console.error('Error fetching track from iTunes:', error);
            return null;
        }
    }

    /**
     * Soundtrack/TV: use curated entries. The player guesses the film/series title,
     * not the song title.
     */
    private async getRandomSoundtrackTrack(theme: 'movie-soundtracks' | 'tv-themes'): Promise<{
        trackId: string;
        trackTitle: string;
        artistName: string;
        previewUrl: string;
        albumCover: string;
        releaseYear: number;
    } | null> {
        try {
            // Filter entries for this theme
            const themeEntries = SOUNDTRACK_ENTRIES
                .map((entry, index) => ({ entry, index }))
                .filter(({ entry, index }) => entry.theme === theme && !this.usedSoundtrackIndices.has(index));

            if (themeEntries.length === 0) {
                // All exhausted — reset and repick
                this.usedSoundtrackIndices.clear();
                const allTheme = SOUNDTRACK_ENTRIES
                    .map((entry, index) => ({ entry, index }))
                    .filter(({ entry }) => entry.theme === theme);
                if (allTheme.length === 0) return null;
                return this.searchSoundtrackEntry(allTheme[Math.floor(Math.random() * allTheme.length)]);
            }

            const picked = themeEntries[Math.floor(Math.random() * themeEntries.length)];
            return this.searchSoundtrackEntry(picked);

        } catch (error) {
            console.error('Error fetching soundtrack track from iTunes:', error);
            return null;
        }
    }

    /**
     * Search iTunes for a curated soundtrack entry and return with displayTitle as trackTitle.
     */
    private async searchSoundtrackEntry(picked: { entry: SoundtrackEntry; index: number }): Promise<{
        trackId: string;
        trackTitle: string;
        artistName: string;
        previewUrl: string;
        albumCover: string;
        releaseYear: number;
    } | null> {
        const { entry, index } = picked;

        // Mark as used
        this.usedSoundtrackIndices.add(index);

        const response = await axios.get(this.ITUNES_API_URL, {
            params: {
                term: entry.query,
                media: 'music',
                entity: 'song',
                limit: 10,
                country: 'FR',
            },
        });

        const results = response.data.results as iTunesTrack[];
        const validTracks = results.filter((t) => t.previewUrl && t.kind === 'song');

        if (validTracks.length === 0) return null;

        const track = validTracks[0]; // Take the top result (most relevant)

        recentTrackIds.add(track.trackId);
        if (recentTrackIds.size > MAX_RECENT_TRACKS) {
            recentTrackIds.clear();
        }

        const highResArtwork = track.artworkUrl100.replace('100x100bb', '600x600bb');
        const releaseYear = track.releaseDate ? new Date(track.releaseDate).getFullYear() : 2000;

        return {
            trackId: track.trackId.toString(),
            trackTitle: entry.displayTitle,  // Film/series title — NOT the song title
            artistName: track.artistName,
            previewUrl: track.previewUrl,
            albumCover: highResArtwork,
            releaseYear,
        };
    }

    private pickTrack(tracks: iTunesTrack[]): {
        trackId: string;
        trackTitle: string;
        artistName: string;
        previewUrl: string;
        albumCover: string;
        releaseYear: number;
    } {
        const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];

        // Track this song to avoid repeats
        recentTrackIds.add(randomTrack.trackId);
        if (recentTrackIds.size > MAX_RECENT_TRACKS) {
            recentTrackIds.clear();
        }

        // Replace 100x100 artwork with 600x600 for better quality
        const highResArtwork = randomTrack.artworkUrl100.replace('100x100bb', '600x600bb');
        const releaseYear = randomTrack.releaseDate ? new Date(randomTrack.releaseDate).getFullYear() : 2000;

        return {
            trackId: randomTrack.trackId.toString(),
            trackTitle: randomTrack.trackName,
            artistName: randomTrack.artistName,
            previewUrl: randomTrack.previewUrl,
            albumCover: highResArtwork,
            releaseYear,
        };
    }
}

export const itunesService = new ITunesService();
