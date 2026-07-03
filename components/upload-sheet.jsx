'use client';
import { useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Loader2, MapPin, RefreshCw, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORIES } from '@/lib/categories';
import { motion } from 'framer-motion';

async function compressImage(file, maxDim = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = reject;
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Compression failed'));
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', quality);
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function UploadSheet({ open, onClose, onCreated }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [pos, setPos] = useState(null);
  const [postcode, setPostcode] = useState('');
  const [town, setTown] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ai, setAi] = useState(null);
  const [form, setForm] = useState({ title: '', business_name: '', category: 'other', description: '', contact: '' });

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }, []);

  async function onPick(f) {
    if (!f) return;
    try {
      const compressed = await compressImage(f);
      setFile(compressed);
      setPreview(URL.createObjectURL(compressed));
      setAi(null);
    } catch (e) {
      toast.error('Could not read image');
    }
  }

  async function runAI() {
    if (!file) return;
    if (!pos) { toast.error('Waiting for GPS. Grant location access or enter postcode.'); return; }
    setAnalyzing(true);
    try {
      // Preview extraction only via the /api/jobs/upload with a special "dry-run"? Simpler: skip preview and let submit do it.
      // For UX we do a real submission after preview confirm; skip separate call.
      toast('AI will run on submit.');
    } finally { setAnalyzing(false); }
  }

  async function submit() {
    if (!file) { toast.error('Please select an image'); return; }
    if (!pos) { toast.error('Waiting for GPS. Grant location or enter postcode.'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('lat', String(pos.lat));
      fd.append('lng', String(pos.lng));
      if (postcode) fd.append('postcode', postcode);
      if (town) fd.append('town', town);
      // send overrides only if user edited any field
      const overrides = {};
      Object.entries(form).forEach(([k, v]) => { if (v && v.trim()) overrides[k] = v.trim(); });
      if (Object.keys(overrides).length) fd.append('overrides', JSON.stringify(overrides));
      const res = await fetch('/api/jobs/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Upload failed');
        if (data.ai) setAi(data.ai);
        return;
      }
      toast.success('📍 Job spotted and live on the map!');
      setAi(data.ai);
      onCreated?.(data.job);
    } catch (e) {
      toast.error('Upload failed');
    } finally { setUploading(false); }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[92dvh] rounded-t-3xl p-0 overflow-hidden flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /> Spot a Job</SheetTitle>
          <SheetDescription>Snap a hiring poster you saw in a shop window. Our AI will fill in the details.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!preview ? (
            <div className="grid gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-[4/3] rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 grid place-items-center text-center p-6 hover:bg-primary/10 transition"
              >
                <div>
                  <Camera className="h-10 w-10 mx-auto text-primary mb-2" />
                  <div className="font-semibold">Take a photo of a hiring poster</div>
                  <div className="text-sm text-muted-foreground mt-1">Or pick from your gallery</div>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => onPick(e.target.files?.[0])}
              />
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" className="w-full max-h-72 object-contain bg-black" />
                <button onClick={() => { setFile(null); setPreview(null); setAi(null); }} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {pos ? `Location captured (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})` : 'Waiting for GPS…'}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {
                    navigator.geolocation.getCurrentPosition((p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }), () => toast.error('Location denied'), { enableHighAccuracy: true });
                  }}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />Retry
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Postcode (optional)</Label>
                    <Input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="E1 6AN" />
                  </div>
                  <div>
                    <Label className="text-xs">Town (optional)</Label>
                    <Input value={town} onChange={(e) => setTown(e.target.value)} placeholder="London" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" /> Auto-fill (optional overrides)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Job title</Label>
                    <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="AI will fill in" />
                  </div>
                  <div>
                    <Label className="text-xs">Business name</Label>
                    <Input value={form.business_name} onChange={(e) => setForm(f => ({ ...f, business_name: e.target.value }))} placeholder="AI will fill in" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Category</Label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      {CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.emoji} {c.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Contact</Label>
                    <Input value={form.contact} onChange={(e) => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="phone / email / instagram" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Description</Label>
                    <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="AI will summarise the poster" rows={2} />
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground">Leave blank to let AI fill each field automatically.</div>
              </div>

              {ai && (
                <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs">
                  <div className="font-semibold mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" />AI thought:</div>
                  <pre className="whitespace-pre-wrap font-mono text-[11px] opacity-80">{JSON.stringify(ai, null, 2)}</pre>
                </div>
              )}
            </motion.div>
          )}
        </div>

        <div className="p-4 border-t bg-background">
          <Button className="w-full h-12 text-base" disabled={!file || uploading || !pos} onClick={submit}>
            {uploading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analysing & publishing…</>) : (<>📍 Publish this spotted job</>)}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
