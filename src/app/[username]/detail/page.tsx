'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import './detail.css';

interface ProfileDetail {
  displayName: string;
  username: string;
  bio: string;
  city: string;
  profileImg: string;
}

const REPORT_REASONS = ['Seksuele inhoud', 'Nep account', 'Spam berichten'];

export default function DetailPage() {
  const params = useParams();
  const username = params.username as string;

  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [showReportReasons, setShowReportReasons] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  useEffect(() => {
    if (!username) return;
    const q = query(collection(db, 'users'), where('username', '==', username));
    getDocs(q).then((snap) => {
      if (!snap.empty) {
        const d = snap.docs[0].data();
        setProfile({
          displayName: d.name || username,
          username: d.username || username,
          bio: d.bio || '',
          city: d.city || '',
          profileImg: d.profileImg || '/images/default-avatar.svg',
        });
      }
    });
  }, [username]);

  if (!profile) return <div className="detail-loading">Laden...</div>;

  return (
    <div className="detail-body">
      <div className="detail-logo">
        <Link href="/"><span className="detail-logo-text">veilo</span></Link>
      </div>

      <div className="detail-content">
        <div className="detail-left">
          <img
            className="detail-avatar"
            src={profile.profileImg}
            alt={profile.displayName}
            onClick={() => window.open(profile.profileImg, '_blank')}
            style={{ cursor: 'pointer' }}
          />
          {!showReportReasons && !reportDone && (
            <a className="detail-report-link" style={{ cursor: 'pointer' }} onClick={() => setShowReportReasons(true)}>
              Deze gebruiker rapporteren
            </a>
          )}
          {showReportReasons && !reportDone && (
            <div className="detail-report-reasons">
              <p className="detail-report-title">Reden voor melding</p>
              {REPORT_REASONS.map((r) => (
                <a key={r} className="detail-report-reason" style={{ cursor: 'pointer' }} onClick={() => setReportDone(true)}>{r}</a>
              ))}
            </div>
          )}
        </div>

        <div className="detail-right">
          <div className="detail-name-row">
            <h2 className="detail-name">{profile.displayName}</h2>
            {profile.city && <span className="detail-city">Woonplaats: {profile.city}</span>}
          </div>
          {profile.bio && <p className="detail-bio">{profile.bio}</p>}
        </div>
      </div>

      {reportDone && (
        <div className="detail-report-overlay">
          <div className="detail-report-dialog">
            <div className="detail-report-dialog-header">
              <span>&#127760;</span> veilo.nl
            </div>
            <p>Profiel gemeld.</p>
            <button onClick={() => { setReportDone(false); setShowReportReasons(false); }}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
