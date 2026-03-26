'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function WachtwoordVergetenPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Voer je e-mailadres in.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err: any) {
      // Always show success message for security (don't reveal if email exists)
      setSent(true);
    } finally {
      setLoading(false);
    }
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
          width: 400,
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
          Wachtwoord vergeten
        </h2>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#333', fontSize: 14, lineHeight: 1.7 }}>
              Als het e-mailadres bij ons bekend is, ontvang je binnen enkele
              minuten een e-mail met instructies om je wachtwoord te herstellen.
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
            <p
              style={{
                color: '#666',
                fontSize: 14,
                marginBottom: 15,
                textAlign: 'center',
              }}
            >
              Voer je e-mailadres in om je wachtwoord te herstellen.
            </p>
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
              disabled={loading}
              style={{
                width: '100%',
                height: 44,
                background: loading ? '#9e85ff' : '#7C4DFF',
                color: '#fff',
                border: 'none',
                borderRadius: 5,
                fontSize: 16,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {loading ? 'Bezig...' : 'Verstuur'}
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
