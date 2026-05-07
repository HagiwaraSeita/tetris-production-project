import { useState } from 'react'

interface Message {
  role: 'user' | 'ai'
  content: string
}

export const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const askAI = async () => {
    const userMessage = 'こんにちは'
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'ai', content: data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: 'エラーが発生しました' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ color: '#aaa', fontSize: 11, letterSpacing: 2 }}>AI ADVISOR</div>

      <div style={{
        height: 500,
        backgroundColor: '#111',
        border: '2px solid #444',
        padding: 8,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              backgroundColor: msg.role === 'user' ? '#1a3a5c' : '#1a2a1a',
              padding: '6px 8px',
              fontSize: 12,
              color: msg.role === 'user' ? '#7ec8e3' : '#90ee90',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '90%',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div style={{ color: '#555', fontSize: 12 }}>考え中...</div>
        )}
      </div>

      <button
        onClick={askAI}
        disabled={loading}
        style={{
          backgroundColor: loading ? '#222' : '#2563eb',
          color: loading ? '#555' : 'white',
          border: 'none',
          padding: '8px 0',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 13,
          fontFamily: 'monospace',
        }}
      >
        {loading ? '考え中...' : 'AIに聞く'}
      </button>
    </div>
  )
}
