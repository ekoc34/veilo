'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import './off.css';

export default function OffConversationPage() {
  const params = useParams();
  const id = params.id as string;

  const [conv, setConv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    const ref = doc(db, 'offConversations', id);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setConv({ id: snap.id, ...snap.data() });
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conv?.messages]);

  async function sendMessage() {
    if (!msgText.trim() || !id) return;
    setSending(true);
    try {
      const ref = doc(db, 'offConversations', id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const existing = snap.data().messages || [];
      await updateDoc(ref, {
        messages: [...existing, { text: msgText.trim(), sentAt: new Date().toISOString(), from: 'anon' }],
        updatedAt: serverTimestamp(),
      });
      setMsgText('');
    } finally {
      setSending(false);
    }
  }

  function formatTime(sentAt: any): string {
    if (!sentAt) return '';
    const d = new Date(sentAt);
    if (isNaN(d.getTime())) return '';
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}u`;
    return `${Math.floor(diff / 86400)}d`;
  }

  if (loading) return <div className="off-page"><div className="off-loading">Laden...</div></div>;
  if (notFound) return <div className="off-page"><div className="off-loading">Gesprek niet gevonden.</div></div>;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'veilo.com';
  const convUrl = `${origin}/off/${id}`;

  return (
    <div className="off-page">
      <div className="off-card">
        <div className="off-link-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#28A0C8"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
          <a href={convUrl} className="off-link-url">{convUrl}</a>
        </div>
        <p className="off-link-tip">Bewaar deze link in je browser. Als de andere partij antwoordt, kan je hier zien en antwoorden.</p>
        <h3 className="off-conv-title">Gesprek met {conv.profileUsername || 'gebruiker'}</h3>

        <div className="off-messages">
          {(conv.messages || []).map((m: any, i: number) => (
            <div key={i} className={`off-msg ${m.from === 'profile' ? 'from-profile' : 'from-anon'}`}>
              <span className="off-msg-sender">{m.from === 'profile' ? conv.profileUsername || 'Gebruiker' : 'Jij'}</span>
              <span className="off-msg-time">{formatTime(m.sentAt)}</span>
              <p className="off-msg-text">{m.text}</p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="off-input-row">
          <textarea
            className="off-input"
            placeholder="Jouw bericht"
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            rows={2}
          />
          <button className="off-send" onClick={sendMessage} disabled={sending || !msgText.trim()}>Verzenden</button>
        </div>
      </div>
    </div>
  );
}
