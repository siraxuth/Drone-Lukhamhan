'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { UploadFolder } from '@/lib/upload';
import { MediaManager } from './MediaManager';

/** เลือกรูปจากคลัง (หรืออัปโหลดใหม่) */
export function MediaPickerDialog({ open, onOpenChange, onPick, uploadFolder }: { open: boolean; onOpenChange: (o: boolean) => void; onPick: (url: string) => void; uploadFolder?: UploadFolder }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[96vw] overflow-y-auto p-4 sm:max-w-5xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-extrabold">คลังรูป</DialogTitle>
          <DialogDescription>กดรูปเพื่อเลือก หรืออัปโหลดรูปใหม่</DialogDescription>
        </DialogHeader>
        {open && <MediaManager mode="picker" uploadFolder={uploadFolder} onPick={(u) => { onPick(u); onOpenChange(false); }} />}
      </DialogContent>
    </Dialog>
  );
}
