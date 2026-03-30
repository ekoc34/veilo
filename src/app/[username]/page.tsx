'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, updateDoc, increment, addDoc, onSnapshot, orderBy, serverTimestamp, Timestamp, limit, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
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
  displayName: string;
  bio: string;
  city: string;
}

interface ProfileData {
  uid: string;
  displayName: string;
  username: string;
  bio: string;
  city: string;
  followers: number;
  profileImg: string;
  themeColor: string;
  veil1: number;
  veil2: number;
  veil3: number;
  veil4: number;
  allowPhotos: boolean;
  privacyShowCount?: boolean;
  totalConversations?: number;
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
  const [settingsUpdated, setSettingsUpdated] = useState(false);
  const [showOnlineList, setShowOnlineList] = useState(true);
  const [allowPhotos, setAllowPhotos] = useState(true);
  const [revealIdentity, setRevealIdentity] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'design' | 'privacy' | 'password'>('general');
  const [settingsName, setSettingsName] = useState('');
  const [settingsEmail, setSettingsEmail] = useState('');
  const [settingsCity, setSettingsCity] = useState('');
  const [settingsBio, setSettingsBio] = useState('');
  const [settingsOffline, setSettingsOffline] = useState('');
  const [settingsColor, setSettingsColor] = useState('#28A0C8'); // Default theme color
  const [privacyShowCount, setPrivacyShowCount] = useState(true);
  const [privacyShowPopular, setPrivacyShowPopular] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [blockedSenders, setBlockedSenders] = useState<Set<string>>(new Set());
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState<string | null>(null);
  const [userLastActivity, setUserLastActivity] = useState<Map<string, number>>(new Map());
  const [showProfilePicChange, setShowProfilePicChange] = useState(false);
  const [selectedProfilePic, setSelectedProfilePic] = useState<string | null>(null);
  const [popularUsers, setPopularUsers] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [promoteSuccess, setPromoteSuccess] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const chatStartTime = useRef<number | null>(null);
  const [veilsGivenToday, setVeilsGivenToday] = useState<Record<number, boolean>>({});
  const [closedConversations, setClosedConversations] = useState<Set<string>>(new Set());
  const [isVisitorBlocked, setIsVisitorBlocked] = useState(false);
  const [visitorChatClosed, setVisitorChatClosed] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [showPhotoAlert, setShowPhotoAlert] = useState(false);
  const prevMsgCountRef = useRef<number>(0);
  const [contactUsername, setContactUsername] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState('');
  
