import { useGame } from './hooks/useGame';
import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import CountdownScreen from './screens/CountdownScreen';
import GameScreen from './screens/GameScreen';
import ResultsScreen from './screens/ResultsScreen';
import PodiumScreen from './screens/PodiumScreen';

export default function App() {
  const {
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
  } = useGame();

  const {
    screen,
    playerId,
    roomCode,
    hostId,
    maxPlayers,
    players,
    round,
    totalRounds,
    letter,
    durationMs,
    startTs,
    submitted,
    submittedCount,
    roundResults,
    leaderboard,
    error,
    autoStartMs,
    countdownLetter,
    countdownMs,
    reactions,
  } = state;

  const connectedPlayers = players.filter((p) => p.connected);
  const isHost = playerId === hostId;

  return (
    <div className="w-full min-h-dvh">
      {screen === SCREENS.HOME && (
        <HomeScreen
          onCreate={createRoom}
          onJoin={joinRoom}
          error={error}
          clearError={clearError}
        />
      )}

      {screen === SCREENS.LOBBY && (
        <LobbyScreen
          roomCode={roomCode}
          players={players}
          playerId={playerId}
          hostId={hostId}
          maxPlayers={maxPlayers}
          autoStartMs={autoStartMs}
          reactions={reactions}
          onStart={startGame}
          onReaction={sendReaction}
        />
      )}

      {screen === SCREENS.COUNTDOWN && (
        <CountdownScreen
          round={round}
          totalRounds={totalRounds}
          letter={countdownLetter}
          countdownMs={countdownMs}
        />
      )}

      {screen === SCREENS.GAME && (
        <GameScreen
          round={round}
          totalRounds={totalRounds}
          letter={letter}
          durationMs={durationMs}
          startTs={startTs}
          submitted={submitted}
          submittedCount={submittedCount}
          totalConnected={connectedPlayers.length}
          players={players}
          playerId={playerId}
          onSubmit={submitAnswers}
        />
      )}

      {screen === SCREENS.RESULTS && roundResults && (
        <ResultsScreen
          round={roundResults.round}
          totalRounds={totalRounds}
          letter={roundResults.letter}
          answerTable={roundResults.answerTable}
          scoreDeltas={roundResults.scoreDeltas}
          leaderboard={leaderboard}
          players={players}
          playerId={playerId}
          isHost={isHost}
          isLastRound={roundResults.round >= totalRounds}
          onNext={nextRound}
        />
      )}

      {screen === SCREENS.PODIUM && (
        <PodiumScreen
          leaderboard={leaderboard}
          onPlayAgain={resetGame}
        />
      )}
    </div>
  );
}
