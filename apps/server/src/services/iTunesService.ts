import axios from 'axios';

interface iTunesTrack {
    trackId: number;
    trackName: string;
    artistName: string;
    previewUrl: string;
    artworkUrl100: string; // Album cover
    kind: string;
}

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
 * Artistes par thème spécial
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
    'movie-soundtracks': [
        'Céline Dion', 'Whitney Houston', 'Adele', 'Eminem', 'John Travolta',
        'Olivia Newton-John', 'Bryan Adams', 'Berlin', 'Elton John', 'Phil Collins',
        'Queen', 'Survivor', 'Kenny Loggins', 'Vangelis', 'Hans Zimmer',
    ],
    'tv-themes': [
        'Rembrandts', 'Bill Conti', 'Ramin Djawadi', 'Bear McCreary', 'Mark Snow',
        'Danny Elfman', 'Jeff Buckley',
    ],
};

/**
 * Used tracks cache to avoid repeating songs within the same game session.
 * Keys are room-level, but since ITunesService is a singleton, we use a simple Set.
 * Cleared periodically or when it grows too large.
 */
const recentTrackIds = new Set<number>();
const MAX_RECENT_TRACKS = 500;

export class ITunesService {
    private readonly ITUNES_API_URL = 'https://itunes.apple.com/search';

    /**
     * Fetches a random popular track for a given genre.
     * Strategy: pick a random well-known artist for the genre, then search their catalog.
     * This ensures we always get recognizable, well-known songs.
     */
    async getRandomTrack(genre: string = 'pop'): Promise<{
        trackId: string;
        trackTitle: string;
        artistName: string;
        previewUrl: string;
        albumCover: string;
    } | null> {
        try {
            const normalizedGenre = genre.toLowerCase();
            const artists = POPULAR_ARTISTS[normalizedGenre]
                || POPULAR_ARTISTS_BY_DECADE[normalizedGenre]
                || THEME_ARTISTS[normalizedGenre];

            let term: string;
            if (artists && artists.length > 0) {
                // Pick a random popular artist from the genre list
                const randomArtist = artists[Math.floor(Math.random() * artists.length)];
                term = randomArtist;
            } else {
                // Unknown genre: search directly with "hits" qualifier
                term = `${genre} hits`;
            }

            const response = await axios.get(this.ITUNES_API_URL, {
                params: {
                    term,
                    media: 'music',
                    entity: 'song',
                    limit: 50,
                    country: 'FR',
                },
            });

            const results = response.data.results as iTunesTrack[];

            // Filter tracks with previewUrl and avoid recent duplicates
            const validTracks = results.filter(
                (t) => t.previewUrl && t.kind === 'song' && !recentTrackIds.has(t.trackId)
            );

            if (validTracks.length === 0) {
                // Fallback: allow duplicates if everything was filtered
                const fallback = results.filter((t) => t.previewUrl && t.kind === 'song');
                if (fallback.length === 0) return null;
                return this.pickTrack(fallback);
            }

            return this.pickTrack(validTracks);

        } catch (error) {
            console.error('Error fetching track from iTunes:', error);
            return null;
        }
    }

    private pickTrack(tracks: iTunesTrack[]): {
        trackId: string;
        trackTitle: string;
        artistName: string;
        previewUrl: string;
        albumCover: string;
    } {
        const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];

        // Track this song to avoid repeats
        recentTrackIds.add(randomTrack.trackId);
        if (recentTrackIds.size > MAX_RECENT_TRACKS) {
            recentTrackIds.clear();
        }

        // Replace 100x100 artwork with 600x600 for better quality
        const highResArtwork = randomTrack.artworkUrl100.replace('100x100bb', '600x600bb');

        return {
            trackId: randomTrack.trackId.toString(),
            trackTitle: randomTrack.trackName,
            artistName: randomTrack.artistName,
            previewUrl: randomTrack.previewUrl,
            albumCover: highResArtwork,
        };
    }
}

export const itunesService = new ITunesService();
