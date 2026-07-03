'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { toast } from 'sonner';
import { MapPin, Mail, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendMagicLink(e) {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    try {
      const supa = getSupabaseBrowser();
      const origin = window.location.origin;
      const { error } = await supa.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${origin}/auth/callback` },
      });
      if (error) throw error;
      setSent(true);
      toast.success('Check your inbox for the magic link');
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally { setSending(false); }
  }

  async function google() {
    const supa = getSupabaseBrowser();
    const origin = window.location.origin;
    const { error } = await supa.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}/auth/callback` },
    });
    if (error) toast.error(error.message);
  }

  return (
    <div className="min-h-[100dvh] grid place-items-center bg-gradient-to-br from-orange-50 via-background to-orange-50 p-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-sm">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <div className="font-extrabold text-lg leading-none">Spotted Jobs</div>
            <div className="text-[11px] text-muted-foreground">Hyperlocal hiring, by real people</div>
          </div>
        </Link>

        <div className="rounded-3xl bg-card border border-border p-6 shadow-sm">
          <h1 className="text-xl font-bold">Sign in to Spotted Jobs</h1>
          <p className="text-sm text-muted-foreground mt-1">We’ll send you a magic link — no password.</p>

          {sent ? (
            <div className="mt-6 rounded-2xl border border-primary/40 bg-primary/5 p-4 text-sm">
              ✉️ Check <b>{email}</b> for a magic link. Open it in this browser to sign in.
            </div>
          ) : (
            <form onSubmit={sendMagicLink} className="mt-5 space-y-3">
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <Button type="submit" className="w-full h-11" disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
                Send magic link
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            </form>
          )}

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full h-11" onClick={google}>
            <svg viewBox="0 0 48 48" className="h-4 w-4 mr-2"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Continue with Google
          </Button>

          <div className="mt-6 text-[11px] text-muted-foreground text-center">
            By continuing you agree to Spotted Jobs’ Terms and privacy policy.
          </div>
        </div>

        <Link href="/" className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground">← Back to map</Link>
      </div>
    </div>
  );
}
