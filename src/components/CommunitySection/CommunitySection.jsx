import { useState } from 'react';
import { subscribeCommunity } from '../../api';
import styles from './CommunitySection.module.css';

const COMMUNITY_IMAGE = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

export default function CommunitySection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('');
    const trimmed = email.trim();
    if (!trimmed) {
      setStatus('Please enter your email.');
      return;
    }
    setSubmitting(true);
    try {
      await subscribeCommunity(trimmed);
      setStatus('Thanks — we will reach out soon.');
      setEmail('');
    } catch (err) {
      setStatus(err.message || 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.content}>
        <div className={styles.left}>
          <h2>JOIN THE LOCAL MATCH COMMUNITY</h2>
          <p>
            Are you a local creator looking to showcase your brand to a wider audience?
            We&apos;re building the future of local fashion discovery and we want you with us.
            Reach out and let&apos;s get your drops on the map.
          </p>
          <form className={styles.form} onSubmit={handleSubmit}>
            <label>READY TO GROW?</label>
            <div className={styles.inputGroup}>
              <input
                type="email"
                placeholder="your@brand-email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
              <button type="submit" disabled={submitting}>
                {submitting ? 'SENDING…' : 'REACH OUT'}
              </button>
            </div>
            {status && <p className={styles.status}>{status}</p>}
          </form>
        </div>
        <div className={styles.right}>
          <div className={styles.photoFrame}>
            <div className={styles.sticker}>LOCAL ONLY</div>
            <img src={COMMUNITY_IMAGE} alt="Fashion model" className={styles.modelImage} />
          </div>
          <div className={styles.yellowBackdrop} />
        </div>
      </div>
    </section>
  );
}
