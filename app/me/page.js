'use client';
import { useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, LogOut, Save, Shield, MapPin, Bookmark, Flag, User as UserIcon, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    (async () => {
      const r = await fetch('/api/me');
      const j = await r.json();
      if (!j.user) { router.push('/login'); return; }
      setMe(j.user); setProfile(j.profile);
      setDisplayName(j.profile?.display_name || '');
      setLoading(false);
    })();
  }, [router]);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ display_name: displayName }) });
      const j = await r.json();
      if (!r.ok) { toast.error(j.error || 'Failed'); return; }
      setProfile(j.profile);
      toast.success('Profile updated');
    } finally { setSaving(false); }
  }

  async function signOut() {
    const supa = getSupabaseBrowser();
    await supa.auth.signOut();
    toast('Signed out');
    router.push('/');
  }

  if (!mounted || loading) return <PageLoader />;

  return (
    <div className="min-h-[100dvh] bg-background">
      <TopBar title="My Profile" />
      <div className="container max-w-2xl py-6 space-y-6">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 grid place-items-center overflow-hidden">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-7 w-7 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold truncate">{profile?.display_name || me?.email}</div>
              <div className="text-sm text-muted-foreground truncate">{me?.email}</div>
              <div className="flex gap-2 mt-1 flex-wrap">
                <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-muted">{profile?.role || 'user'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">Trust {profile?.trust_score || 0}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">{profile?.contribution_count || 0} contributions</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <div>
              <Label>Display name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How you want to be known" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={me?.email || ''} disabled />
            </div>
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving} className="gap-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-3 gap-3">
          <Link href="/me/saved"><Card className="hover:border-primary transition cursor-pointer"><CardContent className="p-4 flex items-center gap-3"><Bookmark className="h-5 w-5 text-primary" /><div><div className="font-semibold text-sm">Saved jobs</div><div className="text-xs text-muted-foreground">Your bookmarks</div></div></CardContent></Card></Link>
          <Link href="/me/reported"><Card className="hover:border-primary transition cursor-pointer"><CardContent className="p-4 flex items-center gap-3"><Flag className="h-5 w-5 text-primary" /><div><div className="font-semibold text-sm">Reported jobs</div><div className="text-xs text-muted-foreground">Your reports</div></div></CardContent></Card></Link>
          {profile?.role === 'admin' && (
            <Link href="/admin"><Card className="hover:border-primary transition cursor-pointer"><CardContent className="p-4 flex items-center gap-3"><Shield className="h-5 w-5 text-primary" /><div><div className="font-semibold text-sm">Admin</div><div className="text-xs text-muted-foreground">Dashboard</div></div></CardContent></Card></Link>
          )}
        </div>

        <Button variant="outline" className="w-full text-destructive" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-1" />Sign out
        </Button>
      </div>
    </div>
  );
}

export function TopBar({ title }) {
  return (
    <header className="border-b border-border bg-card/70 backdrop-blur sticky top-0 z-20">
      <div className="container max-w-2xl flex items-center gap-3 py-3">
        <Link href="/" className="h-9 w-9 rounded-xl bg-muted grid place-items-center"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center"><MapPin className="h-5 w-5" /></div>
        <div className="font-bold">{title}</div>
      </div>
    </header>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-[100dvh] grid place-items-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
