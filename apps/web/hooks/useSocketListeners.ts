'use client';

import { useEffect } from 'react';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../stores/gameStore';
import type { RoundData, RoundResult } from '../../../packages/shared/types';

export function useSocketListeners() {
    const socket = getSocket();
    // Ref pour éviter le double montage en mode Strict Mode de React (dev)
    // Bien que useEffect avec [] ne s'exécute qu'une fois par montage, 
    // le Strict Mode peut démonter/remonter.
    // Cependant, pour les listeners socket, on veut s'assurer qu'on n'empile pas.

    // Actions du store
    const setRoomState = useGameStore((state) => state.setRoomState);
    const setCurrentRound = useGameStore((state) => state.setCurrentRound);
    const setLastRoundResult = useGameStore((state) => state.setLastRoundResult);
    const setLocalPlayerId = useGameStore((state) => state.setLocalPlayerId);
    const setPlayerCooldown = useGameStore((state) => state.setPlayerCooldown);
    const clearPlayerCooldown = useGameStore((state) => state.clearPlayerCooldown);
    const setConnectionStatus = useGameStore((state) => state.setConnectionStatus);
    const setError = useGameStore((state) => state.setError);
    const updateServerTimeOffset = useGameStore((state) => state.updateServerTimeOffset);
    const reset = useGameStore((state) => state.reset);

    useEffect(() => {
        // Connexion initiale si nécessaire
        if (!socket.connected) {
            setConnectionStatus(false, true);
            socket.connect();
        }

        // Handlers
        const onConnect = () => {
            setConnectionStatus(true, false);
            setError(null);
        };

        const onDisconnect = (reason: string) => {
            setConnectionStatus(false, false);
            if (reason === 'io server disconnect' || reason === 'transport close') {
                setError({ code: 'DISCONNECTED', message: 'Connexion perdue' });
            }
        };

        const onConnectError = (_error: Error) => {
            setConnectionStatus(false, false);
            setError({ code: 'CONNECTION_ERROR', message: 'Impossible de se connecter' });
        };

        const onRoomCreated = ({ roomState }: any) => {
            setRoomState(roomState);
            if (socket.id) setLocalPlayerId(socket.id, roomState.players[0].pseudo);
        };

        const onRoomJoined = ({ roomState }: any) => {
            setRoomState(roomState);
            const currentPlayer = roomState.players.find((p: any) => p.id === socket.id);
            if (currentPlayer && socket.id) {
                setLocalPlayerId(socket.id, currentPlayer.pseudo);
            }
        };

        const onRoomUpdated = ({ roomState }: any) => {
            setRoomState(roomState);
        };

        const onPlayerKicked = ({ playerId }: any) => {
            if (playerId === socket.id) {
                setError({ code: 'KICKED', message: 'Tu as été exclu de la partie' });
                reset();
            }
        };

        const onRoundStart = (roundData: RoundData) => {
            setCurrentRound(roundData);
            clearPlayerCooldown();
            useGameStore.getState().clearEmotes();
            useGameStore.getState().setBuzzerLock(null);
            useGameStore.getState().setCurrentIntroTier(0);
            useGameStore.getState().setActiveHint(null);
            useGameStore.getState().setTimelineReveal(null);
            useGameStore.getState().setLyricsData(null);
        };

        const onAnswerResult = ({ correct, cooldownUntil, foundPart, timelineReveal }: any) => {
            // Mark the last attempt with the server result
            useGameStore.getState().markLastAttemptResult(correct, foundPart);

            // Store timeline reveal data if present
            if (timelineReveal) {
                useGameStore.getState().setTimelineReveal({
                    ...timelineReveal,
                    correct,
                });
            }

            if (correct) {
                clearPlayerCooldown();
                if (foundPart) {
                    useGameStore.getState().setLocalPlayerFoundPart(foundPart);
                }
            } else if (cooldownUntil) {
                setPlayerCooldown(cooldownUntil);
            }
        };

        const onRoundEnd = (result: RoundResult) => {
            setLastRoundResult(result);

            // Track missed tracks for post-game playlist
            const localId = useGameStore.getState().localPlayer.id;
            const myResult = result.playerResults.find(r => r.playerId === localId);
            if (myResult && !myResult.wasCorrect) {
                const store = useGameStore.getState();
                const currentMissed = store.missedTracks;
                useGameStore.setState({
                    missedTracks: [...currentMissed, {
                        trackTitle: result.trackTitle,
                        artistName: result.artistName,
                        albumCover: result.albumCover,
                    }],
                });
            }
        };

        const onTimeSync = ({ serverTime }: any) => {
            updateServerTimeOffset(serverTime);
        };

        const onGameOver = () => {
            // The server also emits room_updated with FINISHED status via emitRoomUpdate(),
            // so the roomState will be updated by onRoomUpdated. This handler exists
            // as an explicit acknowledgement of the game_over event.
        };

        const onNewMessage = (data: { playerId: string; pseudo: string; message: string; timestamp: number }) => {
            useGameStore.getState().addChatMessage(data);
        };

        const onEmoteReceived = ({ playerId, pseudo, emote }: any) => {
            useGameStore.getState().addEmote({ playerId, pseudo, emote });
        };

        const onTimelineCardAdded = () => {
            // room_updated will sync the player's timelineCards via onRoomUpdated
        };

        const onTimelineWinner = () => {
            // game_over + room_updated handle the transition
        };

        // Buzzer mode
        const onBuzzerLocked = ({ playerId, pseudo, buzzerTimeMs }: any) => {
            useGameStore.getState().setBuzzerLock({ playerId, pseudo, buzzerTimeMs: buzzerTimeMs || 10000 });
        };

        const onBuzzerReleased = () => {
            useGameStore.getState().setBuzzerLock(null);
        };

        const onBuzzerTimeout = () => {
            useGameStore.getState().setBuzzerLock(null);
        };

        // Elimination mode
        const onPlayerEliminated = () => {
            // room_updated handles the player state change
        };

        // Intro mode
        const onIntroTierUnlock = ({ tier, phase, durationMs }: any) => {
            useGameStore.getState().setCurrentIntroTier(tier);
            useGameStore.getState().setIntroPhase(phase, durationMs);
        };

        // Lyrics mode
        const onLyricsData = (data: any) => {
            useGameStore.getState().setLyricsData(data);
        };

        const onLyricsResult = (data: any) => {
            // lyrics_result is handled directly by the LyricsInput component
            // via its own socket listener. This is a no-op placeholder.
        };

        // Power-ups
        const onPowerupActivated = () => {
            // room_updated handles the player state change
        };

        const onHintReceived = ({ hint, hintType }: any) => {
            useGameStore.getState().setActiveHint({ hint, hintType });
        };

        // Contextual reactions
        const onContextualReaction = () => {
            // Handled by EmoteOverlay if needed
        };

        const onError = ({ code, message }: any) => {
            setError({ code, message });
        };

        // Attachement des listeners
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);
        socket.on('room_created', onRoomCreated);
        socket.on('room_joined', onRoomJoined);
        socket.on('room_updated', onRoomUpdated);
        socket.on('player_kicked', onPlayerKicked);
        socket.on('round_start', onRoundStart);
        socket.on('answer_result', onAnswerResult);
        socket.on('round_end', onRoundEnd);
        socket.on('game_over', onGameOver);
        socket.on('time_sync', onTimeSync);
        socket.on('new_message', onNewMessage);
        socket.on('emote_received', onEmoteReceived);
        socket.on('timeline_card_added', onTimelineCardAdded);
        socket.on('timeline_winner', onTimelineWinner);
        socket.on('buzzer_locked', onBuzzerLocked);
        socket.on('buzzer_released', onBuzzerReleased);
        socket.on('buzzer_timeout', onBuzzerTimeout);
        socket.on('player_eliminated', onPlayerEliminated);
        socket.on('intro_tier_unlock', onIntroTierUnlock);
        socket.on('lyrics_data', onLyricsData);
        socket.on('lyrics_result', onLyricsResult);
        socket.on('powerup_activated', onPowerupActivated);
        socket.on('hint_received', onHintReceived);
        socket.on('contextual_reaction', onContextualReaction);
        socket.on('error', onError);

        // Cleanup
        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
            socket.off('room_created', onRoomCreated);
            socket.off('room_joined', onRoomJoined);
            socket.off('room_updated', onRoomUpdated);
            socket.off('player_kicked', onPlayerKicked);
            socket.off('round_start', onRoundStart);
            socket.off('answer_result', onAnswerResult);
            socket.off('round_end', onRoundEnd);
            socket.off('game_over', onGameOver);
            socket.off('time_sync', onTimeSync);
            socket.off('new_message', onNewMessage);
            socket.off('emote_received', onEmoteReceived);
            socket.off('timeline_card_added', onTimelineCardAdded);
            socket.off('timeline_winner', onTimelineWinner);
            socket.off('buzzer_locked', onBuzzerLocked);
            socket.off('buzzer_released', onBuzzerReleased);
            socket.off('buzzer_timeout', onBuzzerTimeout);
            socket.off('player_eliminated', onPlayerEliminated);
            socket.off('intro_tier_unlock', onIntroTierUnlock);
            socket.off('lyrics_data', onLyricsData);
            socket.off('lyrics_result', onLyricsResult);
            socket.off('powerup_activated', onPowerupActivated);
            socket.off('hint_received', onHintReceived);
            socket.off('contextual_reaction', onContextualReaction);
            socket.off('error', onError);
        };
    }, []); // Dépendances vides pour n'exécuter qu'au montage
}
