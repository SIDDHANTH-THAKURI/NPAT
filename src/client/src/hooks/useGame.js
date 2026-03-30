import { useReducer, useEffect, useCallback, useRef } from 'react';
import socket from '../socket';

const SCREENS = {
  HOME: 'HOME',
  LOBBY: 'LOBBY',
  COUNTDOWN: 'COUNTDOWN',
  GAME: 'GAME',
  RESULTS: 'RESULTS',
  PODIUM: 'PODIUM',
};

const initialState = {
  screen: SCREENS.HOME,
  playerId: null,
  roomCode: null,
  hostId: null,
  maxPlayers: 4,
  players: [],
  round: 0,
  totalRounds: 5,
  letter: '',
  durationMs: 60000,
  startTs: null,
  submitted: false,
  submittedCount: 0,
  roundResults: null,
  leaderboard: [],
  error: null,
  autoStartMs: null,
  countdownLetter: '',
  countdownMs: 5000,
  reactions: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.screen, error: null };
    case 'ROOM_UPDATED':
      return {
        ...state,
        roomCode: action.payload.code,
        hostId: action.payload.hostId,
        maxPlayers: action.payload.maxPlayers,
        players: action.payload.players,
        // Only update playerId if it comes with the event (join/create)
        playerId: action.payload.playerId || state.playerId,
        screen: state.screen === SCREENS.HOME ? SCREENS.LOBBY : state.screen,
      };
    case 'GAME_STARTED':
      return { ...state, screen: SCREENS.LOBBY, players: action.payload.players };
    case 'ROUND_COUNTDOWN':
      return {
        ...state,
        screen: SCREENS.COUNTDOWN,
        round: action.payload.round,
        totalRounds: action.payload.totalRounds,
        countdownLetter: action.payload.letter,
        countdownMs: action.payload.countdownMs,
        submitted: false,
        submittedCount: 0,
      };
    case 'ROUND_STARTED':
      return {
        ...state,
        screen: SCREENS.GAME,
        round: action.payload.round,
        letter: action.payload.letter,
        durationMs: action.payload.durationMs,
        startTs: action.payload.startTs,
        submitted: false,
        submittedCount: 0,
      };
    case 'PLAYER_SUBMITTED':
      return {
        ...state,
        submitted: action.payload.playerId === state.playerId ? true : state.submitted,
        submittedCount: action.payload.submittedCount,
      };
    case 'ROUND_ENDED':
      return {
        ...state,
        screen: SCREENS.RESULTS,
        roundResults: {
          round: action.payload.round,
          letter: action.payload.letter,
          answerTable: action.payload.answerTable,
          scoreDeltas: action.payload.scoreDeltas,
        },
        leaderboard: action.payload.leaderboard,
      };
    case 'GAME_OVER':
      return {
        ...state,
        screen: SCREENS.PODIUM,
        leaderboard: action.payload.leaderboard,
      };
    case 'AUTO_START':
      return { ...state, autoStartMs: action.payload.delayMs };
    case 'SET_ERROR':
      return { ...state, error: action.message };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'ADD_REACTION':
      return { ...state, reactions: [...state.reactions.slice(-9), action.payload] };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    socket.connect();

    socket.on('room_updated', (payload) => {
      // Preserve our own playerId across room_updated broadcasts
      const myId = stateRef.current.playerId;
      dispatch({ type: 'ROOM_UPDATED', payload: { ...payload, playerId: payload.playerId || myId } });
    });
    socket.on('game_started', (payload) => dispatch({ type: 'GAME_STARTED', payload }));
    socket.on('round_countdown', (payload) => dispatch({ type: 'ROUND_COUNTDOWN', payload }));
    socket.on('round_started', (payload) => dispatch({ type: 'ROUND_STARTED', payload }));
    socket.on('player_submitted', (payload) => dispatch({ type: 'PLAYER_SUBMITTED', payload }));
    socket.on('round_ended', (payload) => dispatch({ type: 'ROUND_ENDED', payload }));
    socket.on('game_over', (payload) => dispatch({ type: 'GAME_OVER', payload }));
    socket.on('auto_start_countdown', (payload) => dispatch({ type: 'AUTO_START', payload }));
    socket.on('join_error', ({ message }) => dispatch({ type: 'SET_ERROR', message }));
    socket.on('start_error', ({ message }) => dispatch({ type: 'SET_ERROR', message }));
    socket.on('reaction', (payload) => dispatch({ type: 'ADD_REACTION', payload }));

    return () => {
      socket.off('room_updated');
      socket.off('game_started');
      socket.off('round_countdown');
      socket.off('round_started');
      socket.off('player_submitted');
      socket.off('round_ended');
      socket.off('game_over');
      socket.off('auto_start_countdown');
      socket.off('join_error');
      socket.off('start_error');
      socket.off('reaction');
      socket.disconnect();
    };
  }, []);

  // Persist playerId to localStorage for reconnects
  useEffect(() => {
    if (state.playerId) localStorage.setItem('npat_playerId', state.playerId);
    if (state.roomCode) localStorage.setItem('npat_roomCode', state.roomCode);
  }, [state.playerId, state.roomCode]);

  const createRoom = useCallback((nickname, maxPlayers) => {
    socket.emit('create_room', { nickname, maxPlayers });
  }, []);

  const joinRoom = useCallback((code, nickname) => {
    const existingId = localStorage.getItem('npat_playerId');
    socket.emit('join_room', { code, nickname, playerId: existingId });
  }, []);

  const startGame = useCallback(() => {
    socket.emit('start_game', { code: stateRef.current.roomCode });
  }, []);

  const submitAnswers = useCallback((answers) => {
    socket.emit('submit_answers', { code: stateRef.current.roomCode, answers });
  }, []);

  const nextRound = useCallback(() => {
    socket.emit('next_round', { code: stateRef.current.roomCode });
  }, []);

  const sendReaction = useCallback((emoji) => {
    socket.emit('send_reaction', { code: stateRef.current.roomCode, emoji });
  }, []);

  const resetGame = useCallback(() => {
    localStorage.removeItem('npat_playerId');
    localStorage.removeItem('npat_roomCode');
    dispatch({ type: 'RESET' });
  }, []);

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  return {
    state,
    SCREENS,
    createRoom,
    joinRoom,
    startGame,
    submitAnswers,
    nextRound,
    sendReaction,
    resetGame,
    clearError,
  };
}
