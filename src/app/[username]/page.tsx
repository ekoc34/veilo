'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, updateDoc, increment, addDoc, onSnapshot, orderBy, serverTimestamp, Timestamp, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Conversation, ChatMsg, getAnonId, generateAnonName } from '@/lib/chat';
import './profile.css';

/* ──────────────────────────────────────
   Profile / Chat Page – Ribony replica
   Language: Dutch · No mobile-app buttons
   ────────────────────────────────────── */

interface OnlineUser {
  username: string;
  img: string;
  alt: string;
}

interface ProfileData {
  uid: string;
  displayName: string;
  username: string;
  bio: string;
  followers: number;
  profileImg: string;
  veil1: number;
  veil2: number;
  veil3: number;
  veil4: number;
}

const VEIL_ITEMS = [
  { label: 'Spraakzaam', icon: '/images/veil-spraakzaam.svg' },
  { label: 'Grappig', icon: '/images/veil-grappig.svg' },
  { label: 'Eerlijk', icon: '/images/veil-eerlijk.svg' },
  { label: 'Sympathiek', icon: '/images/veil-sympathiek.svg' },
];

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user, profile: myProfile, logout } = useAuth();

  /* Profile data loaded from Firestore */
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileNotFound, setProfileNotFound] = useState(false);

  /* Chat state */
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [bgVisible, setBgVisible] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  const [filterActive, setFilterActive] = useState(false);
  const [showPopular, setShowPopular] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnlineList, setShowOnlineList] = useState(true);
  const [allowPhotos, setAllowPhotos] = useState(true);
  const [revealIdentity, setRevealIdentity] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'design' | 'privacy' | 'password'>('general');
  const [settingsName, setSettingsName] = useState('');
  const [settingsEmail, setSettingsEmail] = useState('');
  const [settingsCity, setSettingsCity] = useState('');
  const [settingsBio, setSettingsBio] = useState('');
  const [settingsOffline, setSettingsOffline] = useState('');
  const [privacyShowCount, setPrivacyShowCount] = useState(true);
  const [privacyShowPopular, setPrivacyShowPopular] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isOwnProfile = user && myProfile?.username === username;

  /* Online users (will be populated from Firestore later) */
  const [onlineUsers] = useState<OnlineUser[]>(
    Array.from({ length: 16 }, (_, i) => ({
      username: `gebruiker${i + 1}`,
      img: '/images/default-avatar.svg',
      alt: `Gebruiker ${i + 1}`,
    }))
  );

  /* Load profile: use auth context instantly for own profile, Firestore for others */
  useEffect(() => {
    // If this is the logged-in user's own profile, use cached auth data immediately
    if (myProfile && myProfile.username === username) {
      setProfileData({
        uid: myProfile.uid,
        displayName: myProfile.name || username,
        username: myProfile.username,
        bio: myProfile.bio || '',
        followers: myProfile.followers || 0,
        profileImg: myProfile.profileImg || '/images/default-avatar.svg',
        veil1: 0,
        veil2: 0,
        veil3: 0,
        veil4: 0,
      });
      setProfileLoading(false);
      return;
    }

    // For other users, query Firestore
    async function loadProfile() {
      setProfileLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docData = snap.docs[0].data();
          setProfileData({
            uid: snap.docs[0].id,
            displayName: docData.name || username,
            username: docData.username || username,
            bio: docData.bio || '',
            followers: docData.followers || 0,
            profileImg: docData.profileImg || '/images/default-avatar.svg',
            veil1: docData.veil1 || 0,
            veil2: docData.veil2 || 0,
            veil3: docData.veil3 || 0,
            veil4: docData.veil4 || 0,
          });
        } else {
          setProfileNotFound(true);
        }
      } catch {
        setProfileNotFound(true);
      } finally {
        setProfileLoading(false);
      }
    }
    loadProfile();
  }, [username, myProfile]);

  /* Load conversations for profile owner */
  useEffect(() => {
    if (!isOwnProfile || !profileData?.uid) return;
    const convRef = collection(db, 'users', profileData.uid, 'conversations');
    const q = query(convRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Conversation));
      setConversations(convs);
      if (!activeConvId && convs.length > 0) {
        setActiveConvId(convs[0].id);
      }
    });
    return () => unsubscribe();
  }, [isOwnProfile, profileData?.uid, activeConvId]);

  /* Load messages for active conversation */
  useEffect(() => {
    if (!activeConvId) return;
    const msgsRef = collection(db, 'users', profileData!.uid, 'conversations', activeConvId, 'messages');
    const q = query(msgsRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((d) => {
        const data = d.data();
        const ts = data.createdAt?.toDate?.() || new Date();
        return {
          id: d.id,
          sender: data.sender || 'Anoniem',
          senderUid: data.senderUid || null,
          text: data.text || '',
          time: `${ts.getHours().toString().padStart(2, '0')}:${ts.getMinutes().toString().padStart(2, '0')}`,
          createdAt: ts,
        } as ChatMsg;
      });
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [activeConvId, profileData?.uid]);

  /* Real-time chat messages from Firestore (for visitors) */
  useEffect(() => {
    if (isOwnProfile || !profileData?.uid) return;
    
    // Always start with empty messages for visitors
    setMessages([]);
    
    const chatId = profileData.uid;
    const msgsRef = collection(db, 'chats', chatId, 'messages');
    const sessionStart = new Date(); // Track session start
    
    const q = query(msgsRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMsgs = snapshot.docs
        .map((d) => {
          const data = d.data();
          const ts = data.createdAt?.toDate?.() || new Date();
          return {
            id: d.id,
            sender: data.sender || 'Anoniem',
            senderUid: data.senderUid || null,
            text: data.text || '',
            time: `${ts.getHours().toString().padStart(2, '0')}:${ts.getMinutes().toString().padStart(2, '0')}`,
            createdAt: ts,
          } as ChatMsg;
        })
        // Only show messages sent AFTER visitor opened the page
        .filter((msg) => msg.createdAt > sessionStart)
        // Additional safety: only show messages from the last 30 seconds
        .filter((msg) => (Date.now() - msg.createdAt.getTime()) < 30000);
      setMessages(newMsgs);
      
      // Auto-create conversation when visitor sends message
      if (newMsgs.length > 0) {
        const lastMsg = newMsgs[newMsgs.length - 1];
        if (lastMsg.senderUid) {
          ensureConversation(lastMsg.sender, lastMsg.senderUid);
        }
      }
    });
    return () => unsubscribe();
  }, [isOwnProfile, profileData?.uid]);

  /* Profile owner also listens to visitor messages for real-time updates */
  useEffect(() => {
    if (!isOwnProfile || !profileData?.uid) return;
    
    const chatId = profileData.uid;
    const msgsRef = collection(db, 'chats', chatId, 'messages');
    
    const q = query(msgsRef, orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const ts = data.createdAt?.toDate?.() || new Date();
          const newMsg: ChatMsg = {
            id: change.doc.id,
            sender: data.sender || 'Anoniem',
            senderUid: data.senderUid || null,
            text: data.text || '',
            time: `${ts.getHours().toString().padStart(2, '0')}:${ts.getMinutes().toString().padStart(2, '0')}`,
            createdAt: ts,
          };
          
          // Auto-create conversation for new visitor messages
          if (newMsg.senderUid) {
            ensureConversation(newMsg.sender, newMsg.senderUid);
          }
        }
      });
    });
    return () => unsubscribe();
  }, [isOwnProfile, profileData?.uid]);

  /* Clear messages when page closes (for visitors) */
  useEffect(() => {
    return () => {
      if (!isOwnProfile) {
        setMessages([]);
      }
    };
  }, [isOwnProfile]);

  /* Send message to Firestore */
  async function sendMessage() {
    if (!message.trim() || !profileData?.uid) return;
    
    // Prevent self-messaging on own profile
    if (isOwnProfile) {
      if (!activeConvId) return;
      const senderName = myProfile?.name || 'Eigenaar';
      try {
        await addDoc(collection(db, 'users', profileData.uid, 'conversations', activeConvId, 'messages'), {
          sender: senderName,
          senderUid: user?.uid,
          text: message,
          createdAt: serverTimestamp(),
        });
        setMessage('');
      } catch {
        /* silently fail */
      }
      return;
    }
    
    const anonId = getAnonId();
    const senderName = user && revealIdentity ? myProfile?.name || username : generateAnonName();
    
    try {
      // For visitors: use legacy single chat
      await addDoc(collection(db, 'chats', profileData.uid, 'messages'), {
        sender: senderName,
        senderUid: user?.uid || anonId,
        text: message,
        createdAt: serverTimestamp(),
      });
      setMessage('');
    } catch {
      /* silently fail */
    }
  }

  /* Create conversation when visitor sends first message */
  async function ensureConversation(senderName: string, senderUid: string) {
    if (!profileData?.uid) return;
    
    // Use the senderUid as the anonId for tracking
    const anonId = senderUid;
    const convRef = collection(db, 'users', profileData.uid, 'conversations');
    const q = query(convRef, where('anonId', '==', anonId));
    const snap = await getDocs(q);
    if (snap.empty) {
      // Generate a consistent anon name for this conversation
      const anonName = senderUid === user?.uid ? (revealIdentity ? myProfile?.name || username : generateAnonName()) : senderName;
      const convDoc = await addDoc(convRef, {
        anonName,
        anonId,
        blocked: false,
        typing: false,
        ownerTyping: false,
        createdAt: serverTimestamp(),
      });
      return convDoc.id;
    }
    return snap.docs[0].id;
  }

  /* Give a veil to this profile */
  async function giveVeil(idx: number) {
    if (!profileData?.uid) return;
    const field = `veil${idx + 1}`;
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, { [field]: increment(1) });
        setProfileData((prev) =>
          prev ? { ...prev, [field]: (prev[field as keyof ProfileData] as number) + 1 } : prev
        );
      }
    } catch {
      /* silently fail */
    }
  }

  function handleRefresh() {
    if (searchCity.trim()) {
      setFilterActive(true);
    }
  }

  function removeFilter() {
    setSearchCity('');
    setFilterActive(false);
  }

  if (profileNotFound) {
    return (
      <div className="profile-body">
        <div style={{ color: '#fff', textAlign: 'center', paddingTop: 120, fontSize: 18 }}>
          Gebruiker niet gevonden.
        </div>
      </div>
    );
  }

  /* Use profileData if available, otherwise fall back to URL username */
  const displayName = profileData?.displayName || username;
  const bio = profileData?.bio || '';
  const followers = profileData?.followers || 0;
  const profileImg = profileData?.profileImg || '/images/default-avatar.svg';
  const veils = [
    profileData?.veil1 || 0,
    profileData?.veil2 || 0,
    profileData?.veil3 || 0,
    profileData?.veil4 || 0,
  ];

  return (
    <div className="profile-body">
      {/* ═══════ HEADER ═══════ */}
      <div className="prof-header">
        <div className="prof-container">
          <div className="prof-logo">
            <Link href="/">VEILO</Link>
          </div>
          <ul>
            {/* Show full navigation when viewing own profile */}
            {isOwnProfile && (
              <>
                {user && (
                  <li className="nav-hint-wrap">
                    <a className="nav-btn nav-user">
                      <img src="/images/icon-user.svg" alt="" />
                    </a>
                    <div className="nav-hint-dropdown">
                      <div className="nav-hint-item">
                        <span>Toon in online lijst</span>
                        <label className="toggle-switch">
                          <input type="checkbox" checked={showOnlineList} onChange={(e) => setShowOnlineList(e.target.checked)} />
                          <span className="toggle-slider"></span>
                          <span className="toggle-label">{showOnlineList ? 'Aan' : 'Uit'}</span>
                        </label>
                      </div>
                      <div className="nav-hint-item">
                        <span>{"Foto's mogen naar mij worden gestuurd"}</span>
                        <label className="toggle-switch">
                          <input type="checkbox" checked={allowPhotos} onChange={(e) => setAllowPhotos(e.target.checked)} />
                          <span className="toggle-slider"></span>
                          <span className="toggle-label">{allowPhotos ? 'Aan' : 'Uit'}</span>
                        </label>
                      </div>
                    </div>
                  </li>
                )}
                <li>
                  <a className="nav-btn nav-settings" onClick={() => { setShowSettings(true); setSettingsTab('general'); }} style={{ cursor: 'pointer' }}>
                    <img src="/images/icon-settings.svg" alt="" />
                    Instellingen
                  </a>
                </li>
                <li>
                  <a className="nav-btn nav-messages" onClick={() => setShowMessages(true)} style={{ cursor: 'pointer' }}>
                    <img src="/images/icon-messages.svg" alt="" />
                    Berichten
                  </a>
                </li>
                <li>
                  <a className="nav-btn nav-following" onClick={() => setShowFollowing(true)} style={{ cursor: 'pointer' }}>
                    <img src="/images/icon-following.svg" alt="" />
                    Volglijst
                  </a>
                </li>
                <li>
                  <a className="nav-btn nav-popular" onClick={() => setShowPopular(true)} style={{ cursor: 'pointer' }}>
                    <img src="/images/icon-popular.svg" alt="" />
                    Populairen
                  </a>
                </li>
                <li>
                  <a href="#" className="nav-btn nav-groups">
                    <img src="/images/icon-groups.svg" alt="" />
                    Groepen
                  </a>
                </li>
                <li>
                  <a onClick={logout} className="nav-btn nav-logout" style={{ cursor: 'pointer' }}>
                    <img src="/images/icon-logout.svg" alt="" />
                    Uitloggen
                  </a>
                </li>
              </>
            )}
            {/* Always show speaker icon at the very end */}
            <li>
              <a className="nav-btn nav-sound" onClick={() => setSoundOn(!soundOn)} style={{ cursor: 'pointer' }}>
                <img src="/images/icon-sound.svg" alt="" />
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* ═══════ POPULAIREN MODAL ═══════ */}
      {showPopular && (
        <div className="modal-overlay" onClick={() => setShowPopular(false)}>
          <div className="modal-popular" onClick={(e) => e.stopPropagation()}>
            <div className="modal-popular-head">
              <span className="modal-popular-icon">⏱</span>
              <h2>Populairen van vandaag</h2>
              <a className="modal-close" onClick={() => setShowPopular(false)}>✕</a>
            </div>
            <div className="modal-popular-body">
              <div className="modal-popular-col">
                <span>Veils van vandaag</span>
              </div>
              <div className="modal-popular-list">
                <div className="modal-popular-empty">
                  <img src="/images/default-avatar.svg" alt="" />
                  <p>Je staat nog niet in de top 100 van de veillijst.</p>
                </div>
              </div>
              <div className="modal-popular-cta">
                <a href="#">PRAAT MET MEER MENSEN</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ BERICHTEN MODAL ═══════ */}
      {showMessages && (
        <div className="modal-overlay" onClick={() => setShowMessages(false)}>
          <div className="modal-messages" onClick={(e) => e.stopPropagation()}>
            <div className="modal-messages-head">
              <img src="/images/icon-messages.svg" alt="" className="modal-messages-icon" />
              <h2>Berichten</h2>
              <div className="modal-messages-actions">
                <a onClick={() => {}} style={{ cursor: 'pointer' }}>Alles selecteren</a>
                <a onClick={() => {}} style={{ cursor: 'pointer' }}>Selectie verwijderen</a>
              </div>
              <a className="modal-close" onClick={() => setShowMessages(false)}>✕</a>
            </div>
            <div className="modal-messages-body">
              <div className="modal-messages-empty">
                Geen berichten.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ INSTELLINGEN MODAL ═══════ */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-settings" onClick={(e) => e.stopPropagation()}>
            <div className="modal-settings-head">
              <img src="/images/icon-settings.svg" alt="" className="modal-settings-icon" />
              <h2>Instellingen</h2>
              <a className="modal-close" onClick={() => setShowSettings(false)}>✕</a>
            </div>
            <div className="modal-settings-tabs">
              <a className={settingsTab === 'general' ? 'active' : ''} onClick={() => setSettingsTab('general')}>Algemeen</a>
              <a className={settingsTab === 'design' ? 'active' : ''} onClick={() => setSettingsTab('design')}>Ontwerp</a>
              <a className={settingsTab === 'privacy' ? 'active' : ''} onClick={() => setSettingsTab('privacy')}>Privacy</a>
              <a className={settingsTab === 'password' ? 'active' : ''} onClick={() => setSettingsTab('password')}>Wachtwoord</a>
            </div>
            <div className="modal-settings-body">
              {settingsTab === 'general' && (
                <div className="settings-form">
                  <div className="settings-row">
                    <label>Naam</label>
                    <div className="settings-field">
                      <input type="text" value={settingsName} onChange={(e) => setSettingsName(e.target.value)} placeholder="Naam" />
                      <span>Je bent makkelijker te vinden als je je naam invult.</span>
                    </div>
                  </div>
                  <div className="settings-row">
                    <label>E-mail</label>
                    <div className="settings-field">
                      <input type="email" value={settingsEmail} onChange={(e) => setSettingsEmail(e.target.value)} placeholder="E-mailadres" />
                      <span>Vul een e-mailadres in zodat we contact kunnen opnemen.</span>
                    </div>
                  </div>
                  <div className="settings-row">
                    <label>Stad</label>
                    <div className="settings-field">
                      <input type="text" value={settingsCity} onChange={(e) => setSettingsCity(e.target.value)} placeholder="Waar woon je?" />
                      <span>Waar woon je?</span>
                    </div>
                  </div>
                  <div className="settings-row">
                    <label>Bio</label>
                    <div className="settings-field">
                      <textarea value={settingsBio} onChange={(e) => setSettingsBio(e.target.value)} />
                      <span>Vertel iets over jezelf zodat mensen je leren kennen.</span>
                    </div>
                  </div>
                  <div className="settings-row">
                    <label>Offline bericht</label>
                    <div className="settings-field">
                      <textarea value={settingsOffline} onChange={(e) => setSettingsOffline(e.target.value)} placeholder="Bijv. wanneer je weer online bent." />
                      <span>Dit bericht wordt getoond als je offline bent.</span>
                    </div>
                  </div>
                  <div className="settings-row">
                    <label></label>
                    <div className="settings-field">
                      <a className="settings-freeze">Account bevriezen</a>
                    </div>
                  </div>
                  <div className="settings-row">
                    <label></label>
                    <div className="settings-field">
                      <button className="settings-btn">Bijwerken</button>
                    </div>
                  </div>
                </div>
              )}
              {settingsTab === 'design' && (
                <div className="settings-design">
                  <div className="settings-design-col">
                    <h3>Profielfoto wijzigen</h3>
                    <div className="settings-design-box">
                      <img src={profileData?.profileImg || '/images/default-avatar.svg'} alt="" />
                      <button className="settings-btn">Bladeren</button>
                    </div>
                    <span>Maximale bestandsgrootte: 2MB</span>
                  </div>
                  <div className="settings-design-col">
                    <h3>Achtergrondfoto wijzigen</h3>
                    <div className="settings-design-box">
                      <div className="settings-bg-placeholder"></div>
                      <button className="settings-btn">Bladeren</button>
                    </div>
                    <label className="settings-checkbox"><input type="checkbox" /> Achtergrond herhalen</label>
                    <a className="settings-remove-link">Achtergrond verwijderen</a>
                  </div>
                </div>
              )}
              {settingsTab === 'privacy' && (
                <div className="settings-form">
                  <h3>Privacy-instellingen</h3>
                  <label className="settings-checkbox">
                    <input type="checkbox" checked={privacyShowCount} onChange={(e) => setPrivacyShowCount(e.target.checked)} />
                    Toon hoeveel mensen je hebt gesproken op je profiel.
                  </label>
                  <label className="settings-checkbox">
                    <input type="checkbox" checked={privacyShowPopular} onChange={(e) => setPrivacyShowPopular(e.target.checked)} />
                    Toon mij niet op de homepage, ook niet als ik populair ben. (Deze wijziging kan even duren.)
                  </label>
                  <a className="settings-remove-link" style={{ display: 'block', marginTop: 15 }}>Verwijder alle blokkades die je tot nu toe hebt gemaakt.</a>
                  <button className="settings-btn" style={{ marginTop: 15 }}>Wijzigingen opslaan</button>
                </div>
              )}
              {settingsTab === 'password' && (
                <div className="settings-form">
                  <h3>Wachtwoord wijzigen</h3>
                  <div className="settings-row">
                    <label>Oud wachtwoord</label>
                    <div className="settings-field">
                      <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Huidig wachtwoord" />
                      <span>Je huidige wachtwoord</span>
                    </div>
                  </div>
                  <div className="settings-row">
                    <label>Nieuw wachtwoord</label>
                    <div className="settings-field">
                      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nieuw wachtwoord" />
                      <span>Nieuw wachtwoord</span>
                    </div>
                  </div>
                  <div className="settings-row">
                    <label>Bevestig wachtwoord</label>
                    <div className="settings-field">
                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Herhaal nieuw wachtwoord" />
                      <span>Herhaal nieuw wachtwoord</span>
                    </div>
                  </div>
                  <div className="settings-row">
                    <label></label>
                    <div className="settings-field">
                      <button className="settings-btn">Wijzigingen opslaan</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ VOLGLIJST MODAL ═══════ */}
      {showFollowing && (
        <div className="modal-overlay" onClick={() => setShowFollowing(false)}>
          <div className="modal-following" onClick={(e) => e.stopPropagation()}>
            <div className="modal-following-head">
              <img src="/images/icon-following.svg" alt="" className="modal-following-icon" />
              <h2>Volglijst</h2>
              <a className="modal-close" onClick={() => setShowFollowing(false)}>✕</a>
            </div>
            <div className="modal-following-body">
            </div>
          </div>
        </div>
      )}

      <div className="prof-container prof-top">
        {/* ═══════ ABOUT BOX ═══════ */}
        <div className="about_box">
          <h2>{displayName}</h2>
          <span></span>
          {bio && <p>{bio}</p>}
        </div>

        {/* ═══════ LEFT SIDEBAR ═══════ */}
        <div className="prof-left">
          <div className="profile_img">
            <img
              src={profileImg}
              alt={`${displayName} profielfoto`}
            />
          </div>
          <div className="left_follow_box">
            <div>
              <h4>Volgers</h4>
              <h5>{followers}</h5>
            </div>
          </div>

          {/* Veils */}
          {VEIL_ITEMS.map((item, i) => (
            <div
              key={i}
              className="ribbon_terminal"
              onClick={() => giveVeil(i)}
              style={{ cursor: 'pointer' }}
            >
              <span className={`green ribbon_icon_${i + 1}`}>
                <img src={item.icon} alt={item.label} />
              </span>
              <h4>{item.label}</h4>
              <h3>{veils[i]}</h3>
            </div>
          ))}
        </div>

        {/* ═══════ MAIN CHAT AREA ═══════ */}
        <div className="prof-main">
          <div className="chat_box">
            {/* Conversation tabs (only for profile owner) */}
            {isOwnProfile && conversations.length > 0 && (
              <div className="chat-tabs">
                {conversations.map((conv) => (
                  <a
                    key={conv.id}
                    className={activeConvId === conv.id ? 'active' : ''}
                    onClick={() => setActiveConvId(conv.id)}
                  >
                    {conv.blocked ? '🚫 ' : ''}{conv.anonName}
                    {conv.typing && ' typing...'}
                  </a>
                ))}
              </div>
            )}
            {/* Input box */}
            <div className="input_box">
              <input
                type="text"
                placeholder="Je bericht"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    sendMessage();
                    e.preventDefault();
                  }
                }}
              />
              <a className="input-camera" style={{ cursor: 'pointer' }}>
                <img src="/images/icon-camera.svg" alt="Foto" />
              </a>
              {user && !isOwnProfile && (
                <a className="input-eye" onClick={() => setRevealIdentity(!revealIdentity)} style={{ cursor: 'pointer' }} title={revealIdentity ? "Verberg identiteit" : "Toon identiteit"}>
                  <img src="/images/icon-eye.svg" alt="Identiteit" />
                </a>
              )}
            </div>

            <div className="boxed_chat_top">
              <div className="writing"></div>
              <div className="looked"></div>
            </div>

            {/* Messages */}
            <div className="message_box">
              {messages.length === 0 && (
                <div className="empty-chat">
                  <p style={{ color: '#999', textAlign: 'center', marginTop: 60 }}>
                    Stuur een anoniem bericht naar {displayName}
                  </p>
                </div>
              )}
              {[...messages].reverse().map((msg) => (
                <div key={msg.id} className="chat-msg">
                  <strong>{msg.sender}</strong> : {msg.text} <span>{msg.time}</span>
                </div>
              ))}
            </div>

            {/* ═══════ SHARE BAR ═══════ */}
            <div className="share-bar">
              <div className="share-bar-text">
                <p>Sluit deze pagina niet, je bent online. Mensen kunnen je berichten sturen.</p>
                <p>Deel je profiel met vrienden: <a href={`/${username}`} target="_blank">{typeof window !== 'undefined' ? `${window.location.origin}/${username}` : `veilo.com/${username}`}</a></p>
              </div>
              <div className="share-bar-icons">
                <a className="share-fb" href={`https://www.facebook.com/sharer/sharer.php?u=${typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : ''}`} target="_blank" rel="noopener noreferrer" title="Facebook">f</a>
                <a className="share-x" href={`https://twitter.com/intent/tweet?url=${typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : ''}`} target="_blank" rel="noopener noreferrer" title="X">𝕏</a>
                <a className="share-google" href={`https://plus.google.com/share?url=${typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : ''}`} target="_blank" rel="noopener noreferrer" title="Google">G</a>
              </div>
            </div>
          </div>

          {/* ═══════ PROMOTE BAR ═══════ */}
          <div className="promote-bar">
            <span>TOON JE PROFIEL BOVENAAN DE ONLINE LIJST</span>
            <a className="promote-btn">✔ NU ACTIVEREN</a>
          </div>

          {/* ═══════ ONLINE USERS BOX ═══════ */}
          <div className="online_box">
            <div className="online_box_head">
              {filterActive && (
                <ul>
                  <li>
                    <span className="filtre-text">{searchCity}</span>
                    <a
                      style={{ cursor: 'pointer' }}
                      onClick={removeFilter}
                    >
                      ✕
                    </a>
                  </li>
                </ul>
              )}
              <input
                type="submit"
                value="Vernieuwen"
                onClick={handleRefresh}
              />
              <input
                type="text"
                placeholder="Naam, stad of bio"
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRefresh();
                    e.preventDefault();
                  }
                }}
              />
            </div>
            <div className="list_tabs">
              <span className="current">
                <a className="peoples">Personen</a>
              </span>
            </div>
            <div className="online_list">
              <ul>
                {onlineUsers.map((u) => (
                  <li key={u.username}>
                    <Link href={`/${u.username}`} target="_blank">
                      <img src={u.img} alt={`${u.alt} profielfoto`} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ═══════ FOOTER ═══════ */}
          <div className="prof-footer">
            <span>VEILO © {new Date().getFullYear()}</span>
            <ul>
              <li>
                <Link href="/beleid" target="_blank">Help</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
