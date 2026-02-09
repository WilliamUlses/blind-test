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
        };

        const onAnswerResult = ({ correct, cooldownUntil, foundPart }: any) => {
            // Mark the last attempt with the server result
            useGameStore.getState().markLastAttemptResult(correct, foundPart);

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
        };

        const onTimeSync = ({ serverTime }: any) => {
            updateServerTimeOffset(serverTime);
        };

        const onEmoteReceived = ({ playerId, pseudo, emote }: any) => {
            useGameStore.getState().addEmote({ playerId, pseudo, emote });
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
        socket.on('time_sync', onTimeSync);
        socket.on('emote_received', onEmoteReceived);
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
            socket.off('time_sync', onTimeSync);
            socket.off('emote_received', onEmoteReceived);
            socket.off('error', onError);
        };
    }, []); // Dépendances vides pour n'exécuter qu'au montage
}
