'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Alle velden zijn verplicht.');
      return;
    }

    // TODO: Implement actual contact form submission
    setSent(true);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #372d5a 50%, #0c0c0c 100%)',
        fontFamily: "'Roboto', sans-serif",
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 5,
          padding: 30,
          width: 500,
          maxWidth: '90%',
        }}
      >
        <h2
          style={{
            color: '#262A51',
            fontSize: 24,
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          Contact
        </h2>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#333', fontSize: 14, lineHeight: 1.7 }}>
              Bedankt voor je bericht! We nemen zo snel mogelijk contact met je op.
            </p>
            <Link
              href="/"
              style={{
                display: 'inline-block',
                marginTop: 20,
                color: '#7C4DFF',
                fontWeight: 600,
              }}
            >
              Terug naar home
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Je naam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                height: 38,
                border: '1px solid #CDCDCD',
                borderRadius: 3,
                paddingLeft: 10,
                fontSize: 13,
                color: '#383A66',
                marginBottom: 15,
                outline: 'none',
              }}
            />
            <input
              type="email"
              placeholder="E-mailadres"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                height: 38,
                border: '1px solid #CDCDCD',
                borderRadius: 3,
                paddingLeft: 10,
                fontSize: 13,
                color: '#383A66',
                marginBottom: 15,
                outline: 'none',
              }}
            />
            <textarea
              placeholder="Je bericht"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              style={{
                width: '100%',
                border: '1px solid #CDCDCD',
                borderRadius: 3,
                padding: 10,
                fontSize: 13,
                color: '#383A66',
                marginBottom: 15,
                outline: 'none',
                resize: 'vertical',
                fontFamily: "'Roboto', sans-serif",
              }}
            />

            {error && (
              <div
                style={{
                  background: '#D35757',
                  color: '#fff',
                  padding: '0 15px',
                  height: 36,
                  lineHeight: '36px',
                  borderRadius: 3,
                  marginBottom: 10,
                  fontSize: 14,
                }}
              >
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                height: 44,
                background: '#7C4DFF',
                color: '#fff',
                border: 'none',
                borderRadius: 5,
                fontSize: 16,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Verstuur
            </button>

            <div style={{ textAlign: 'center', marginTop: 15 }}>
              <Link href="/" style={{ color: '#7C4DFF', fontSize: 14 }}>
                Terug naar home
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
