"use client"

import { useState, useEffect, useRef } from 'react';
import { Storage, FloorPlan, FloorZone, User } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Plus, Trash2, MapPin, Loader2, Search, X, Lock, LockOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FloorPlanCanvas } from '@/components/floor-plan/floor-plan-canvas';
import { FloorPlanTabs } from '@/components/floor-plan/floor-plan-tabs';
import { parsePortNumbers } from '@/lib/utils';

interface DraftRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function AdminFloorPlanPage() {
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [activeFloorPlanId, setActiveFloorPlanId] = useState<string | null>(null);
  const [zones, setZones] = useState<FloorZone[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [drawingMode, setDrawingMode] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [pendingRect, setPendingRect] = useState<DraftRect | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [isZoneDialogOpen, setIsZoneDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<FloorZone | null>(null);
  const [label, setLabel] = useState('');
  const [portNumber, setPortNumber] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('none');
  const [notes, setNotes] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<'zone' | 'section'>('zone');
  const [deleteTargetId, setDeleteTargetId] = useState('');

  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionImagePreview, setNewSectionImagePreview] = useState('');

  const [isAddingSection, setIsAddingSection] = useState(false);
  const isAddingSectionRef = useRef(false);
  const [isSavingZone, setIsSavingZone] = useState(false);
  const isSavingZoneRef = useRef(false);
  const isDeletingRef = useRef(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const isUploadingImageRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const newSectionFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAll();
  }, []);

  const activeFloorPlan = floorPlans.find((fp) => fp.id === activeFloorPlanId) ?? null;
  const activeZones = zones.filter((z) => z.floorPlanId === activeFloorPlanId);

  const zoneMatchesSearch = (zone: FloorZone, term: string) => {
    const t = term.trim().toLowerCase();
    if (!t) return false;
    if (zone.label.toLowerCase().includes(t)) return true;
    if (zone.assignedUserName?.toLowerCase().includes(t)) return true;
    if (parsePortNumbers(zone.portNumber).some((p) => p.toLowerCase().includes(t))) return true;
    return false;
  };

  const matchingZones = searchTerm.trim() ? zones.filter((z) => zoneMatchesSearch(z, searchTerm)) : [];
  const matchingZoneIds = matchingZones.map((z) => z.id);
  const matchesInOtherSections = matchingZones.filter((z) => z.floorPlanId !== activeFloorPlanId).length;

