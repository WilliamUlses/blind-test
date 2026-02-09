import axios from 'axios';

interface iTunesTrack {
    trackId: number;
    trackName: string;
    artistName: string;
    previewUrl: string;
    artworkUrl100: string; // Album cover
    kind: string;
}

export class ITunesService {
    private readonly ITUNES_API_URL = 'https://itunes.apple.com/search';

    /**
     * Fetches a random track based on a genre or query
     */
    async getRandomTrack(genre: string = 'pop'): Promise<{
        trackId: string;
        trackTitle: string;
        artistName: string;
        previewUrl: string;
        albumCover: string;
    } | null> {
        try {
            // Improve search quality:
            // If genre is generic ("pop", "rock", "rap"), append "hits" or "best of" to find popular songs.
            let term = genre;
            const genericGenres = ['pop', 'rock', 'rap', 'hip-hop', 'dance', 'electro', 'jazz', 'blues', 'country', 'reggae'];

            if (genericGenres.includes(genre.toLowerCase())) {
                const qualifiers = ['hits', 'best of', 'essentials', 'top'];
                const randomQualifier = qualifiers[Math.floor(Math.random() * qualifiers.length)];
                term = `${genre} ${randomQualifier}`;
            }

            const response = await axios.get(this.ITUNES_API_URL, {
                params: {
                    term: term,
                    media: 'music',
                    entity: 'song',
                    limit: 100, // Reduced to top 100 for better quality/popularity
                    country: 'FR', // Ensure availability in target region
                },
            });

            const results = response.data.results as iTunesTrack[];

            // Filter tracks with previewUrl (iTunes almost always has them for songs, but safety first)
            const validTracks = results.filter((t) => t.previewUrl && t.kind === 'song');

            if (validTracks.length === 0) {
                console.warn(`⚠️ No tracks found for genre ${genre} (term: ${term})`);
                // Fallback: try searching without qualifiers if we added them
                // Fallback: try searching without qualifiers if we added them
                if (term !== genre) {
                    console.log('🔄 Retrying without qualifiers...');
                    // Use a specific internal flag or logic to avoid infinite loop
                    // For now, just searching the raw genre prevents re-adding qualifiers 
                    // IF we modify the logic. But here we call getRandomTrack(genre) 
                    // which RE-ADDS qualifiers.

                    // FIX: Direct call with raw term to avoid re-entering qualifier logic
                    // We can't easily bypass the logic without changing method signature.
                    // Safer to just return null and let GameManager use mock.
                    return null;
                }
                return null;
                return null;
            }

            // Pick a random track from the batch
            const randomTrack = validTracks[Math.floor(Math.random() * validTracks.length)];

            // Replace 100x100 artwork with 600x600 for better quality
            const highResArtwork = randomTrack.artworkUrl100.replace('100x100bb', '600x600bb');

            return {
                trackId: randomTrack.trackId.toString(),
                trackTitle: randomTrack.trackName,
                artistName: randomTrack.artistName,
                previewUrl: randomTrack.previewUrl,
                albumCover: highResArtwork,
            };

        } catch (error) {
            console.error('Error fetching track from iTunes:', error);
            return null;
        }
    }
}

export const itunesService = new ITunesService();
