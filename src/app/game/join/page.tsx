'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { getAvatarFromName, AvatarIcon } from '@/lib/avatar'

function JoinForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialCode = searchParams.get('room') || ''

  const [step, setStep] = useState<'code' | 'nickname'>(initialCode ? 'nickname' : 'code')
  const [roomCode, setRoomCode] = useState(initialCode)
  const [nickname, setNickname] = useState('')
  const [gameId, setGameId] = useState('')
  const [quizName, setQuizName] = useState('')
  const [participantCount, setParticipantCount] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const avatar = nickname ? getAvatarFromName(nickname) : null

  useEffect(() => {
    if (initialCode && !gameId) {
      lookupRoom()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const lookupRoom = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/games/lookup?code=${roomCode.trim()}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
        setLoading(false)
        return
      }
      setGameId(data.id)
      setRoomCode(data.roomCode)
      setQuizName(data.quizName)
      setParticipantCount(data.participantCount)
      setStep('nickname')
    } catch {
      setError('Network error')
    }
    setLoading(false)
  }

  const joinGame = async () => {
    setError('')
    if (!nickname.trim()) {
      setError('Please enter a nickname')
      return
    }

    setLoading(true)
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
        setLoading(false)
        return
      }
      router.replace(`/game/${gameId}?participant=${encodeURIComponent(data.id)}`)
    } catch {
      setError('Network error')
      setLoading(false)
    }
  }

  const wasKicked = searchParams.get('kicked') === 'true'

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-paper-cream">
      <div className="w-full max-w-md relative z-10">
        {/* Logo — paper style */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-3 rounded-card bg-gradient-to-br from-paper-blue to-paper-purple flex items-center justify-center shadow-pin">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-charcoal">Join Quiz</h1>
        </div>

        {/* Card — pinned */}
        <div className="card-pinned pin p-8">
          {wasKicked && (
            <div className="mb-6 p-3 rounded-card bg-paper-red/10 border border-paper-red/30 text-paper-red text-center text-sm font-semibold animate-slide-up">
              You were removed from the room by the host.
            </div>
          )}

          {step === 'code' && (
            <>
              <p className="text-pencil text-sm text-center mb-6">
                Enter the room code shown on screen
              </p>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                maxLength={6}
                className="input text-center text-3xl font-mono font-bold tracking-[0.5em] py-4 uppercase"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && roomCode.trim().length >= 4) lookupRoom()
                }}
              />
              {error && (
                <div className="error-banner mt-4">
                  {error}
                </div>
              )}
              <button
                onClick={lookupRoom}
                disabled={loading || roomCode.trim().length < 4}
                className="btn btn-primary w-full mt-6"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Looking up...
                  </span>
                ) : 'Join'}
              </button>
            </>
          )}

          {step === 'nickname' && (
            <>
              <button
                onClick={() => { setStep('code'); setError('') }}
                className="flex items-center gap-1 text-pencil hover:text-charcoal text-sm mb-6 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Change room
              </button>

              <h2 className="font-display text-xl font-bold text-center mb-2 text-charcoal">What&apos;s your name?</h2>
              <div className="text-center mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper-blue text-white text-xs font-bold shadow-pin">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                  </svg>
                  {quizName}
                </span>
              </div>
              <p className="text-pencil text-xs text-center mb-6">
                {participantCount} player{participantCount !== 1 ? 's' : ''} waiting
              </p>

              {/* Avatar preview */}
              {avatar && (
                <div className="flex justify-center mb-4">
                  <div className="animate-pop-in">
                    <AvatarIcon name={nickname} size={64} />
                  </div>
                </div>
              )}

              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Your nickname"
                maxLength={20}
                className="input text-center text-lg py-3"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nickname.trim()) joinGame()
                }}
                autoFocus
              />
              {error && (
                <div className="error-banner mt-4">
                  {error}
                </div>
              )}
              <button
                onClick={joinGame}
                disabled={loading || !nickname.trim()}
                className="btn btn-primary w-full mt-6"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Joining...
                  </span>
                ) : 'Join Game'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-paper-cream flex items-center justify-center">
          <div className="w-5 h-5 border-4 border-cork-200 border-t-cork-500 rounded-full animate-spin" />
        </div>
      }
    >
      <JoinForm />
    </Suspense>
  )
}
