'use client'

import { Game, Participant, QuizSet } from '@/types/types'
import { useEffect, useRef, useState } from 'react'
import Lobby from './lobby'
import Quiz from './quiz'
import Results from './results'

enum AdminScreens {
  lobby = 'lobby',
  quiz = 'quiz',
  result = 'result',
}

export default function Home({
  params: { id: gameId },
}: {
  params: { id: string }
}) {
  const [currentScreen, setCurrentScreen] = useState<AdminScreens>(AdminScreens.lobby)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [quizSet, setQuizSet] = useState<QuizSet>()
  const [currentQuestionSequence, setCurrentQuestionSequence] = useState(0)
  const [game, setGame] = useState<Game>()
  const pollRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await fetch(`/api/games/${gameId}`)
        if (!res.ok) return
        const data = await res.json()
        setGame(data)
        setQuizSet(data.quizSet)
        setCurrentScreen(data.phase as AdminScreens)
        setCurrentQuestionSequence(data.currentQuestionSequence)
      } catch { /* retry */ }
    }

    const fetchParticipants = async () => {
      try {
        const res = await fetch(`/api/games/${gameId}/participants`)
        if (!res.ok) return
        const data = await res.json()
        setParticipants(data)
      } catch { /* retry */ }
    }

    fetchGame()
    fetchParticipants()
    pollRef.current = setInterval(() => { fetchGame(); fetchParticipants() }, 2000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [gameId])

  return (
    <main className="min-h-screen bg-paper-cream">
      {currentScreen === AdminScreens.lobby && (
        <Lobby
          participants={participants}
          gameId={gameId}
          roomCode={game?.roomCode ?? ''}
          onKick={(participantId) => {
            setParticipants((prev) => prev.filter((p) => p.id !== participantId))
          }}
        />
      )}
      {currentScreen === AdminScreens.quiz && quizSet?.questions[currentQuestionSequence] && (
        <Quiz
          key={quizSet.questions[currentQuestionSequence].id}
          question={quizSet.questions[currentQuestionSequence]}
          questionCount={quizSet.questions.length}
          gameId={gameId}
          participants={participants}
        />
      )}
      {currentScreen === AdminScreens.result && (
        <Results participants={participants} quizSet={quizSet!} gameId={gameId} />
      )}
    </main>
  )
}
