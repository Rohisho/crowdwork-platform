'use client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CATEGORY_MAP } from '@/lib/categories';
import { Bookmark, Flag, ThumbsUp, ThumbsDown, MapPin, Phone } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function JobDetailSheet({ job, onClose, user }) {
  const [voting, setVoting] = useState(false);
  const [counts, setCounts] = useState({ active: job.active_votes || 0, gone: job.gone_votes || 0 });
  const cat = CATEGORY_MAP[job.category] || CATEGORY_MAP.other;

  async function vote(kind) {
    if (!user) { toast('Sign in to vote'); return; }
    setVoting(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind }) });
      const data = await res.json();
      if (res.ok) {
        setCounts({ active: data.active_votes, gone: data.gone_votes });
        toast.success('Thanks for the update!');
      } else {
        toast.error(data.error || 'Failed');
      }
    } finally { setVoting(false); }
  }

  async function bookmark() {
    if (!user) { toast('Sign in to save'); return; }
    const res = await fetch(`/api/jobs/${job.id}/bookmark`, { method: 'POST' });
    if (res.ok) toast.success('Saved to your bookmarks'); else toast.error('Failed');
  }

  async function report() {
    if (!user) { toast('Sign in to report'); return; }
    const res = await fetch(`/api/jobs/${job.id}/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'spam' }) });
    if (res.ok) toast('Reported — thanks'); else toast.error('Failed');
  }

  return (
    <Sheet open={!!job} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="p-0 rounded-t-3xl overflow-hidden max-h-[92dvh] flex flex-col">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={job.poster_url} alt="" className="w-full max-h-[42dvh] object-cover bg-muted" />
          <span className="absolute top-3 left-3 px-2 py-1 rounded-full text-[10px] uppercase tracking-wide font-semibold text-white" style={{ backgroundColor: cat.color }}>
            {cat.emoji} {cat.label}
          </span>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-2xl leading-tight">{job.title}</SheetTitle>
          </SheetHeader>
          {job.business_name && <div className="text-sm font-medium">{job.business_name}</div>}
          {job.description && <p className="text-sm text-foreground/80 whitespace-pre-wrap">{job.description}</p>}
          {job.contact && (
            <a href={job.contact.includes('@') ? `mailto:${job.contact}` : `tel:${job.contact}`} className="inline-flex items-center gap-1 text-primary font-medium text-sm">
              <Phone className="h-4 w-4" /> {job.contact}
            </a>
          )}
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {job.postcode || job.town || `${job.lat?.toFixed(4)}, ${job.lng?.toFixed(4)}`}
            {typeof job.distance_m === 'number' && <> • {(job.distance_m/1000).toFixed(1)} km away</>}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button size="sm" variant="outline" disabled={voting} onClick={() => vote('still_active')}>
              <ThumbsUp className="h-4 w-4 mr-1" /> Still active ({counts.active})
            </Button>
            <Button size="sm" variant="outline" disabled={voting} onClick={() => vote('gone')}>
              <ThumbsDown className="h-4 w-4 mr-1" /> Gone ({counts.gone})
            </Button>
            <Button size="sm" variant="ghost" onClick={bookmark}><Bookmark className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={report}><Flag className="h-4 w-4" /></Button>
          </div>

          <div className="text-[11px] text-muted-foreground pt-2">
            Spotted {new Date(job.created_at).toLocaleString()} • Expires {new Date(job.expires_at).toLocaleDateString()}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
