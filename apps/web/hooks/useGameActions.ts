'use client';

import { useCallback } from 'react';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../stores/gameStore';
import type { GameSettings } from '../../../packages/shared/types';

export function useGameActions() {
    const reset = useGameStore((state) => state.reset);

    const createRoom = useCallback(
        (pseudo: string, avatarUrl?: string, settings?: Partial<GameSettings>) => {
            const socket = getSocket();
            socket.emit('create_room', { pseudo, avatarUrl, settings });
        },
        []
    );

    const joinRoom = useCallback((roomCode: string, pseudo: string, avatarUrl?: string) => {
        const socket = getSocket();
        socket.emit('join_room', { roomCode, pseudo, avatarUrl });
    }, []);

    const leaveRoom = useCallback(() => {
        const socket = getSocket();
        socket.emit('leave_room');
        reset();
    }, [reset]);

    const kickPlayer = useCallback((playerId: string) => {
        const socket = getSocket();
        socket.emit('kick_player', { playerId });
    }, []);

    const toggleReady = useCallback(() => {
        const socket = getSocket();
        socket.emit('toggle_ready');
    }, []);

    const updateSettings = useCallback((settings: Partial<GameSettings>) => {
        const socket = getSocket();
        socket.emit('update_settings', settings);
    }, []);

    const startGame = useCallback(() => {
        const socket = getSocket();
        socket.emit('start_game');
    }, []);

    const submitAnswer = useCallback((answer: string) => {
        const socket = getSocket();
        const timestamp = Date.now();
        socket.emit('submit_answer', { answer, timestamp });
    }, []);

    const sendMessage = useCallback((message: string) => {
        const socket = getSocket();
        socket.emit('send_message', { message });
    }, []);

    const togglePause = useCallback(() => {
        const socket = getSocket();
        socket.emit('toggle_pause');
    }, []);

    const sendEmote = useCallback((emote: string) => {
        const socket = getSocket();
        socket.emit('send_emote', { emote });
    }, []);

    return {
        createRoom,
        joinRoom,
        leaveRoom,
        kickPlayer,
        toggleReady,
        updateSettings,
        startGame,
        submitAnswer,
        sendMessage,
        togglePause,
        sendEmote,
    };
}