  // Track session start time for clean state
  const sessionStartTime = useRef<number>(Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isOwnProfile = user && myProfile?.username === username;

  /* Dynamic Browser Tab Title (Visitor Case) */
  useEffect(() => {
    if (profileLoading || !profileData) return;
    
    const currentDisplayName = profileData.displayName || username;

    // Only update title for visitors. For owner, layout metadata already sets "Veilo"
    if (!isOwnProfile) {
      document.title = `${currentDisplayName} | Veilo`;
    }

    // Restore default title on unmount
    return () => {
      document.title = 'Veilo | Anoniem Chat';
    };
  }, [isOwnProfile, profileData, username, profileLoading]);

  /* Pre-fill settings when modal opens */
  useEffect(() => {
    if (showSettings && profileData) {
      setSettingsName(profileData.displayName || '');
      setSettingsEmail(myProfile?.email || '');
      setSettingsBio(profileData.bio || '');
      setSettingsUpdated(false);
    }
  }, [showSettings, profileData, myProfile]);

  /* Online status tracking */
  useEffect(() => {
    if (!user || !isOwnProfile) return;

    const userRef = doc(db, 'users', user.uid);
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
  }, [user, isOwnProfile]);

  /* Online users state */
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]); // For searching
  const [filteredOnlineUsers, setFilteredOnlineUsers] = useState<OnlineUser[]>([]);

  /* Fetch all users for search and online status */
  useEffect(() => {
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snap) => {
      const usersData = snap.docs.map(doc => ({
        uid: doc.id,
        ...(doc.data() as any)
      }));
      setAllUsers(usersData);

      // Filter for online users (active in last 5 minutes, opted-in to list)
      const now = Date.now();
      const online = usersData
        .filter(u => u.lastSeen && (now - u.lastSeen.toMillis()) < 300000 && u.showInOnlineList !== false)
        .sort((a, b) => {
          // First sort by isPromoted
          if (a.isPromoted && !b.isPromoted) return -1;
          if (!a.isPromoted && b.isPromoted) return 1;
          // Then sort by lastSeen
          return b.lastSeen.toMillis() - a.lastSeen.toMillis();
        })
        .map(u => ({
          username: u.username || '',
          img: u.profileImg || '/images/default-avatar.svg',
          alt: u.displayName || u.username || '',
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
    if (!searchCity.trim()) {
      setFilteredOnlineUsers(onlineUsers);
      return;
    }

    const query = searchCity.toLowerCase();
    // Search through ALL users, not just online ones
    const filtered = allUsers.filter(u => 
      (u.displayName || '').toLowerCase().includes(query) ||
      (u.bio || '').toLowerCase().includes(query) ||
      (u.city || '').toLowerCase().includes(query)
    ).map(u => ({
      username: u.username || '',
      img: u.profileImg || '/images/default-avatar.svg',
      alt: u.displayName || u.username || '',
      displayName: u.displayName || u.username || '',
      bio: u.bio || '',
      city: u.city || ''
    }));
    setFilteredOnlineUsers(filtered);
  }, [searchCity, onlineUsers, allUsers]);

  /* Load popular users by total veil count */
  useEffect(() => {
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snap) => {
      const usersData = snap.docs.map(d => ({ uid: d.id, ...(d.data() as any) }));
      const sorted = usersData
        .map(u => ({
          ...u,
          totalVeils: (u.veil1 || 0) + (u.veil2 || 0) + (u.veil3 || 0) + (u.veil4 || 0)
        }))
        .filter(u => u.totalVeils > 0)
        .sort((a, b) => b.totalVeils - a.totalVeils)
        .slice(0, 20);
      setPopularUsers(sorted);
    });
    return () => unsubscribe();
  }, []);

  /* Load following list for own profile */
  useEffect(() => {
    if (!user || !isOwnProfile) return;
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const followingUids: string[] = data.following || [];
        if (followingUids.length === 0) { setFollowingList([]); return; }
        const followedUsers = await Promise.all(
          followingUids.map(async (uid) => {
            const uDoc = await getDoc(doc(db, 'users', uid));
            if (uDoc.exists()) {
              const d = uDoc.data();
              return { uid, displayName: d.displayName || d.name || d.username || uid, username: d.username || '', profileImg: d.profileImg || '/images/default-avatar.svg' };
            }
            return null;
          })
        );
        setFollowingList(followedUsers.filter(Boolean) as any[]);
      }
    });
    return () => unsubscribe();
  }, [user, isOwnProfile]);

  /* Load isFollowing status for visitors */
  useEffect(() => {
    if (!user || isOwnProfile || !profileData?.uid) return;
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const following: string[] = data.following || [];
        setIsFollowing(following.includes(profileData.uid));
      }
    });
    return () => unsubscribe();
  }, [user, isOwnProfile, profileData?.uid]);

  /* Load today's veil records for this profile (visitor only) */
  useEffect(() => {
    if (!user || !profileData?.uid || isOwnProfile) return;
    const today = new Date().toISOString().split('T')[0];
    const veilRecordId = `${user.uid}_${profileData.uid}_${today}`;
    const veilRecordRef = doc(db, 'veilRecords', veilRecordId);
    const unsubscribe = onSnapshot(veilRecordRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setVeilsGivenToday({ 0: !!d.v0, 1: !!d.v1, 2: !!d.v2, 3: !!d.v3 });
      } else {
        setVeilsGivenToday({});
      }
    });
    return () => unsubscribe();
  }, [user, profileData?.uid, isOwnProfile]);

  /* Check if visiting user is blocked by profile owner (visitor only) */
  useEffect(() => {
    if (isOwnProfile || !profileData?.uid) return;
    const anonId = getAnonId();
    const myId = user?.uid || anonId;
    const profileRef = doc(db, 'users', profileData.uid);
    const unsubscribe = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        const blocked: string[] = snap.data().blockedUsers || [];
        setIsVisitorBlocked(blocked.includes(myId));
      }
    });
    return () => unsubscribe();
  }, [isOwnProfile, profileData?.uid, user?.uid]);

  /* Owner: listen for visitor close signals */
  useEffect(() => {
    if (!isOwnProfile || !profileData?.uid) return;
    const closedRef = collection(db, 'chats', profileData.uid, 'closed');
    const unsubscribe = onSnapshot(closedRef, (snap) => {
      const ids = snap.docs.map(d => d.id);
      setClosedConversations(new Set(ids));
    });
    return () => unsubscribe();
  }, [isOwnProfile, profileData?.uid]);

  /* Load persisted settings (showOnlineList, allowPhotos) for own profile */
  useEffect(() => {
    if (!user || !isOwnProfile) return;
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.showInOnlineList !== undefined) setShowOnlineList(data.showInOnlineList);
        if (data.allowPhotos !== undefined) setAllowPhotos(data.allowPhotos);
      }
    });
    return () => unsubscribe();
  }, [user, isOwnProfile]);

  /* Load blocked users for logged-in profile owner */
  useEffect(() => {
    if (!user || !isOwnProfile) return;
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.blockedUsers) {
          setBlockedSenders(new Set(data.blockedUsers));
        }
      }
    });
    return () => unsubscribe();
  }, [user, isOwnProfile]);

  /* Load profile: fetch from Firestore to ensure latest data, especially for profile picture */
  useEffect(() => {
    async function loadProfile() {
      setProfileLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        
        // Use onSnapshot for real-time updates of profile data (like profileImg)
        const unsubscribe = onSnapshot(q, (snap) => {
          if (!snap.empty) {
            const docData = snap.docs[0].data();
            setProfileData({
              uid: snap.docs[0].id,
              displayName: docData.name || username,
              username: docData.username || username,
              bio: docData.bio || '',
              city: docData.city || '',
              followers: docData.followers || 0,
              profileImg: docData.profileImg || '/images/default-avatar.svg',
              themeColor: docData.themeColor || '#28A0C8',
              veil1: docData.veil1 || 0,
              veil2: docData.veil2 || 0,
              veil3: docData.veil3 || 0,
              veil4: docData.veil4 || 0,
              allowPhotos: docData.allowPhotos !== false,
              privacyShowCount: docData.privacyShowCount !== false,
              totalConversations: docData.totalConversations || 0,
            });
            setProfileNotFound(false);
          } else {
            setProfileNotFound(true);
          }
          setProfileLoading(false);
        }, (error) => {
          setProfileNotFound(true);
          setProfileLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        setProfileNotFound(true);
        setProfileLoading(false);
      }
    }
    loadProfile();
  }, [username]);

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
      const anonId = getAnonId();
      const newMsgs = snapshot.docs
        .map((d) => {
          const data = d.data();
          const ts = data.createdAt?.toDate?.() || new Date();
          return {
            id: d.id,
            sender: data.sender || 'Anoniem',
            senderUid: data.senderUid || null,
            recipientUid: data.recipientUid || null,
            text: data.text || '',
            photoUrl: data.photoUrl || undefined,
            time: `${ts.getHours().toString().padStart(2, '0')}:${ts.getMinutes().toString().padStart(2, '0')}`,
            createdAt: ts,
          } as ChatMsg;
        })
        .filter((msg) => msg.createdAt > sessionStart)
        .filter((msg) => {
          const myId = user?.uid || anonId;
          // Show: my own messages, OR owner's replies specifically addressed to me
          return (
            msg.senderUid === myId ||
            (msg.senderUid === chatId && msg.recipientUid === myId)
          );
        });
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

  /* Profile owner: session-only messages - clear on refresh */
  useEffect(() => {
    if (!isOwnProfile || !profileData?.uid) return;
    
    const chatId = profileData.uid;
    const msgsRef = collection(db, 'chats', chatId, 'messages');
    
    // Clear messages on component mount (page refresh)
    setMessages([]);
    setActiveConversation(null);
    
    const q = query(msgsRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMsgs = snapshot.docs.map((d) => {
        const data = d.data();
        const ts = data.createdAt?.toDate?.() || new Date();
        
        // Use consistent anonymous names from senderUid
        let senderName = data.sender || 'Anoniem';
        if (data.senderUid) {
          if (data.senderUid.startsWith('anon_')) {
            const anonId = data.senderUid.replace('anon_', '');
            senderName = `Anony-${anonId}`;
          } else if (data.senderUid.startsWith('Anony-')) {
            // Already in Anony-xxx format — use directly
            senderName = data.senderUid;
          } else if (!user || data.senderUid !== user.uid) {
            const hash = data.senderUid.substring(0, 8);
            senderName = `Anony-${hash}`;
          }
        }
        
        return {
          id: d.id,
          sender: senderName,
          senderUid: data.senderUid || null,
          recipientUid: data.recipientUid || null,
          text: data.text || '',
          photoUrl: data.photoUrl || undefined,
          time: `${ts.getHours().toString().padStart(2, '0')}:${ts.getMinutes().toString().padStart(2, '0')}`,
          createdAt: ts,
          seen: data.seen || false,
        } as ChatMsg;
      });
      
      // Session-only: messages from this session (after page load)
      // Include both incoming messages AND the owner's own replies
      // Exclude blocked senders
      const sessionMsgs = allMsgs.filter(msg => {
        if (msg.createdAt.getTime() <= sessionStartTime.current) return false;
        if (msg.senderUid && msg.senderUid !== user?.uid && blockedSenders.has(msg.senderUid)) return false;
        return true;
      });
      
      // Update user activity tracking
      const newActivityMap = new Map<string, number>();
      sessionMsgs.forEach(msg => {
        if (msg.senderUid && msg.senderUid !== user?.uid) {
          newActivityMap.set(msg.senderUid, msg.createdAt.getTime());
        }
      });
      setUserLastActivity(newActivityMap);
      
      // Check for users who left (inactive for 5+ minutes)
      const INACTIVE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
      const currentTime = Date.now();
      
      const leftUsers = [...newActivityMap.entries()] 
        .filter(([_, lastActivity]) => currentTime - lastActivity > INACTIVE_THRESHOLD)
        .map(([uid, _]) => uid);
      
      // Add "left conversation" messages
      const leftMsgs = leftUsers.map(sender => {
        const senderMsgs = allMsgs.filter(m => m.senderUid === sender);
        const senderName = senderMsgs[0]?.sender || 'Anoniem';
        const isAnonymous = senderName.startsWith('Anony-');
        const leftText = `${senderName} heeft de chat verlaten`;
        
        return {
          id: `left-${sender}`,
          sender: '',
          senderUid: sender,
          text: leftText,
          time: '',
          createdAt: new Date(),
        } as ChatMsg;
      });
      
      // Combine regular messages with left messages
      const finalMsgs = [...sessionMsgs, ...leftMsgs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      
      setMessages(finalMsgs);
      
      // Auto-select first conversation ONLY if there are current session messages
      if (!activeConversation && sessionMsgs.length > 0) {
        const uniqueSenders = [...new Set(sessionMsgs
          .filter(m => m.senderUid !== user?.uid)
          .map(m => m.senderUid)
          .filter(Boolean)
        )];
        if (uniqueSenders.length > 0) {
          setActiveConversation(uniqueSenders[0]);
        }
      }
    });
    return () => unsubscribe();
  }, [isOwnProfile, profileData?.uid, user?.uid]);

  /* Clear everything on page refresh - fresh start */
  useEffect(() => {
    setMessages([]);
    setActiveConversation(null);
    // Don't clear profile data - it should persist
  }, []);

  /* Tab notification + sound on new message (owner only) */
  useEffect(() => {
    if (!isOwnProfile) return;
    const incomingCount = messages.filter(m => m.senderUid !== user?.uid && !m.text.includes('heeft de chat verlaten')).length;
    if (incomingCount > prevMsgCountRef.current) {
      document.title = 'Nieuw bericht! | Veilo';
      if (soundOn) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.4);
        } catch { /* audio not supported */ }
      }
    }
    prevMsgCountRef.current = incomingCount;
  }, [messages, isOwnProfile, soundOn]);

  /* Restore tab title when user focuses the tab */
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) document.title = 'Veilo';
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  /* Send message to Firestore */
  async function sendMessage() {
    if (!message.trim() || !profileData?.uid) return;

    if (isOwnProfile) {
      const senderName = myProfile?.username || 'Eigenaar';
      try {
        await addDoc(collection(db, 'chats', profileData.uid, 'messages'), {
          sender: senderName,
          senderUid: user?.uid,
          recipientUid: activeConversation,
          text: message,
          createdAt: serverTimestamp(),
        });
        setMessage('');
      } catch { /* silently fail */ }
      return;
    }

    // Block check
    if (isVisitorBlocked) { showToastMsg('Je bent geblokkeerd en kunt geen berichten sturen.'); return; }
    if (visitorChatClosed) { showToastMsg('Chat is gesloten.'); return; }

    // Track when visitor first sends a message (for 3-min veil timer)
    if (!chatStartTime.current) chatStartTime.current = Date.now();

    const anonId = getAnonId();
    const senderName = user && revealIdentity ? myProfile?.name || username : anonId;
    try {
      await addDoc(collection(db, 'chats', profileData.uid, 'messages'), {
        sender: senderName,
        senderUid: user?.uid || anonId,
        text: message,
        createdAt: serverTimestamp(),
      });
      setMessage('');
    } catch { /* silently fail */ }
  }

  /* Visitor closes the chat */
  async function handleVisitorCloseChat() {
    if (!profileData?.uid) return;
    const anonId = getAnonId();
    const myId = user?.uid || anonId;
    try {
      await setDoc(doc(db, 'chats', profileData.uid, 'closed', myId), {
        closedAt: serverTimestamp(),
      });
    } catch { /* silently fail */ }
    setVisitorChatClosed(true);
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
      try { await updateDoc(doc(db, 'users', profileData.uid), { totalConversations: increment(1) }); } catch { /* silently fail */ }
      const anonName = senderUid === user?.uid ? (revealIdentity ? myProfile?.name || username : generateAnonName()) : senderName;
      const convDoc = await addDoc(convRef, {
        anonName,
        anonId,
        blocked: false,
        typing: false,
        ownerTyping: false,
        createdAt: serverTimestamp(),
      });
      
      // Copy recent messages from the visitor chat to this conversation
      const msgsRef = collection(db, 'chats', profileData.uid, 'messages');
      const msgsQuery = query(msgsRef, where('senderUid', '==', senderUid), orderBy('createdAt', 'desc'), limit(10));
      const msgsSnap = await getDocs(msgsQuery);
      
      for (const msgDoc of msgsSnap.docs) {
        const msgData = msgDoc.data();
        await addDoc(collection(db, 'users', profileData.uid, 'conversations', convDoc.id, 'messages'), {
          sender: msgData.sender,
          senderUid: msgData.senderUid,
          text: msgData.text,
          createdAt: msgData.createdAt,
        });
      }
      
      return convDoc.id;
    }
    return snap.docs[0].id;
  }

  /* Give a veil to this profile */
  async function giveVeil(idx: number) {
    if (!user) { showToastMsg('Je moet ingelogd zijn om een Veil te geven.'); return; }
    if (isOwnProfile) { showToastMsg('Je kunt jezelf geen Veil geven.'); return; }
    if (!profileData?.uid) return;

    if (!chatStartTime.current || Date.now() - chatStartTime.current < 3 * 60 * 1000) {
      const remaining = chatStartTime.current
        ? Math.ceil((3 * 60 * 1000 - (Date.now() - chatStartTime.current)) / 1000)
        : 180;
      showToastMsg(`Chat nog ${remaining}s voor je een Veil kunt geven.`);
      return;
    }

    if (veilsGivenToday[idx]) { showToastMsg('Je hebt dit Veil vandaag al gegeven.'); return; }

    const today = new Date().toISOString().split('T')[0];
    const veilRecordId = `${user.uid}_${profileData.uid}_${today}`;
    const veilRecordRef = doc(db, 'veilRecords', veilRecordId);
    const field = `veil${idx + 1}`;
    try {
      const profileRef = doc(db, 'users', profileData.uid);
      const profileSnap = await getDoc(profileRef);
      const currentData = profileSnap.data() || {};
      const tv = currentData.todayVeils || {};
      const newDailyCount = tv.date === today ? (tv.count || 0) + 1 : 1;

      await updateDoc(profileRef, {
        [field]: increment(1),
        'todayVeils.date': today,
        'todayVeils.count': newDailyCount,
      });
      await setDoc(veilRecordRef, { [`v${idx}`]: true, updatedAt: serverTimestamp() }, { merge: true });

      setProfileData(prev => prev ? { ...prev, [field]: (prev[field as keyof ProfileData] as number) + 1 } : prev);
      showToastMsg('Veil gegeven! 🎉');
    } catch (error) {
      console.error('Error giving veil:', error);
    }
  }

  function closeConversation(senderUid: string) {
    // Remove conversation from active state
    if (activeConversation === senderUid) {
      const remainingSenders = [...new Set(messages.map(m => m.senderUid).filter(Boolean) as string[])].filter(s => s !== senderUid && !blockedSenders.has(s));
      setActiveConversation(remainingSenders.length > 0 ? remainingSenders[0] : null);
    }
    // Remove messages from this sender
    setMessages(prev => prev.filter(m => m.senderUid !== senderUid));
  }

  function showBlockConfirmation(senderUid: string) {
    setShowBlockConfirm(senderUid);
  }

  function confirmBlock(senderUid: string) {
    if (!user) {
      // For anonymous users, just keep it local
      setBlockedSenders(prev => new Set(prev).add(senderUid));
    } else {
      // For registered users, save to Firestore
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, {
        blockedUsers: arrayUnion(senderUid)
      }).catch(err => console.error('Error blocking user:', err));
    }

    if (activeConversation === senderUid) {
      const remainingSenders = [...new Set(messages.map(m => m.senderUid).filter(Boolean) as string[])].filter(s => s !== senderUid && !blockedSenders.has(s));
      setActiveConversation(remainingSenders.length > 0 ? remainingSenders[0] : null);
    }
    setMessages(prev => prev.filter(m => m.senderUid !== senderUid));
    setShowBlockConfirm(null);
  }

  function cancelBlock() {
    setShowBlockConfirm(null);
  }

  async function handleProfilePicChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file && isOwnProfile && profileData?.uid) {
      try {
        // Create preview URL for immediate display
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setSelectedProfilePic(result);
        };
        reader.readAsDataURL(file);

        // Upload to Firebase Storage
        const storagePath = `profile-pictures/${profileData.uid}_${Date.now()}`;
        const storageReference = storageRef(storage, storagePath);
        
        await uploadBytes(storageReference, file);
        const downloadURL = await getDownloadURL(storageReference);
        
        if (user) {
          try {
            await updateDoc(doc(db, 'users', user.uid), {
              profileImg: downloadURL,
              updatedAt: serverTimestamp()
            });
          } catch {
            await setDoc(doc(db, 'users', user.uid), {
              profileImg: downloadURL,
              updatedAt: serverTimestamp()
            }, { merge: true });
          }
        }

        // Update local state for immediate feedback
        setProfileData(prev => prev ? { ...prev, profileImg: downloadURL } : prev);
        
        // Clear local preview after successful upload
        setSelectedProfilePic(null);
      } catch (error) {
        console.error('Error in handleProfilePicChange:', error);
      }
    }
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    setContactError('');
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      setContactError('Alle velden zijn verplicht.');
      return;
    }
    try {
      await addDoc(collection(db, 'contacts'), {
        name: contactName,
        username: contactUsername || '',
        email: contactEmail,
        message: contactMessage,
        createdAt: serverTimestamp()
      });
      setContactSent(true);
    } catch (err) {
      setContactError('Er is een fout opgetreden. Probeer het opnieuw.');
    }
  }

  async function handleSettingsUpdate() {
    if (!user) return;
    try {
      // Immediate local update to avoid delay
      setProfileData(prev => prev ? { 
        ...prev, 
        displayName: settingsName,
        bio: settingsBio,
        city: settingsCity 
      } : prev);

      await updateDoc(doc(db, 'users', user.uid), {
        displayName: settingsName, // Use displayName to match what other users see
        name: settingsName, // Keep name for backward compatibility if needed
        email: settingsEmail,
        bio: settingsBio,
        city: settingsCity,
        offlineMessage: settingsOffline,
        updatedAt: serverTimestamp()
      });
      setSettingsUpdated(true);
      // Auto-hide after 3 seconds
      setTimeout(() => setSettingsUpdated(false), 3000);
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  }

  async function handleDesignUpdate() {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        themeColor: settingsColor,
        updatedAt: serverTimestamp()
      });
      setSettingsUpdated(true);
      setTimeout(() => setSettingsUpdated(false), 3000);
    } catch (error) {
      console.error('Error updating design settings:', error);
    }
  }

  async function handlePrivacyUpdate() {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        privacyShowCount,
        privacyShowPopular,
        updatedAt: serverTimestamp()
      });
      setSettingsUpdated(true);
      setTimeout(() => setSettingsUpdated(false), 3000);
    } catch (error) {
      console.error('Error updating privacy settings:', error);
    }
  }

  async function handleClearBlocks() {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        blockedUsers: []
      });
      setBlockedSenders(new Set());
      showToastMsg('Alle blokkades zijn verwijderd.');
    } catch (error) {
      console.error('Error clearing blocks:', error);
    }
  }

  async function handlePasswordReset() {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setSettingsUpdated(true);
      setTimeout(() => setSettingsUpdated(false), 3000);
    } catch (error) {
      console.error('Error sending password reset:', error);
    }
  }

  function showToastMsg(msg: string) {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }

  async function handleFollow() {
    if (!user || !profileData?.uid || isOwnProfile) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const profileRef = doc(db, 'users', profileData.uid);
      if (isFollowing) {
        await updateDoc(userRef, { following: arrayRemove(profileData.uid) });
        await updateDoc(profileRef, { followers: increment(-1) });
        setIsFollowing(false);
      } else {
        await updateDoc(userRef, { following: arrayUnion(profileData.uid) });
        await updateDoc(profileRef, { followers: increment(1) });
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  }

  async function handlePhotoSend(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !profileData?.uid) return;
    if (!isOwnProfile && profileData.allowPhotos === false) {
      setShowPhotoAlert(true);
      if (photoInputRef.current) photoInputRef.current.value = '';
      return;
    }
    if (!isOwnProfile && !chatStartTime.current) {
      setShowPhotoAlert(true);
      if (photoInputRef.current) photoInputRef.current.value = '';
      return;
    }
    if (!isOwnProfile && isVisitorBlocked) {
      showToastMsg('Je bent geblokkeerd en kunt geen foto\'s sturen.');
      if (photoInputRef.current) photoInputRef.current.value = '';
      return;
    }
    try {
      const storagePath = `chat-photos/${profileData.uid}_${Date.now()}`;
      const storageReference = storageRef(storage, storagePath);
      await uploadBytes(storageReference, file);
      const downloadURL = await getDownloadURL(storageReference);
      const anonId = getAnonId();
      if (!isOwnProfile && !chatStartTime.current) chatStartTime.current = Date.now();
      const senderName = isOwnProfile
        ? (myProfile?.username || 'Eigenaar')
        : (user && revealIdentity ? (myProfile?.name || username) : anonId);
      await addDoc(collection(db, 'chats', profileData.uid, 'messages'), {
        sender: senderName,
        senderUid: isOwnProfile ? user?.uid : (user?.uid || anonId),
        recipientUid: isOwnProfile ? activeConversation : undefined,
        text: '[Foto]',
        photoUrl: downloadURL,
        createdAt: serverTimestamp(),
      });
      if (photoInputRef.current) photoInputRef.current.value = '';
    } catch (error) {
      console.error('Error sending photo:', error);
    }
  }

  async function handleFreezeAccount() {
    if (!user || !window.confirm('Weet je zeker dat je je account wilt bevriezen? Je wordt uitgelogd en je profiel is niet meer zichtbaar.')) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        status: 'frozen',
        updatedAt: serverTimestamp()
      });
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Error freezing account:', error);
    }
  }

  function triggerProfilePicChange() {
    fileInputRef.current?.click();
  }

  async function handleRefresh() {
    try {
      const usersRef = collection(db, 'users');
      const snap = await getDocs(usersRef);
      const usersData = snap.docs.map(doc => ({
        uid: doc.id,
        ...(doc.data() as any)
      }));
      setAllUsers(usersData);

      const now = Date.now();
      const online = usersData
        .filter(u => u.lastSeen && (now - u.lastSeen.toMillis()) < 300000)
        .sort((a, b) => {
          if (a.isPromoted && !b.isPromoted) return -1;
          if (!a.isPromoted && b.isPromoted) return 1;
          return b.lastSeen.toMillis() - a.lastSeen.toMillis();
        })
        .map(u => ({
          username: u.username || '',
          img: u.profileImg || '/images/default-avatar.svg',
          alt: u.displayName || u.username || '',
          displayName: u.displayName || u.username || '',
          bio: u.bio || '',
          city: u.city || ''
        }));
      setOnlineUsers(online);
      
      if (searchCity.trim()) {
        const query = searchCity.toLowerCase();
        const filtered = usersData.filter(u => 
          (u.displayName || '').toLowerCase().includes(query) ||
          (u.bio || '').toLowerCase().includes(query) ||
          (u.city || '').toLowerCase().includes(query)
        ).map(u => ({
          username: u.username || '',
          img: u.profileImg || '/images/default-avatar.svg',
          alt: u.displayName || u.username || '',
          displayName: u.displayName || u.username || '',
          bio: u.bio || '',
          city: u.city || ''
        }));
        setFilteredOnlineUsers(filtered);
        setFilterActive(true);
      } else {
        setFilteredOnlineUsers(online);
        setFilterActive(false);
      }
    } catch (err) {
      console.error('Error refreshing online list:', err);
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
  const city = (profileData as any)?.city || '';

  const veils = [
    profileData?.veil1 || 0,
    profileData?.veil2 || 0,
    profileData?.veil3 || 0,
    profileData?.veil4 || 0,
  ];

  /* Online list items */
  const onlineListItems = filteredOnlineUsers.map((u, i) => (
    <li key={u.username || i} className="online-item">
      <Link href={`/${u.username}`}>
        <img src={u.img} alt={u.alt} />
      </Link>
      <div className="online-tooltip">
        <strong>{u.displayName || u.username}</strong>
        {u.bio && <p>{u.bio}</p>}
        {u.city && <p style={{ color: '#aaa', fontSize: 11 }}>{u.city}</p>}
      </div>
    </li>
  ));

  return (
    <div className="profile-body">
      {/* Settings Success Notification (Scrolling Down) */}
      <div className={`settings-success-scroll ${settingsUpdated ? 'visible' : ''}`}>
        Instellingen zijn succesvol bijgewerkt.
      </div>

      {/* Toast Notification */}
      <div className={`settings-success-scroll ${showToast ? 'visible' : ''}`}>
        {toastMessage}
      </div>

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
                          <input type="checkbox" checked={showOnlineList} onChange={async (e) => { const val = e.target.checked; setShowOnlineList(val); if (user) await updateDoc(doc(db, 'users', user.uid), { showInOnlineList: val }); }} />
                          <span className="toggle-slider"></span>
                          <span className="toggle-label">{showOnlineList ? 'Aan' : 'Uit'}</span>
                        </label>
                      </div>
                      <div className="nav-hint-item">
                        <span>{"Foto's mogen naar mij worden gestuurd"}</span>
                        <label className="toggle-switch">
                          <input type="checkbox" checked={allowPhotos} onChange={async (e) => { const val = e.target.checked; setAllowPhotos(val); if (user) await updateDoc(doc(db, 'users', user.uid), { allowPhotos: val }); }} />
                          <span className="toggle-slider"></span>
                          <span className="toggle-label">{allowPhotos ? 'Aan' : 'Uit'}</span>
                        </label>
                      </div>
                    </div>
                  </li>
                )}
                <li>
                  <a onClick={logout} className="nav-btn nav-logout" style={{ cursor: 'pointer' }}>
                    <img src="/images/icon-logout.svg" alt="" />
                    Uitloggen
                  </a>
                </li>
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
                  <a className="nav-btn nav-groups" onClick={() => showToastMsg('Groepen zijn binnenkort beschikbaar.')} style={{ cursor: 'pointer' }}>
                    <img src="/images/icon-groups.svg" alt="" />
                    Groepen
                  </a>
                </li>
              </>
            )}
            <li>
              <a className="nav-btn nav-sound" onClick={() => setSoundOn(!soundOn)} style={{ cursor: 'pointer' }} title={soundOn ? 'Geluid uit' : 'Geluid aan'}>
                <img src={soundOn ? '/images/icon-sound.svg' : '/images/icon-sound-muted.svg'} alt="" />
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
                {popularUsers.length === 0 ? (
                  <div className="modal-popular-empty">
                    <img src="/images/default-avatar.svg" alt="" />
                    <p>Nog geen gebruikers in de top lijst.</p>
                  </div>
                ) : (
                  <ul>
                    {popularUsers.map((u, i) => (
                      <li key={u.uid} className="modal-popular-item">
                        <span className="modal-popular-rank">{i + 1}</span>
                        <Link href={`/${u.username}`} onClick={() => setShowPopular(false)}>
                          <img src={u.profileImg || '/images/default-avatar.svg'} alt="" />
                          <div>
                            <strong>{u.displayName || u.name || u.username}</strong>
                            <span>{u.totalVeils} Veils</span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="modal-popular-cta">
                <a href={`/${username}`} onClick={() => setShowPopular(false)}>PRAAT MET MEER MENSEN</a>
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
                <a onClick={() => setSelectedConversations(new Set(conversations.map(c => c.id)))} style={{ cursor: 'pointer' }}>Alles selecteren</a>
                <a onClick={async () => {
                  if (selectedConversations.size === 0 || !profileData?.uid) return;
                  for (const convId of selectedConversations) {
                    await deleteDoc(doc(db, 'users', profileData.uid, 'conversations', convId));
                  }
                  setSelectedConversations(new Set());
                }} style={{ cursor: 'pointer' }}>Selectie verwijderen</a>
              </div>
              <a className="modal-close" onClick={() => setShowMessages(false)}>✕</a>
            </div>
            <div className="modal-messages-body">
              {conversations.length === 0 ? (
                <div className="modal-messages-empty">
                  Geen berichten.
                </div>
              ) : (
                <ul>
                  {conversations.map(conv => (
                    <li
                      key={conv.id}
                      className={`modal-messages-item${selectedConversations.has(conv.id) ? ' selected' : ''}`}
                      onClick={() => setSelectedConversations(prev => {
                        const next = new Set(prev);
                        if (next.has(conv.id)) next.delete(conv.id); else next.add(conv.id);
                        return next;
                      })}
                    >
                      <img src="/images/default-avatar.svg" alt="" />
                      <div>
                        <strong>{conv.anonName || 'Anoniem'}</strong>
                      </div>
                      {selectedConversations.has(conv.id) && <span className="modal-messages-check">✔</span>}
                    </li>
                  ))}
                </ul>
              )}
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
            {settingsUpdated && (
              <div className="settings-success-inner">
                Instellingen zijn succesvol bijgewerkt.
              </div>
            )}
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
                      <a className="settings-freeze" onClick={handleFreezeAccount}>Account bevriezen</a>
                    </div>
                  </div>
                  <div className="settings-row">
                    <label></label>
                    <div className="settings-field">
                      <button className="settings-btn" onClick={handleSettingsUpdate}>Bijwerken</button>
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
                      <button className="settings-btn" onClick={triggerProfilePicChange}>Bladeren</button>
                    </div>
                    <span>Maximale bestandsgrootte: 2MB</span>
                  </div>
                  <div className="settings-design-col">
                    <h3>Thema kleur wijzigen</h3>
                    <div className="settings-design-box" style={{ padding: '15px' }}>
                      <input 
                        type="color" 
                        value={settingsColor} 
                        onChange={(e) => setSettingsColor(e.target.value)} 
                        style={{ width: '100%', height: '40px', cursor: 'pointer' }}
                      />
                    </div>
                    <span>Kies een kleur voor je profiel accenten.</span>
                    <button className="settings-btn" style={{ marginTop: 15 }} onClick={handleDesignUpdate}>Kleur opslaan</button>
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
                  <a 
                    className="settings-remove-link" 
                    style={{ display: 'block', marginTop: 15, cursor: 'pointer' }}
                    onClick={handleClearBlocks}
                  >
                    Verwijder alle blokkades die je tot nu toe hebt gemaakt.
                  </a>
                  <button className="settings-btn" style={{ marginTop: 15 }} onClick={handlePrivacyUpdate}>Wijzigingen opslaan</button>
                </div>
              )}
              {settingsTab === 'password' && (
                <div className="settings-form">
                  <h3>Wachtwoord wijzigen</h3>
                  <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>
                    Voor je veiligheid raden we aan om je wachtwoord regelmatig te wijzigen. Klik op de knop hieronder om een herstel-e-mail te ontvangen.
                  </p>
                  <div className="settings-row">
                    <label></label>
                    <div className="settings-field">
                      <button className="settings-btn" onClick={handlePasswordReset}>Wachtwoord herstellen via e-mail</button>
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
              {followingList.length === 0 ? (
                <div className="modal-following-empty">Je volgt nog niemand.</div>
              ) : (
                <ul>
                  {followingList.map((u: any) => (
                    <li key={u.uid} className="modal-following-item">
                      <Link href={`/${u.username}`} onClick={() => setShowFollowing(false)}>
                        <img src={u.profileImg || '/images/default-avatar.svg'} alt="" />
                        <strong>{u.displayName || u.username}</strong>
                      </Link>
                      <a className="modal-following-unfollow" onClick={async () => {
                        if (!user) return;
                        await updateDoc(doc(db, 'users', user.uid), { following: arrayRemove(u.uid) });
                        await updateDoc(doc(db, 'users', u.uid), { followers: increment(-1) });
                      }} style={{ cursor: 'pointer' }}>Ontvolgen</a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="prof-container prof-top">
        {/* ═══════ ABOUT BOX ═══════ */}
        <div className="about_box">
          <h2>
            {displayName}
            {profileData?.privacyShowCount && (profileData?.totalConversations || 0) >= 0 && (
              <span className="conv-count-label">
                {isOwnProfile
                  ? ` (Je hebt tot nu toe met ${profileData.totalConversations || 0} mensen gesproken)`
                  : ` (Heeft tot nu toe met ${profileData.totalConversations || 0} mensen gesproken)`}
              </span>
            )}
          </h2>
          <span></span>
          {(bio || city) && <p>{bio}{bio && city ? ' - ' : ''}{city}</p>}
        </div>

        {/* ═══════ LEFT SIDEBAR ═══════ */}
        <div className="prof-left">
          <div 
            className="profile_img"
            onMouseEnter={() => isOwnProfile && setShowProfilePicChange(true)}
            onMouseLeave={() => setShowProfilePicChange(false)}
            onClick={isOwnProfile ? triggerProfilePicChange : undefined}
            style={{ cursor: isOwnProfile ? 'pointer' : 'default' }}
          >
            <img
              key={selectedProfilePic || profileImg}
              src={selectedProfilePic || profileImg}
              alt={`${displayName} profielfoto`}
            />
            {isOwnProfile && showProfilePicChange && (
              <div className="profile_pic_change_overlay">
                <div className="profile_pic_change_file">
                  <svg 
                     viewBox="0 0 24 24" 
                     fill="none" 
                     stroke="currentColor" 
                     strokeWidth="2" 
                     strokeLinecap="round" 
                     strokeLinejoin="round" 
                     className="profile_pic_change_camera_svg"
                   >
                     <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                     <circle cx="12" cy="13" r="4"></circle>
                   </svg>
                   <span>Foto wijzigen</span>
                </div>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleProfilePicChange}
            style={{ display: 'none' }}
          />
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSend}
            style={{ display: 'none' }}
          />
          <div className="left_follow_box">
            <div>
              <h4>Volgers</h4>
              <h5>{followers}</h5>
            </div>
            {!isOwnProfile && user && profileData && (
              <button onClick={handleFollow} className={`follow-btn${isFollowing ? ' following' : ''}`}>
                {isFollowing ? 'Ontvolgen' : 'Volgen'}
              </button>
            )}
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
          {/* Profile Owner: Tabbed chat interface */}
          {isOwnProfile ? (
            <div className="chat_box">
              {/* Conversation tabs - ONLY show users with current session messages */}
              {(() => {
                // Only get senders who have sent messages in CURRENT SESSION
                const uniqueSenders = [...new Set(messages
                  .filter(m => m.senderUid !== user?.uid && !m.text.includes('left the conversation'))
                  .map(m => m.senderUid)
                  .filter(Boolean) as string[]
                )];
                const availableSenders = uniqueSenders.filter(s => !blockedSenders.has(s));
                return availableSenders.length > 0 && (
                  <div className="chat-tabs">
                    {availableSenders.map(senderUid => {
                      const senderMsgs = messages.filter(m => m.senderUid === senderUid);
                      const senderName = senderMsgs[0]?.sender || 'Anoniem';
                      return (
                        <div key={senderUid} className="chat-tab-wrapper">
                          <a
                            className={activeConversation === senderUid ? 'active' : ''}
                            onClick={() => setActiveConversation(senderUid)}
                          >
                            {senderName}
                          </a>
                          <a className="chat-tab-close" onClick={() => closeConversation(senderUid)}>✕</a>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              
              {/* Block link above input */}
              {activeConversation && (
                <a className="chat-block-above" onClick={() => showBlockConfirmation(activeConversation)}>
                  Blokkeer deze anonieme
                </a>
              )}

              {/* Input box */}
              <div className="input_box">
                <input
                  type="text"
                  placeholder={activeConversation && closedConversations.has(activeConversation) ? 'Gesprek gesloten' : 'Je bericht'}
                  disabled={!activeConversation || closedConversations.has(activeConversation)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && activeConversation && !closedConversations.has(activeConversation)) {
                      const input = e.target as HTMLInputElement;
                      if (input.value.trim()) {
                        addDoc(collection(db, 'chats', profileData!.uid, 'messages'), {
                          sender: myProfile?.username || 'Eigenaar',
                          senderUid: user?.uid,
                          recipientUid: activeConversation,
                          text: input.value,
                          createdAt: serverTimestamp(),
                        });
                        input.value = '';
                      }
                    }
                  }}
                />
                <a className="input-camera" style={{ cursor: 'pointer' }} onClick={() => photoInputRef.current?.click()}>
                  <img src="/images/icon-camera.svg" alt="Foto" />
                </a>
              </div>

              <div className="boxed_chat_top">
                <div className="writing"></div>
                <div className="looked"></div>
              </div>

              {/* Messages for active conversation */}
              <div className="message_box">
                {activeConversation && (
                  (() => {
                    // Show: 1) Messages FROM the anonymous user, 2) Messages TO the anonymous user (owner's replies)
                    const activeMsgs = [...messages.filter(m => 
                      m.senderUid === activeConversation || 
                      m.recipientUid === activeConversation
                    )].reverse();
                    return activeMsgs.length === 0 ? (
                      <div className="empty-chat">
                        <p style={{ color: '#999', textAlign: 'center', marginTop: 60 }}>
                          Geen berichten in dit gesprek
                        </p>
                      </div>
                    ) : (
                      <>
                        {activeMsgs.map((msg) => (
                          <div key={msg.id} className={msg.text.includes('heeft de chat verlaten') ? 'chat-msg user-left' : 'chat-msg'}>
                            {msg.text.includes('heeft de chat verlaten') ? (
                              <span>{msg.text}</span>
                            ) : (
                              <>
                                <strong style={{ color: msg.senderUid === user?.uid ? '#28A0C8' : '#333' }}>{msg.sender}</strong>:{' '}
                                {msg.photoUrl ? (
                                  <img src={msg.photoUrl} alt="foto" style={{ maxWidth: 200, display: 'block', marginTop: 4, borderRadius: 3 }} />
                                ) : msg.text}
                                <span className="msg-time">{msg.time}</span>
                                {msg.seen && <span className="msg-seen">gezien</span>}
                              </>
                            )}
                          </div>
                        ))}
                      </>
                    );
                  })()
                )}
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
                  <a className="share-google" href={`https://api.whatsapp.com/send?text=${typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : ''}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" style={{ display:'inline-flex', alignItems:'center', justifyContent:'center' }}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>
                </div>
              </div>
            </div>
          ) : (
            /* Visitor: Single chat box */
            <div className="chat_box">
              {/* Input box */}
              <div className="input_box">
                <input
                  type="text"
                  placeholder={visitorChatClosed || isVisitorBlocked ? 'Chat is gesloten' : 'Je bericht'}
                  disabled={visitorChatClosed || isVisitorBlocked}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      sendMessage();
                      e.preventDefault();
                    }
                  }}
                />
                {!visitorChatClosed && !isVisitorBlocked && (
                  profileData?.allowPhotos === false ? (
                    <span className="camera-disabled" title={`${displayName} wil geen foto's ontvangen.`}>
                      <img src="/images/icon-camera.svg" alt="Foto" style={{ opacity: 0.35, cursor: 'not-allowed' }} />
                    </span>
                  ) : (
                    <a className="input-camera" style={{ cursor: 'pointer' }} onClick={() => photoInputRef.current?.click()}>
                      <img src="/images/icon-camera.svg" alt="Foto" />
                    </a>
                  )
                )}
                {user && !isOwnProfile && !visitorChatClosed && (
                  <a className="input-eye" onClick={() => setRevealIdentity(!revealIdentity)} style={{ cursor: 'pointer' }} title={revealIdentity ? "Verberg identiteit" : "Toon identiteit"}>
                    <img src="/images/icon-eye.svg" alt="Identiteit" />
                  </a>
                )}
                {!visitorChatClosed && (
                  <a style={{ cursor: 'pointer', marginLeft: 6, color: '#999', fontSize: 16, lineHeight: '34px' }} onClick={handleVisitorCloseChat} title="Sluit chat">✕</a>
                )}
              </div>

              <div className="boxed_chat_top">
                <div className="writing"></div>
                <div className="looked"></div>
              </div>

              {/* Messages */}
              <div className="message_box">
                {[...messages].reverse().map((msg) => (
                  <div key={msg.id} className="chat-msg">
                    <strong style={{ color: msg.senderUid === profileData?.uid ? '#28A0C8' : '#333' }}>{msg.sender}</strong>:{' '}
                    {msg.photoUrl ? (
                      <img src={msg.photoUrl} alt="foto" style={{ maxWidth: 200, display: 'block', marginTop: 4, borderRadius: 3 }} />
                    ) : msg.text}
                    <span>{msg.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════ PROMOTE BAR (owner only) ═══════ */}
          {isOwnProfile && (
            <div className="promote-bar">
              <span>TOON JE PROFIEL BOVENAAN DE ONLINE LIJST</span>
              <a
                className="promote-btn"
                onClick={() => showToastMsg('Dienst binnenkort beschikbaar.')}
                style={{ cursor: 'pointer' }}
              >
                ✔ NU ACTIVEREN
              </a>
            </div>
          )}

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
                {onlineListItems}
              </ul>
            </div>
          </div>

          {/* ═══════ FOOTER ═══════ */}
          <div className="prof-footer">
            <span>Veilo © 2026</span>
            <ul>
              <li><a style={{ cursor: 'pointer' }} onClick={() => setShowContact(true)}>Help</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      {showContact && (
        <div className="modal-overlay" onClick={() => { setShowContact(false); setContactSent(false); setContactError(''); setContactName(''); setContactUsername(''); setContactEmail(''); setContactMessage(''); }}>
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
                {contactError && <p style={{ color: '#D35757', fontSize: 12, marginBottom: 8 }}>{contactError}</p>}
                <button
                  className="modal-submit"
                  onClick={(e) => handleContactSubmit(e as any)}
                >
                  Verstuur
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo Alert Modal (uyari.png) */}
      {showPhotoAlert && (
        <div className="block-confirm-overlay" onClick={() => setShowPhotoAlert(false)}>
          <div className="block-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="block-confirm-header">
              <span className="block-confirm-site">veilo.nl</span>
            </div>
            <div className="block-confirm-content">
              <p>Je kunt nu geen foto sturen.</p>
              <div className="block-confirm-buttons">
                <button className="block-confirm-yes" onClick={() => setShowPhotoAlert(false)}>Oké</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Block Confirmation Dialog */}
      {showBlockConfirm && (
        <div className="block-confirm-overlay" onClick={cancelBlock}>
          <div className="block-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="block-confirm-header">
              <span className="block-confirm-site">veilo.nl</span>
            </div>
            <div className="block-confirm-content">
              <p>Als je deze anonieme blokkeert, kan hij je niet meer schrijven. Weet je het zeker?</p>
              <div className="block-confirm-buttons">
                <button className="block-confirm-no" onClick={cancelBlock}>Annuleer</button>
                <button className="block-confirm-yes" onClick={() => confirmBlock(showBlockConfirm)}>Oké</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
