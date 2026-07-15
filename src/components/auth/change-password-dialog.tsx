"use client"

import { useState, useRef } from 'react';
import { Storage, User } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { KeyRound, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export function ChangePasswordDialog({ open, onOpenChange, user }: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const { toast } = useToast();

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    if (isSavingRef.current || !user) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ variant: "destructive", title: "Ralat", description: "Sila isi semua ruangan." });
      return;
    }
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Ralat", description: "Kata laluan baru mestilah sekurang-kurangnya 6 aksara." });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Ralat", description: "Kata laluan baru dan pengesahan tidak sepadan." });
      return;
    }
    if (newPassword === currentPassword) {
      toast({ variant: "destructive", title: "Ralat", description: "Kata laluan baru mestilah berbeza daripada kata laluan semasa." });
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      // Sahkan kata laluan semasa terlebih dahulu
      const verify = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: currentPassword }),
      });
      if (!verify.ok) {
        toast({ variant: "destructive", title: "Ralat", description: "Kata laluan semasa tidak betul." });
        return;
      }

      // Kemaskini kata laluan sendiri sahaja — user lain dihantar tanpa medan password,
      // jadi kata laluan mereka kekal tidak berubah (bulk API hanya update password jika diberi).
      const allUsers = await Storage.getUsers();
      const updated = allUsers.map(u => u.uid === user.uid ? { ...u, password: newPassword } : u);
      await Storage.saveUsers(updated);

      toast({ title: "Berjaya", description: "Kata laluan anda telah dikemaskini." });
      resetForm();
      onOpenChange(false);
    } catch {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal mengemaskini kata laluan." });
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] md:max-w-sm rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> Tukar Kata Laluan
          </DialogTitle>
          <DialogDescription>Kemaskini kata laluan akaun anda sendiri.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="current-password">Kata Laluan Semasa</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-password">Kata Laluan Baru</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Sekurang-kurangnya 6 aksara"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Sahkan Kata Laluan Baru</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Taip semula kata laluan baru"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isSaving}>Batal</Button>
          <Button
            onClick={handleSave}
            disabled={!currentPassword || !newPassword || !confirmPassword || isSaving}
            className="gap-2"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
