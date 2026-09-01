'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Game, Participant, Question } from '@/types/types'
import Quiz from './quiz'
import { getAvatarFromName, AvatarIcon } from '@/lib/avatar'

enum Screens {
  lobby = 'lobby',
  quiz = 'quiz',
  results = 'result',
}

export default function Home({
  params: { id: gameId },
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const participantId = searchParams.get('participant')
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [participantResolved, setParticipantResolved] = useState(false)
  const [currentScreen, setCurrentScreen] = useState(Screens.lobby)
  const [questions, setQuestions] = useState<Question[]>()
  const [currentQuestionSequence, setCurrentQuestionSequence] = useState(0)
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false)
  const pollRef = useRef<NodeJS.Timeout>()
  const stateRef = useRef<Participant | null>()

  stateRef.current = participant

  const getGame = async () => {
    try {
      const res = await fetch(`/api/games/${gameId}`)
      if (!res.ok) return
      const game: Game & { quizSet: { questions: Question[] } } =
        await res.json()
      setCurrentScreen(game.phase as Screens)
      if (game.phase === Screens.quiz) {
        setCurrentQuestionSequence(game.currentQuestionSequence)
        setIsAnswerRevealed(game.isAnswerRevealed)
        setQuestions(game.quizSet.questions)
      }
    } catch {
      // retry
    }
  }

  useEffect(() => {
    if (!participantId) {
      router.replace(`/game/join?room=${encodeURIComponent(gameId)}`)
      return
    }

    const getParticipant = async () => {
      try {
        const res = await fetch(`/api/games/${gameId}/participants`)
        if (!res.ok) return
        const participants: Participant[] = await res.json()
        const currentParticipant = participants.find(({ id }) => id === participantId)

        if (currentParticipant) {
          setParticipant(currentParticipant)
        } else {
          router.replace(`/game/join?room=${encodeURIComponent(gameId)}`)
        }
      } finally {
        setParticipantResolved(true)
      }
    }

    getParticipant()
  }, [gameId, participantId, router])

  useEffect(() => {
    getGame()

    pollRef.current = setInterval(async () => {
      if (stateRef.current) {
        getGame()
        if (participantId) {
          try {
            const res = await fetch(`/api/games/${gameId}/participants`)
            if (res.ok) {
              const participants: Participant[] = await res.json()
              const stillExists = participants.some(({ id }) => id === participantId)
              if (!stillExists) {
                setParticipant(null)
                router.replace(`/game/join?kicked=true`)
              }
            }
          } catch {
            // ignore network glitch
          }
        }
      }
    }, 1500)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [gameId, participantId, router])

  return (
    <main className="bg-paper-cream min-h-screen text-charcoal font-body">
      {currentScreen === Screens.lobby && participantResolved && participant && (
        <WaitingLobby participant={participant} />
      )}
      {currentScreen === Screens.quiz && questions && participant && (
        <Quiz
          key={questions[currentQuestionSequence]?.id || currentQuestionSequence}
          question={questions[currentQuestionSequence]}
          questionCount={questions.length}
          participantId={participant.id}
          isAnswerRevealed={isAnswerRevealed}
          gameId={gameId}
        />
      )}
      {currentScreen === Screens.results && participant && (
        <Results participant={participant} />
      )}
    </main>
  )
}

function WaitingLobby({ participant }: { participant: Participant }) {
  return (
    <div className="flex justify-center items-center min-h-screen p-4 text-center">
      <div className="card-pinned pin p-8 max-w-md w-full animate-pop-in">
        <div className="flex justify-center mb-4">
          <AvatarIcon name={participant.nickname} size={80} />
        </div>
        <h1 className="font-display text-2xl font-bold text-charcoal mb-2">
          You&apos;re in, {participant.nickname}!
        </h1>
        <p className="text-pencil text-sm leading-relaxed">
          See your avatar on the main screen? Relax and stay tuned until the host starts the quiz!
        </p>
      </div>
    </div>
  )
}

function Results({ participant }: { participant: Participant }) {
  return (
    <div className="flex justify-center items-center min-h-screen p-4 text-center relative overflow-hidden">
      <div className="p-8 md:p-12 bg-paper-white border-2 border-cork-200 rounded-card max-w-md w-full shadow-card relative z-10 animate-pop-in">
        <div className="flex justify-center mb-6">
          <AvatarIcon name={participant.nickname} size={96} />
        </div>
        <h2 className="font-display text-3xl font-bold text-charcoal mb-2">
          Awesome job, {participant.nickname}!
        </h2>
        <p className="text-pencil text-sm leading-relaxed mb-6">
          The game has ended! Look at the main host screen to see the top podium winners.
        </p>
      </div>
    </div>
  )
}

function Lobby({
  gameId,
  onRegisterCompleted,
}: {
  gameId: string
  onRegisterCompleted: (participant: Participant) => void
}) {
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [nickname, setNickname] = useState('')
  const [sending, setSending] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState('')

  const avatar = nickname ? getAvatarFromName(nickname) : null
  const registeredAvatar = participant ? getAvatarFromName(participant.nickname) : null

  const onFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError('')

    if (!nickname.trim()) {
      setError('Please enter a nickname')
      setSending(false)
      return
    }

    if (!roomCode.trim()) {
      setError('Please enter a room code')
      setSending(false)
      return
    }

    try {
      const res = await fetch(`/api/games/${gameId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname.trim(),
          roomCode: roomCode.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        setSending(false)
        return
      }

      onRegisterCompleted(data)
      setParticipant(data)
    } catch {
      setError('Network error')
      setSending(false)
    }
  }

  return (
    <div className="flex justify-center items-center min-h-screen p-4 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        {!participant && (
          <div className="card-pinned pin p-8">
            <div className="text-center mb-6">
              <h1 className="font-display text-2xl font-bold text-charcoal">Join Game Room</h1>
              <p className="text-pencil text-xs mt-1">Enter PIN and nickname to enter</p>
            </div>

            {/* Avatar Preview */}
            {nickname && (
              <div className="flex justify-center mb-6">
                <div className="animate-pop-in">
                  <AvatarIcon name={nickname} size={64} />
                </div>
              </div>
            )}

            <form onSubmit={onFormSubmit} className="space-y-4">
              <div>
                <input
                  className="input text-center text-2xl font-mono font-bold tracking-widest py-3 uppercase"
                  type="text"
                  value={roomCode}
                  onChange={(val) => setRoomCode(val.currentTarget.value.toUpperCase())}
                  placeholder="ROOM PIN"
                  maxLength={6}
                />
              </div>
              <div>
                <input
                  className="input text-center text-lg py-3"
                  type="text"
                  value={nickname}
                  onChange={(val) => setNickname(val.currentTarget.value)}
                  placeholder="Nickname"
                  maxLength={20}
                />
              </div>

              {error && (
                <div className="error-banner">
                  {error}
                </div>
              )}

              <button
                disabled={sending}
                className="btn btn-primary w-full"
              >
                {sending ? 'Joining...' : 'Join Game'}
              </button>
            </form>
          </div>
        )}

        {participant && (
          <div className="card-pinned pin p-8 text-center animate-pop-in">
            <div className="flex justify-center mb-4">
              <AvatarIcon name={participant.nickname} size={80} />
            </div>

            <h1 className="font-display text-2xl font-bold text-charcoal mb-2">
              You&apos;re in, {participant.nickname}!
            </h1>
            <p className="text-pencil text-sm leading-relaxed">
              See your avatar on the main screen? Relax and stay tuned until the host starts the quiz!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