  useEffect(() => {
    if (!searchTerm.trim() || matchingZones.length === 0) return;
    const hasMatchInActive = matchingZones.some((z) => z.floorPlanId === activeFloorPlanId);
    if (!hasMatchInActive) {
      setActiveFloorPlanId(matchingZones[0].floorPlanId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const loadAll = async () => {
    try {
      const [plans, z, u] = await Promise.all([
        Storage.getFloorPlans(),
        Storage.getFloorZones(),
        Storage.getUsers(),
      ]);
      setFloorPlans(plans);
      setZones(z);
      setActiveFloorPlanId((prev) => (prev && plans.some((fp) => fp.id === prev) ? prev : plans[0]?.id ?? null));
      setUsers(u);
    } catch {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal memuatkan data pelan lantai." });
    }
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeFloorPlan || isUploadingImageRef.current) return;
    isUploadingImageRef.current = true;
    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const updated = floorPlans.map((fp) => (fp.id === activeFloorPlan.id ? { ...fp, imageUrl: base64 } : fp));
        await Storage.saveFloorPlans(updated);
        setFloorPlans(updated);
        toast({ title: "Berjaya", description: "Imej pelan lantai berjaya dikemaskini." });
      } catch {
        toast({ variant: "destructive", title: "Ralat", description: "Gagal mengemaskini imej pelan lantai." });
      } finally {
        isUploadingImageRef.current = false;
        setIsUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNewSectionImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setNewSectionImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const resetSectionForm = () => {
    setIsSectionDialogOpen(false);
    setNewSectionName('');
    setNewSectionImagePreview('');
    if (newSectionFileInputRef.current) newSectionFileInputRef.current.value = '';
  };

  const handleAddSection = async () => {
    if (isAddingSectionRef.current) return;
    if (!newSectionName.trim() || !newSectionImagePreview) {
      toast({ variant: "destructive", title: "Ralat", description: "Sila masukkan nama bahagian dan muat naik imej." });
      return;
    }
    isAddingSectionRef.current = true;
    setIsAddingSection(true);
    try {
      const newPlan: FloorPlan = {
        id: `floorplan-${Date.now()}`,
        name: newSectionName.trim(),
        imageUrl: newSectionImagePreview,
        addedDate: new Date().toISOString().split('T')[0],
      };
      const updated = [...floorPlans, newPlan];
      await Storage.saveFloorPlans(updated);
      setFloorPlans(updated);
      setActiveFloorPlanId(newPlan.id);
      toast({ title: "Berjaya", description: `Bahagian "${newPlan.name}" telah ditambah.` });
      resetSectionForm();
    } catch {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal menambah bahagian baru." });
    } finally {
      isAddingSectionRef.current = false;
      setIsAddingSection(false);
    }
  };

  const handleZoneCreate = (rect: DraftRect) => {
    setPendingRect(rect);
    setEditingZone(null);
    setLabel('');
    setPortNumber('');
    setAssignedUserId('none');
    setNotes('');
    setIsZoneDialogOpen(true);
    setDrawingMode(false);
  };

  const handleZoneClick = (zone: FloorZone) => {
    setPendingRect(null);
    setEditingZone(zone);
    setLabel(zone.label);
    setPortNumber(zone.portNumber || '');
    setAssignedUserId(zone.assignedUserId || 'none');
    setNotes(zone.notes || '');
    setIsZoneDialogOpen(true);
  };

  const resetZoneForm = () => {
    setIsZoneDialogOpen(false);
    setEditingZone(null);
    setPendingRect(null);
    setLabel('');
    setPortNumber('');
    setAssignedUserId('none');
    setNotes('');
  };

  const handleSaveZone = async () => {
    if (isSavingZoneRef.current) return;
    if (!activeFloorPlan || !label.trim()) {
      toast({ variant: "destructive", title: "Ralat", description: "Sila masukkan nama bilik/meja." });
      return;
    }
    isSavingZoneRef.current = true;
    setIsSavingZone(true);
    const selectedUser = users.find((u) => u.uid === assignedUserId);
    const base = editingZone ?? { id: `zone-${Date.now()}`, floorPlanId: activeFloorPlan.id, ...pendingRect! };
    const zoneData: FloorZone = {
      ...base,
      label: label.trim(),
      portNumber: portNumber.trim() || undefined,
      assignedUserId: assignedUserId !== 'none' ? assignedUserId : undefined,
      assignedUserName: assignedUserId !== 'none' ? selectedUser?.name : undefined,
      notes: notes.trim() || undefined,
    };
    try {
      const updated = editingZone
        ? zones.map((z) => (z.id === editingZone.id ? zoneData : z))
        : [...zones, zoneData];
      await Storage.saveFloorZones(updated);
      setZones(updated);
      toast({ title: "Berjaya", description: `Zon "${zoneData.label}" telah disimpan.` });
      resetZoneForm();
    } catch {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal menyimpan zon." });
    } finally {
      isSavingZoneRef.current = false;
      setIsSavingZone(false);
    }
  };

  const handleDeleteZone = async () => {
    try {
      const updated = zones.filter((z) => z.id !== deleteTargetId);
      await Storage.saveFloorZones(updated);
      setZones(updated);
      toast({ variant: "destructive", title: "Dipadam", description: "Zon telah dibuang." });
    } catch {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal memadam zon." });
    }
  };

  const handleDeleteSection = async () => {
    if (!activeFloorPlan) return;
    try {
      const updatedPlans = floorPlans.filter((fp) => fp.id !== activeFloorPlan.id);
      const updatedZones = zones.filter((z) => z.floorPlanId !== activeFloorPlan.id);
      await Storage.saveFloorPlans(updatedPlans);
      await Storage.saveFloorZones(updatedZones);
      setFloorPlans(updatedPlans);
      setZones(updatedZones);
      setActiveFloorPlanId(updatedPlans[0]?.id ?? null);
      toast({ variant: "destructive", title: "Dipadam", description: `Bahagian "${activeFloorPlan.name}" dan semua zon di dalamnya telah dibuang.` });
    } catch {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal memadam bahagian." });
    }
  };

  const handleConfirmDelete = async () => {
    if (isDeletingRef.current) return;
    isDeletingRef.current = true;
    try {
      if (confirmType === 'zone') await handleDeleteZone();
      else await handleDeleteSection();
    } finally {
      isDeletingRef.current = false;
      setConfirmOpen(false);
    }
  };

  const handleZoneMove = async (id: string, x: number, y: number) => {
    const updated = zones.map((z) => (z.id === id ? { ...z, x, y } : z));
    setZones(updated);
    try {
      await Storage.saveFloorZones(updated);
    } catch {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal mengemaskini kedudukan zon." });
    }
  };

  const handleZoneResize = async (id: string, width: number, height: number) => {
    const updated = zones.map((z) => (z.id === id ? { ...z, width, height } : z));
    setZones(updated);
    try {
      await Storage.saveFloorZones(updated);
    } catch {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal mengemaskini saiz zon." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">Floor Plan</h1>
          <p className="text-sm text-muted-foreground">Urus pelan lantai pejabat dan tetapkan kedudukan staf serta no. port.</p>
        </div>
        <div className="flex flex-wrap w-full md:w-auto gap-2">
          <Button variant="outline" className="flex-1 md:flex-none gap-2" onClick={() => setIsSectionDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Tambah Bahagian Baru
          </Button>
          {activeFloorPlan && (
            <>
              <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleUploadImage} />
              <Button variant="outline" className="flex-1 md:flex-none gap-2" disabled={isUploadingImage} onClick={() => fileInputRef.current?.click()}>
                {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isUploadingImage ? 'Memuat naik...' : 'Ganti Imej'}
              </Button>
              <Button
                variant={drawingMode ? "default" : "outline"}
                className="flex-1 md:flex-none gap-2"
                onClick={() => setDrawingMode(!drawingMode)}
              >
                <Plus className="h-4 w-4" /> {drawingMode ? 'Melukis... (seret di atas pelan)' : 'Tambah Zon'}
              </Button>
              <Button
                variant={moveMode ? "default" : "outline"}
                className="flex-1 md:flex-none gap-2"
                onClick={() => setMoveMode(!moveMode)}
              >
                {moveMode ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {moveMode ? 'Mod Gerak (aktif)' : 'Zon Dikunci'}
              </Button>
              <Button
                variant="outline"
                className="flex-1 md:flex-none gap-2 text-destructive hover:bg-destructive/10"
                onClick={() => { setConfirmType('section'); setConfirmOpen(true); }}
              >
                <Trash2 className="h-4 w-4" /> Padam Bahagian
              </Button>
            </>
          )}
        </div>
      </div>

      {floorPlans.length > 0 && (
        <div className="space-y-1">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama staf, nama bilik/meja, atau no. port..."
              className="pl-9 pr-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {searchTerm.trim() && (
            <p className="text-xs text-muted-foreground">
              {matchingZones.length === 0
                ? 'Tiada hasil dijumpai.'
                : `${matchingZones.length} hasil dijumpai${matchesInOtherSections > 0 ? ` (${matchesInOtherSections} dalam bahagian lain)` : ''}.`}
            </p>
          )}
        </div>
      )}

      <FloorPlanTabs floorPlans={floorPlans} activeId={activeFloorPlanId} onSelect={setActiveFloorPlanId} />

      {!activeFloorPlan ? (
        <Card>
          <CardContent className="p-10 text-center space-y-4">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto opacity-30" />
            <p className="text-sm text-muted-foreground">Belum ada bahagian pelan lantai ditambah. Klik &quot;Tambah Bahagian Baru&quot; untuk mula.</p>
            <Button className="gap-2" onClick={() => setIsSectionDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Tambah Bahagian Baru
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <FloorPlanCanvas
              imageUrl={activeFloorPlan.imageUrl}
              zones={activeZones}
              editable
              drawingMode={drawingMode}
              onZoneCreate={handleZoneCreate}
              onZoneClick={handleZoneClick}
              onZoneMove={handleZoneMove}
              onZoneResize={handleZoneResize}
              highlightedZoneIds={searchTerm.trim() ? matchingZoneIds : undefined}
              moveEnabled={moveMode}
            />
            <p className="text-xs text-muted-foreground mt-3">
              Klik &quot;Tambah Zon&quot; kemudian seret di atas pelan untuk buat zon baru. Klik mana-mana zon untuk edit maklumat.{' '}
              {moveMode
                ? 'Mod Gerak aktif — seret zon untuk gerakkan, atau seret penjuru bawah-kanan untuk saizkan semula.'
                : 'Zon dikunci — aktifkan "Zon Dikunci" di atas untuk boleh gerak/saizkan semula zon.'}
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isZoneDialogOpen} onOpenChange={(open) => { if (!open) resetZoneForm(); else setIsZoneDialogOpen(open); }}>
        <DialogContent className="max-w-[95vw] md:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>{editingZone ? 'Edit Zon' : 'Zon Baru'}</DialogTitle>
            <DialogDescription>Tetapkan nama bilik/meja, no. port internet, dan staf yang menduduki zon ini.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nama Bilik / Meja</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Cth: Meja 12 / Bilik Mesyuarat" />
            </div>
            <div className="grid gap-2">
              <Label>No. Port Internet</Label>
              <Input value={portNumber} onChange={(e) => setPortNumber(e.target.value)} placeholder="Cth: D-10, D-13 (asingkan dengan koma jika lebih dari satu)" />
            </div>
            <div className="grid gap-2">
              <Label>Staf Ditugaskan</Label>
              <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                <SelectTrigger><SelectValue placeholder="Pilih staf..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kosong / Tiada</SelectItem>
                  {users.map((u) => <SelectItem key={u.uid} value={u.uid}>{u.name} ({u.department})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Nota (Pilihan)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sebarang catatan tambahan..." />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {editingZone && (
              <Button
                variant="ghost"
                className="text-destructive gap-2"
                onClick={() => {
                  setConfirmType('zone');
                  setDeleteTargetId(editingZone.id);
                  setIsZoneDialogOpen(false);
                  // Defer opening the confirm dialog until after the zone dialog has fully
                  // closed — closing one Radix Dialog and opening another in the same tick
                  // leaves document.body stuck with pointer-events: none (page freezes).
                  setTimeout(() => setConfirmOpen(true), 200);
                }}
              >
                <Trash2 className="h-4 w-4" /> Padam Zon
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={resetZoneForm} disabled={isSavingZone}>Batal</Button>
              <Button onClick={handleSaveZone} disabled={!label.trim() || isSavingZone} className="gap-2">
                {isSavingZone && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSavingZone ? 'Menyimpan...' : (editingZone ? 'Kemaskini' : 'Simpan')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSectionDialogOpen} onOpenChange={(open) => { if (!open) resetSectionForm(); else setIsSectionDialogOpen(open); }}>
        <DialogContent className="max-w-[95vw] md:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Bahagian Baru</DialogTitle>
            <DialogDescription>Tambah pelan lantai untuk bahagian/kawasan pejabat yang lain.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nama Bahagian</Label>
              <Input value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} placeholder="Cth: Tingkat 2 / Makmal" />
            </div>
            <div className="grid gap-2">
              <Label>Imej Pelan Lantai</Label>
              <div className="flex flex-col gap-2">
                {newSectionImagePreview && (
                  <div className="relative w-full h-40 bg-muted rounded-lg overflow-hidden">
                    <img src={newSectionImagePreview} alt="preview" className="w-full h-full object-contain" />
                  </div>
                )}
                <input type="file" accept="image/*" ref={newSectionFileInputRef} className="hidden" onChange={handleNewSectionImage} />
                <Button type="button" variant="outline" className="w-full gap-2" onClick={() => newSectionFileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Muat Naik Imej
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={resetSectionForm} disabled={isAddingSection}>Batal</Button>
            <Button onClick={handleAddSection} disabled={!newSectionName.trim() || !newSectionImagePreview || isAddingSection} className="gap-2">
              {isAddingSection && <Loader2 className="h-4 w-4 animate-spin" />}
              {isAddingSection ? 'Menambah...' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmType === 'zone' ? "Padam Zon?" : "Padam Bahagian?"}
        description={
          confirmType === 'zone'
            ? "Zon ini akan dibuang secara kekal daripada pelan lantai."
            : `Bahagian "${activeFloorPlan?.name}" dan semua zon di dalamnya akan dibuang secara kekal.`
        }
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
