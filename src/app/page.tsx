'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInWithPopup, FacebookAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import './home.css';

/* ──────────────────────────────────────
   Homepage – exact replica of Ribony.com
   Language: Dutch · No mobile-app buttons
   ────────────────────────────────────── */

const SLOGANS = [
  'Anoniem chatten met anderen',
  'Geef Veils',
  "Stuur foto's",
  'Word lid en ontvang anonieme berichten',
];

/* Placeholder demo users shown on the homepage grid */
const DEMO_USERS = [
  { username: 'anoniem1', img: '/images/default-avatar.svg', alt: 'Gebruiker 1' },
  { username: 'anoniem2', img: '/images/default-avatar.svg', alt: 'Gebruiker 2' },
  { username: 'anoniem3', img: '/images/default-avatar.svg', alt: 'Gebruiker 3' },
  { username: 'anoniem4', img: '/images/default-avatar.svg', alt: 'Gebruiker 4' },
  { username: 'anoniem5', img: '/images/default-avatar.svg', alt: 'Gebruiker 5' },
  { username: 'anoniem6', img: '/images/default-avatar.svg', alt: 'Gebruiker 6' },
  { username: 'anoniem7', img: '/images/default-avatar.svg', alt: 'Gebruiker 7' },
  { username: 'anoniem8', img: '/images/default-avatar.svg', alt: 'Gebruiker 8' },
  { username: 'anoniem9', img: '/images/default-avatar.svg', alt: 'Gebruiker 9' },
  { username: 'anoniem10', img: '/images/default-avatar.svg', alt: 'Gebruiker 10' },
  { username: 'anoniem11', img: '/images/default-avatar.svg', alt: 'Gebruiker 11' },
  { username: 'anoniem12', img: '/images/default-avatar.svg', alt: 'Gebruiker 12' },
  { username: 'anoniem13', img: '/images/default-avatar.svg', alt: 'Gebruiker 13' },
  { username: 'anoniem14', img: '/images/default-avatar.svg', alt: 'Gebruiker 14' },
  { username: 'anoniem15', img: '/images/default-avatar.svg', alt: 'Gebruiker 15' },
  { username: 'anoniem16', img: '/images/default-avatar.svg', alt: 'Gebruiker 16' },
  { username: 'anoniem17', img: '/images/default-avatar.svg', alt: 'Gebruiker 17' },
  { username: 'anoniem18', img: '/images/default-avatar.svg', alt: 'Gebruiker 18' },
  { username: 'anoniem19', img: '/images/default-avatar.svg', alt: 'Gebruiker 19' },
  { username: 'anoniem20', img: '/images/default-avatar.svg', alt: 'Gebruiker 20' },
];

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  /* Redirect logged-in users to their profile */
  useEffect(() => {
    if (!loading && user && profile?.username) {
      router.replace(`/${profile.username}`);
    }
  }, [loading, user, profile, router]);

  /* ── Login state ── */
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState(false);

  /* ── Register state ── */
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [serviceCheck, setServiceCheck] = useState(false);
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  /* ── Search state ── */
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);

  /* ── Modal state ── */
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactUsername, setContactUsername] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

  // Check for contact URL parameter
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('contact=true')) {
      setShowContactModal(true);
      // Clean up the URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  /* ── Online Users state ── */
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [filteredOnlineUsers, setFilteredOnlineUsers] = useState<any[]>([]);

  /* Fetch all users for search and online status */
  useEffect(() => {
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snap) => {
      const usersData = snap.docs.map(doc => ({
        uid: doc.id,
        ...(doc.data() as any)
      }));

      // Filter for online users (active in last 5 minutes)
      const now = Date.now();
      const online = usersData
        .filter(u => u.lastSeen && (now - u.lastSeen.toMillis()) < 300000)
        .map(u => ({
          username: u.username || '',
          img: u.profileImg || '/images/default-avatar.svg',
          displayName: u.displayName || u.username || '',
          bio: u.bio || '',
          city: u.city || ''
        }));
      setOnlineUsers(online);
      setFilteredOnlineUsers(online);
    });
    return () => unsubscribe();
  }, []);

  /* Real-time Search Logic */
  useEffect(() => {
    if (!searchActive || !searchQuery.trim()) {
      setFilteredOnlineUsers(onlineUsers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = onlineUsers.filter(u => 
      u.displayName.toLowerCase().includes(query) ||
      u.bio.toLowerCase().includes(query) ||
      u.city.toLowerCase().includes(query)
    );
    setFilteredOnlineUsers(filtered);
  }, [searchQuery, searchActive, onlineUsers]);

  /* ── Online Status Tracking ── */
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    
    // Update lastSeen every 2 minutes
    const updateLastSeen = async () => {
      try {
        await updateDoc(userRef, {
          lastSeen: serverTimestamp()
        });
      } catch (err) {
        console.error('Error updating lastSeen:', err);
      }
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 120000);
    
    return () => clearInterval(interval);
  }, [user]);

  /* ── Slogan animation ── */
  const [activeSloganIdx, setActiveSloganIdx] = useState(0);
  const sloganInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    sloganInterval.current = setInterval(() => {
      setActiveSloganIdx((prev) => (prev + 1) % SLOGANS.length);
    }, 3000);
    return () => {
      if (sloganInterval.current) clearInterval(sloganInterval.current);
    };
  }, []);

  /* ── Handlers ── */
  async function handleLogin(e?: FormEvent) {
    e?.preventDefault();
    setLoginError(false);
    try {
      // Look up email by username in Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', loginUser));
      const snap = await getDocs(q);
      if (snap.empty) {
        setLoginError(true);
        return;
      }
      const userData = snap.docs[0].data();
      const email = userData.email;
      if (!email) {
        setLoginError(true);
        return;
      }
      await signInWithEmailAndPassword(auth, email, loginPass);
      window.location.href = `/${loginUser}`;
    } catch (err) {
      console.error('Login error:', err);
      setLoginError(true);
    }
  }

  async function handleRegister(e?: FormEvent) {
    e?.preventDefault();
    if (!serviceCheck) {
      setRegError('Je hebt de gebruiksvoorwaarden niet geaccepteerd.');
      return;
    }
    if (regLoading) return;
    setRegLoading(true);
    setRegError('');
    try {
      // Step 1: Create Firebase Auth user
      let cred;
      try {
        cred = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      } catch (authErr: unknown) {
        const code = (authErr as { code?: string }).code;
        if (code === 'auth/email-already-in-use') {
          setRegError('Dit e-mailadres is al in gebruik.');
        } else if (code === 'auth/weak-password') {
          setRegError('Wachtwoord moet minstens 6 tekens bevatten.');
        } else if (code === 'auth/invalid-email') {
          setRegError('Ongeldig e-mailadres.');
        } else {
          console.error('Auth error:', authErr);
          setRegError('Registratiefout: ' + ((authErr as { message?: string }).message || 'Onbekend'));
        }
        return;
      }

      // Step 2: Update display name
      await updateProfile(cred.user, { displayName: regName });

      // Step 3: Save profile to Firestore
      try {
        await setDoc(doc(db, 'users', cred.user.uid), {
          name: regName,
          username: regUsername,
          email: regEmail,
          createdAt: new Date().toISOString(),
        });
      } catch (fsErr) {
        console.error('Firestore write error:', fsErr);
        setRegError('Profiel opslaan mislukt: ' + ((fsErr as { message?: string }).message || 'Onbekend'));
        // Auth user was created, still redirect
        window.location.href = `/${regUsername}`;
        return;
      }

      window.location.href = `/${regUsername}`;
    } catch (err: unknown) {
      console.error('Register unexpected error:', err);
      setRegError('Er is een fout opgetreden: ' + ((err as { message?: string }).message || 'Onbekend'));
    } finally {
      setRegLoading(false);
    }
  }

  async function handleFacebookLogin() {
    try {
      const provider = new FacebookAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      await setDoc(doc(db, 'users', result.user.uid), {
        name: result.user.displayName || '',
        email: result.user.email || '',
        createdAt: new Date().toISOString(),
      }, { merge: true });
      const fbDoc = await getDoc(doc(db, 'users', result.user.uid));
      const fbUsername = fbDoc.exists() ? fbDoc.data().username : '';
      window.location.href = fbUsername ? `/${fbUsername}` : '/';
    } catch {
      setRegError('Facebook-login mislukt. Probeer het opnieuw.');
    }
  }

  async function handleForgotPassword() {
    if (!forgotEmail.trim()) return;
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setForgotSent(true);
    } catch {
      setForgotSent(true);
    }
  }

  function handleSearch() {
    if (searchQuery.trim()) {
      setSearchActive(true);
    } else {
      setSearchActive(false);
    }
  }

  function clearSearch() {
    setSearchQuery('');
    setSearchActive(false);
  }

  return (
    <>
      {/* ── BACKGROUND GRADIENT (exact Ribony dark-violet radial) ── */}
      <div id="gradient" />

      {/* ── MAIN CONTENT WRAPPER ── */}
      <div className="hcontent">
        {/* ═══════ HEADER ═══════ */}
        <header className="header">
          <div className="logo">
            <Link href="/" aria-label="VEILO Home" />
          </div>
          <div className="logins">
            <p>Heb je al een account?</p>
            <form
              onSubmit={handleLogin}
              style={{ display: 'contents' }}
            >
              <input
                type="text"
                placeholder="Gebruikersnaam"
                value={loginUser}
                onChange={(e) => { setLoginUser(e.target.value); setLoginError(false); }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <input
                type="password"
                placeholder="Wachtwoord"
                value={loginPass}
                onChange={(e) => { setLoginPass(e.target.value); setLoginError(false); }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <input type="submit" value="Inloggen" />
            </form>
            <div className="clear" />
            <span>
              <a onClick={() => setShowForgotModal(true)} style={{ cursor: 'pointer' }}>Wachtwoord vergeten</a>
            </span>
            <strong
              className="login-error-msg"
              style={{ opacity: loginError ? 1 : 0 }}
            >
              Onjuiste inloggegevens
            </strong>
          </div>
        </header>

        {/* ═══════ HOME LEFT ═══════ */}
        <div className="home_left">
          {/* Slogan rotator – Ribony-style slide-up */}
          <div id="holder">
            <div id="slogans">
              {SLOGANS.map((s, i) => {
                let className = 'slogan';
                if (i === activeSloganIdx) className += ' slogan-active';
                else if (i === (activeSloganIdx - 1 + SLOGANS.length) % SLOGANS.length) className += ' slogan-exit';
                else className += ' slogan-hidden';
                return (
                  <p className={className} key={i}>
                    <strong>{s}</strong>
                  </p>
                );
              })}
            </div>
          </div>

          <p>
            Klik op iemand hieronder om direct te chatten. Lid worden is{' '}
            <b>niet nodig.</b>
          </p>

          {/* Search bar */}
          <div className="hforms">
            <div
              className="refreshh"
              onClick={handleSearch}
              title="Zoeken"
            >
              🔍
            </div>
            <input
              type="text"
              placeholder="Naam, bio of stad"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            {searchActive && (
              <div id="c_r_text">
                <div className="htags">
                  <label>{searchQuery}</label>
                  <span
                    className="hsil"
                    onClick={clearSearch}
                    style={{ cursor: 'pointer', marginLeft: 6 }}
                  >
                    ✕
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Popular user card */}
          <div className="home_pop">
            <Link href="/populair" target="_blank">
              <img
                src="/images/default-avatar.svg"
                alt="Populaire gebruiker profielfoto"
              />
              <div>
                <strong>POPULAIR</strong>
                <h3>Gebruiker</h3>
                <p>
                  Vandaag <b>0</b> Veils
                </p>
              </div>
            </Link>
          </div>

          {/* User grid */}
          <div className="home_pop_list">
            <ul id="randoms">
              {filteredOnlineUsers.map((u, i) => (
                <li key={u.username || i} title={u.username} className="online-item">
                  <Link href={`/${u.username}`} target="_blank">
                    <img src={u.img} alt={`${u.displayName} profielfoto`} />
                    <div className="online-tooltip">
                      <strong>{u.displayName}</strong>
                      {u.bio && <p>{u.bio}</p>}
                    </div>
                  </Link>
                </li>
              ))}
              {filteredOnlineUsers.length === 0 && !searchActive && (
                <p style={{ color: '#999', fontSize: 13, padding: '20px 0' }}>Geen online gebruikers op dit moment.</p>
              )}
              {filteredOnlineUsers.length === 0 && searchActive && (
                <p style={{ color: '#999', fontSize: 13, padding: '20px 0' }}>Geen gebruikers gevonden voor &quot;{searchQuery}&quot;.</p>
              )}
            </ul>
          </div>
        </div>

        {/* ═══════ HOME RIGHT – Registration ═══════ */}
        <div className="home_right">
          <h3>
            <b>Registreren</b>
          </h3>

          <button
            type="button"
            className="fb-login-btn"
            onClick={handleFacebookLogin}
          >
            <span className="fb-icon">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="#fff">
                <path d="M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5a1 1 0 0 1 1-1h3v-4h-3a5 5 0 0 0-5 5v2.01h-2l-.396 3.98h2.396v8.01Z" />
              </svg>
            </span>
            <span>Registreren met <b>Facebook</b></span>
          </button>

          <div className="login_line">
            <span>Of</span>
          </div>

          <form onSubmit={handleRegister}>
            <div>
              <input
                type="text"
                placeholder="Naam"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
              />
            </div>
            <input
              type="text"
              placeholder="Gebruikersnaam"
              value={regUsername}
              onChange={(e) => setRegUsername(e.target.value)}
            />
            <input
              type="email"
              placeholder="E-mail"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Wachtwoord"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
            />

            {regError && (
              <div className="errorbox">
                <span>⚠</span> {regError}
              </div>
            )}

            <span>
              <label className="container">
                <input
                  type="checkbox"
                  checked={serviceCheck}
                  onChange={(e) => setServiceCheck(e.target.checked)}
                />
                <span className="checkmark" />{' '}
                Ik ga akkoord met de{' '}
                <Link href="/beleid" target="_blank">
                  gebruiksvoorwaarden
                </Link>{' '}
                van VEILO
              </label>
            </span>

            <button
              type="submit"
              className="joinnow"
              disabled={regLoading}
            >
              <b>{regLoading ? 'Bezig...' : 'Voltooien'}</b>
            </button>
          </form>
        </div>

        {/* ═══════ FOOTER ═══════ */}
        <div className="hfooter">
          <p>Veilo © 2026</p>
          <ul>
            <li>
              <a onClick={() => setShowContactModal(true)} style={{ cursor: 'pointer' }}>Contact</a>
            </li>
            <li>
              <Link href="/beleid" target="_blank">
                Privacybeleid
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* ═══════ FORGOT PASSWORD MODAL ═══════ */}
      {showForgotModal && (
        <div className="modal-overlay" onClick={() => { setShowForgotModal(false); setForgotSent(false); setForgotEmail(''); }}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Wachtwoord herstellen</h2>
            {forgotSent ? (
              <div style={{ padding: '20px 30px 30px' }}>
                <p style={{ color: '#333', fontSize: 14, lineHeight: 1.7 }}>
                  Als het e-mailadres bij ons bekend is, ontvang je binnen enkele minuten een e-mail met instructies.
                </p>
              </div>
            ) : (
              <div style={{ padding: '20px 30px 30px' }}>
                <label className="modal-label">E-mail</label>
                <input
                  type="email"
                  className="modal-input"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
                <button
                  className="modal-submit"
                  onClick={handleForgotPassword}
                >
                  Verstuur
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ CONTACT MODAL ═══════ */}
      {showContactModal && (
        <div className="modal-overlay" onClick={() => { setShowContactModal(false); setContactSent(false); setContactName(''); setContactUsername(''); setContactEmail(''); setContactMessage(''); }}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-header-icon">✉</span>
              Neem contact op
            </div>
            {contactSent ? (
              <div style={{ padding: '20px 30px 30px' }}>
                <p style={{ color: '#333', fontSize: 14, lineHeight: 1.7 }}>
                  Bedankt voor je bericht! We nemen zo snel mogelijk contact met je op.
                </p>
              </div>
            ) : (
              <div style={{ padding: '20px 30px 30px' }}>
                <label className="modal-label">Naam</label>
                <input
                  type="text"
                  className="modal-input"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
                <label className="modal-label">Gebruikersnaam</label>
                <input
                  type="text"
                  className="modal-input"
                  value={contactUsername}
                  onChange={(e) => setContactUsername(e.target.value)}
                />
                <p style={{ fontSize: 12, color: '#999', margin: '-8px 0 12px 0' }}>Geen lid? Laat dit veld leeg.</p>
                <label className="modal-label">E-mail</label>
                <input
                  type="email"
                  className="modal-input"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
                <label className="modal-label">Bericht</label>
                <textarea
                  className="modal-textarea"
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  rows={4}
                />
                <button
                  className="modal-submit"
                  onClick={() => { if (contactName.trim() && contactEmail.trim() && contactMessage.trim()) setContactSent(true); }}
                >
                  Verstuur
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
