'use client'

import { QUESTION_ANSWER_TIME, TIME_TIL_CHOICE_REVEAL } from '@/constants'
import { GameResult, Participant, Question } from '@/types/types'
import { useEffect, useRef, useState } from 'react'
import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import { getAvatarFromName, AvatarIcon } from '@/lib/avatar'

const CHOICE_COLORS = [
  { bg: 'bg-paper-red', icon: '▲', ring: 'ring-paper-red' },
  { bg: 'bg-paper-blue', icon: '◆', ring: 'ring-paper-blue' },
  { bg: 'bg-paper-yellow', icon: '●', ring: 'ring-paper-yellow' },
  { bg: 'bg-paper-green', icon: '■', ring: 'ring-paper-green' },
]

export default function Quiz({
  question,
  questionCount,
  gameId,
  participants,
}: {
  question: Question
  questionCount: number
  gameId: string
  participants: Participant[]
}) {
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false)
  const [hasShownChoices, setHasShownChoices] = useState(false)
  const [answers, setAnswers] = useState<{ choiceId: string | null }[]>([])
  const [leaderboard, setLeaderboard] = useState<GameResult[]>([])
  const [error, setError] = useState('')
  const pollRef = useRef<NodeJS.Timeout>()
  const hasShownChoicesRef = useRef(false)
  const participantsRef = useRef(participants)
  const hasEndedRef = useRef(false)

  participantsRef.current = participants

  const getNextQuestion = async () => {
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentQuestionSequence: question.order + 1,
          isAnswerRevealed: false,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error)
        setTimeout(() => setError(''), 4000)
      }
    } catch {
      setError('Failed to advance question')
      setTimeout(() => setError(''), 4000)
    }
  }

  const onTimeUp = () => {
    if (hasEndedRef.current) return
    hasEndedRef.current = true
    setIsAnswerRevealed(true)
    fetch(`/api/games/${gameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAnswerRevealed: true }),
    })
  }

  useEffect(() => {
    setIsAnswerRevealed(false)
    setHasShownChoices(false)
    hasShownChoicesRef.current = false
    setAnswers([])
    hasEndedRef.current = false

    const timer = setTimeout(() => {
      setHasShownChoices(true)
      hasShownChoicesRef.current = true
    }, TIME_TIL_CHOICE_REVEAL)

    const fetchAnswers = async () => {
      try {
        const res = await fetch(
          `/api/games/${gameId}/answers?questionId=${question.id}`
        )
        if (!res.ok) return
        const data = await res.json()
        setAnswers(data)

        // End early once every participant has submitted an answer, BUT ONLY
        // after choices have actually been revealed to the players.
        if (
          hasShownChoicesRef.current &&
          !hasEndedRef.current &&
          participantsRef.current.length > 0 &&
          data.length >= participantsRef.current.length
        ) {
          onTimeUp()
        }

      } catch {
        // retry
      }
    }

    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`/api/games/${gameId}/results`)
        if (!res.ok) return
        const data = await res.json()
        setLeaderboard(data)
      } catch {
        // retry
      }
    }

    fetchLeaderboard()

    pollRef.current = setInterval(() => {
      fetchAnswers()
      fetchLeaderboard()
    }, 1000)

    return () => {
      clearTimeout(timer)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [question.id, gameId])

  const getNextQuestionData = async () => {
    if (questionCount == question.order + 1) {
      await fetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'result' }),
      })
    } else {
      await getNextQuestion()
    }
  }

  return (
    <div className="h-screen flex bg-paper-cream text-charcoal relative overflow-hidden">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-paper-red text-white px-6 py-3 rounded-card shadow-pin font-semibold text-sm animate-slide-up">
          {error}
        </div>
      )}

      {/* Main quiz area */}
      <div className="flex-grow flex flex-col justify-between p-6 relative z-10 overflow-y-auto">
        {/* Next Question Control */}
        <div className="absolute right-6 top-6 z-20">
          {isAnswerRevealed && (
            <button
              className="btn btn-primary animate-pop-in"
              onClick={getNextQuestionData}
            >
              {questionCount === question.order + 1 ? 'Show Final Podium' : 'Next Question'}
            </button>
          )}
        </div>

        {/* Question Banner — pinned card */}
        <div className="text-center max-w-4xl mx-auto w-full mt-4">
          <div className="card-pinned pin p-6 md:p-8">
            <h2 className="font-display text-2xl md:text-4xl font-bold text-charcoal leading-tight">
              {question.body}
            </h2>
          </div>
        </div>

        {/* Question Image */}
        {question.imageUrl && (
          <div className="flex justify-center my-4">
            <img
              src={question.imageUrl}
              alt="Question"
              className="max-h-48 rounded-card border-2 border-cork-200 object-contain shadow-card"
            />
          </div>
        )}

        {/* Dynamic Center Stage */}
        <div className="flex-grow flex flex-col justify-center items-center my-4">
          {hasShownChoices && !isAnswerRevealed && (
            <div className="flex items-center justify-around w-full max-w-2xl bg-paper-white border-2 border-cork-200 rounded-card p-6 shadow-card">
              {/* Timer */}
              <div className="flex flex-col items-center">
                <CountdownCircleTimer
                  key={`host-question-timer-${question.id}`}
                  onComplete={onTimeUp}
                  isPlaying
                  duration={QUESTION_ANSWER_TIME / 1000}
                  colors={['#16a34a', '#eab308', '#dc2626', '#dc2626']}
                  colorsTime={[20, 10, 3, 0]}
                  size={120}
                  strokeWidth={10}
                  trailColor="rgba(0,0,0,0.05)"
                >
                  {({ remainingTime }) => (
                    <span className="font-display font-bold text-3xl text-charcoal">
                      {remainingTime}
                    </span>
                  )}
                </CountdownCircleTimer>
                <span className="text-xs font-semibold uppercase tracking-wider text-pencil mt-2">Seconds</span>
              </div>

              {/* Live Answer Count */}
              <div className="text-center">
                <div className="font-display font-bold text-6xl text-paper-blue animate-pulse-soft">
                  {answers.length}
                </div>
                <div className="text-sm font-semibold uppercase tracking-wider text-pencil mt-1">
                  Answers Received
                </div>
              </div>
            </div>
          )}

          {/* Answer Distribution Chart */}
          {isAnswerRevealed && (
            <div className="flex justify-center items-end gap-4 md:gap-8 h-56 w-full max-w-3xl px-4">
              {question.choices.map((choice, index) => {
                const count = answers.filter((a) => a.choiceId === choice.id).length
                const pct = Math.round((count * 100) / (answers.length || 1))
                const theme = CHOICE_COLORS[index % CHOICE_COLORS.length]

                return (
                  <div key={choice.id} className="flex-1 flex flex-col items-center h-full justify-end">
                    <span className="font-mono font-bold text-base mb-2 text-charcoal">{count}</span>
                    <div className="w-full bg-cork-100 rounded-t-card p-1 relative flex flex-col justify-end h-40">
                      <div
                        style={{ height: `${pct}%` }}
                        className={`w-full ${theme.bg} rounded-t-card transition-[height] duration-700 ease-out flex items-center justify-center`}
                      >
                        {choice.isCorrect && (
                          <span className="text-white text-lg font-bold">&#10003;</span>
                        )}
                      </div>
                    </div>
                    <div className={`w-full mt-2 py-1 text-center font-display font-bold text-xs text-white rounded-card ${theme.bg}`}>
                      {theme.icon}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Choice Grid — paper cards */}
        {hasShownChoices && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-5xl mx-auto w-full mb-4">
            {question.choices.map((choice, index) => {
              const theme = CHOICE_COLORS[index % CHOICE_COLORS.length]
              return (
                <div
                  key={choice.id}
                  className={`p-4 md:p-5 rounded-card font-display font-bold text-lg md:text-xl text-white flex items-center justify-between shadow-card ${theme.bg} ${
                    isAnswerRevealed && !choice.isCorrect ? 'opacity-30' : ''
                  } ${isAnswerRevealed && choice.isCorrect ? `ring-4 ${theme.ring} shadow-card-hover` : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="opacity-80">{theme.icon}</span>
                    <span>{choice.body}</span>
                  </div>
                  {isAnswerRevealed && choice.isCorrect && (
                    <span className="w-7 h-7 rounded-full bg-white text-charcoal flex items-center justify-center font-bold text-sm shadow-card">
                      &#10003;
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Footer — paper strip */}
        <footer className="flex items-center justify-between bg-paper-white border-2 border-cork-200 rounded-card px-6 py-3 max-w-5xl mx-auto w-full shadow-card">
          <span className="font-body font-semibold text-sm text-charcoal">
            Question {question.order + 1} of {questionCount}
          </span>
          <span className="font-mono text-xs font-semibold text-pencil">
            Room: {gameId.slice(0, 6).toUpperCase()}
          </span>
        </footer>
      </div>

      {/* Live leaderboard sidebar — cork panel */}
      <aside className="w-80 bg-gradient-to-b from-cork-400 to-cork-500 border-l-2 border-cork-600 flex flex-col relative z-20 shadow-xl">
        <div className="p-6 border-b-2 border-cork-600 flex items-center justify-between">
          <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
            Leaderboard
          </h3>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-paper-green text-white shadow-pin">
            Live
          </span>
        </div>
        <div className="flex-grow overflow-y-auto p-4 space-y-2.5">
          {leaderboard.length === 0 ? (
            <div className="text-center py-12 text-white/60 text-sm font-medium">
              Waiting for answers...
            </div>
          ) : (
            leaderboard.map((entry) => (
                <div
                  key={entry.participantId}
                  className={`flex items-center gap-3 p-3 rounded-card border-2 ${
                    entry.rank === 1
                      ? 'bg-paper-yellow text-charcoal border-paper-yellow'
                      : entry.rank === 2
                      ? 'bg-cork-300/40 border-cork-300/50 text-white'
                      : entry.rank === 3
                      ? 'bg-paper-orange/30 border-paper-orange/40 text-white'
                      : 'bg-cork-600/30 border-cork-600/20 text-white/90'
                  }`}
                >
                  <span className="w-6 text-center font-display font-bold text-sm opacity-70">
                    {entry.rank}
                  </span>
                  <AvatarIcon name={entry.nickname} size={36} />
                  <span className="flex-grow truncate font-body font-semibold text-sm">
                    {entry.nickname}
                  </span>
                  <span className="font-mono font-bold text-sm">
                    {entry.totalScore}
                  </span>
                </div>
              )
            )
          )}
        </div>
      </aside>
    </div>
  )
}
