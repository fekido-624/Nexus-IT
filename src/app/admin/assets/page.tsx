"use client"

import { useState, useEffect, useRef } from 'react';
import { Storage, Asset, AssetUnit } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
// Tambah Download icon di sini
import { Plus, Pencil, Trash2, Search, Upload, Download, X, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import React from 'react';

const CATEGORIES = ['Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Projector', 'Printer', 'Networking', 'UPS', 'Others'];

export default function AssetManagement() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [units, setUnits] = useState<AssetUnit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<'asset' | 'unit'>('asset');
  const [deleteTargetId, setDeleteTargetId] = useState('');
  const [deleteTargetUnit, setDeleteTargetUnit] = useState<AssetUnit | null>(null);

  // Asset Dialog
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  // Unit Dialog
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [editingUnit, setEditingUnit] = useState<AssetUnit | null>(null);
  const [unitSerial, setUnitSerial] = useState('');
  const [unitCondition, setUnitCondition] = useState<'good' | 'damaged' | 'lost'>('good');
  const [unitNotes, setUnitNotes] = useState('');

  // Rujukan input fail tersembunyi untuk fungsi muat naik
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [a, u] = await Promise.all([Storage.getAssets(), Storage.getUnits()]);
      setAssets(a);
      setUnits(u);
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to load data" });
    }
  };

// ─── FUNGSI BULK UPLOAD (KEMAS KINI) ───────────────────────────────────────

  const handleDownloadTemplate = () => {
    // Header baru: Tiada lagi quantity, digantikan dengan serialNumbers
    const headers = "category,brand,model,description,serialNumbers\n";
    
    // Contoh data (Perhatikan penggunaan simbol ';' untuk memisahkan serial number)
    const sample = "Laptop,Dell,Latitude 5420,Laptop pejabat,SN-001;SN-002;SN-003\nMonitor,HP,24f,Monitor 24 inci,TAG-MON-11;TAG-MON-12\n";
    
    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Template_Upload_Aset_KemasKini.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({ variant: "destructive", title: "Format Salah", description: "Sila muat naik fail berformat CSV sahaja." });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) {
        toast({ variant: "destructive", title: "Fail Kosong", description: "Sila masukkan data aset ke dalam template." });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const newAssets: Asset[] = [];
      const newUnits: AssetUnit[] = [];
      const todayStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toISOString();

      let successCount = 0;

      for (let i = 1; i < lines.length; i++) {
        // Abaikan koma yang mungkin ada di dalam description buat sementara
        const currentLine = lines[i].split(',').map(val => val.trim());
        
        if (currentLine.length >= 2) {
          const brand = currentLine[headers.indexOf('brand')] || '-';
          const model = currentLine[headers.indexOf('model')] || '-';
          const assetId = `ASSET-BULK-${Date.now()}-${i}`;
          
          // 1. Dapatkan senarai Serial Number dari Excel dan pecahkan guna simbol ';'
          const serialsRaw = currentLine[headers.indexOf('serialnumbers')] || '';
          const serialsList = serialsRaw.split(';').map(s => s.trim()).filter(s => s !== '');
          const qty = serialsList.length; // Kuantiti automatik ikut bilangan SN

          if (qty > 0) {
            // 2. Cipta Profil Aset Induk
            newAssets.push({
              assetId,
              category: currentLine[headers.indexOf('category')] || 'Others',
              brand,
              model,
              assetTag: `${brand}-${model}`.replace(/\s+/g, '-').toUpperCase(),
              description: currentLine[headers.indexOf('description')] || '',
              imageUrl: '', 
              status: 'available',
              availableQty: qty,
              addedDate: todayStr,
              lastUpdated: timeStr
            });

            // 3. Cipta Unit mengikut Serial Number SEBENAR yang ditaip
            serialsList.forEach((serial, index) => {
              newUnits.push({
                unitId: `UNIT-BULK-${Date.now()}-${i}-${index}`,
                assetId: assetId,
                assetName: `${brand} ${model}`,
                assetTag: serial, // <--- Menggunakan Serial Number sebenar
                brand: brand,
                model: model,
                category: currentLine[headers.indexOf('category')] || 'Others',
                condition: 'good',
                currentStatus: 'available',
                currentBorrowerId: '',
                currentBorrowerName: '',
                currentRequestId: '',
                borrowHistory: '[]',
                notes: 'Muat naik pukal',
                addedDate: todayStr
              });
            });
            successCount++;
          }
        }
      }

      if (newAssets.length > 0) {
        try {
          const currentAssets = await Storage.getAssets();
          const currentUnitsObj = await Storage.getUnits();
          
          await Storage.saveAssets([...currentAssets, ...newAssets]);
          await Storage.saveUnits([...currentUnitsObj, ...newUnits]);
          
          toast({ 
            title: "Muat Naik Berjaya", 
            description: `${successCount} jenis aset dan ${newUnits.length} unit telah ditambah.` 
          });
          
          if (fileInputRef.current) fileInputRef.current.value = '';
          await loadAll();
        } catch (error) {
          toast({ variant: "destructive", title: "Ralat", description: "Gagal menyimpan aset pukal." });
        }
      } else {
        toast({ variant: "destructive", title: "Tiada Data Aset", description: "Sila pastikan kolum 'serialNumbers' telah diisi dengan betul." });
      }
    };
    
    reader.readAsText(file);
  };

  // ─── ASSET HANDLERS ───────────────────────────────────────────

  const handleSaveAsset = async () => {
    if (!category || !brand || !model) {
      toast({ variant: "destructive", title: "Error", description: "Please fill in all mandatory fields." });
      return;
    }
    try {
      const currentAssets = await Storage.getAssets();
      const currentUnits = await Storage.getUnits();

      if (editingAsset) {
        const updatedAssets = currentAssets.map(a =>
          a.assetId === editingAsset.assetId
            ? { ...a, category, brand, model, description, imageUrl, lastUpdated: new Date().toISOString().split('T')[0] }
            : a
        );
        await Storage.saveAssets(updatedAssets);

        // Sync unit assetName
        const updatedUnits = currentUnits.map(u =>
          u.assetId === editingAsset.assetId
            ? { ...u, brand, model, category, assetName: `${brand} ${model}` }
            : u
        );
        await Storage.saveUnits(updatedUnits);
        toast({ title: "Asset Updated", description: `${brand} ${model} has been updated.` });
      } else {
        const assetId = `a-${Date.now()}`;
        const newAsset: Asset = {
          assetId,
          category,
          brand,
          model,
          assetTag: `${brand}-${model}`.replace(/\s+/g, '-').toUpperCase(),
          description,
          imageUrl,
          status: 'available',
          availableQty: 0,
          addedDate: new Date().toISOString().split('T')[0],
          lastUpdated: new Date().toISOString().split('T')[0]
        };
        await Storage.saveAssets([...currentAssets, newAsset]);
        toast({ title: "Asset Registered", description: `${brand} ${model} registered. Now add units/serial numbers.` });
      }

      await loadAll();
      resetAssetForm();
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to save asset" });
    }
  };


  const handleDeleteAsset = async (assetId: string) => {
    try {
      const currentUnits = await Storage.getUnits();
      const hasBorrowed = currentUnits.some(u => u.assetId === assetId && u.currentStatus === 'borrowed');
      if (hasBorrowed) {
        toast({ variant: "destructive", title: "Cannot Delete", description: "Asset has units currently being borrowed." });
        return;
      }
      const currentAssets = await Storage.getAssets();
      const updatedAssets = currentAssets.filter(a => a.assetId !== assetId);
      const updatedUnits = currentUnits.filter(u => u.assetId !== assetId);

      await Storage.saveAssets(updatedAssets);
      await Storage.saveUnits(updatedUnits);

      // Update state terus, jangan tunggu loadAll
      setAssets(updatedAssets);
      setUnits(updatedUnits);

      toast({ variant: "destructive", title: "Asset Removed", description: "Asset and all its units have been deleted." });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete asset" });
    }
  };

  const handleConfirmDelete = async () => {
    if (confirmType === 'asset') {
      await handleDeleteAsset(deleteTargetId);
    } else if (confirmType === 'unit' && deleteTargetUnit) {
      await handleDeleteUnit(deleteTargetUnit);
    }
    setConfirmOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImageUrl(base64);
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetAssetForm = () => {
    setCategory(''); setBrand(''); setModel('');
    setDescription(''); setImageUrl(''); setImagePreview('');
    setEditingAsset(null); setIsAssetDialogOpen(false);
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setCategory(asset.category || '');
    setBrand(asset.brand || '');
    setModel(asset.model || '');
    setDescription(asset.description || '');
    setImageUrl(asset.imageUrl || '');
    setImagePreview(asset.imageUrl || '');
    setIsAssetDialogOpen(true);
  };

  // ─── UNIT HANDLERS ────────────────────────────────────────────

  const handleOpenAddUnit = (asset: Asset) => {
    setSelectedAsset(asset);
    setEditingUnit(null);
    setUnitSerial('');
    setUnitCondition('good');
    setUnitNotes('');
    setIsUnitDialogOpen(true);
  };

  const handleOpenEditUnit = (asset: Asset, unit: AssetUnit) => {
    setSelectedAsset(asset);
    setEditingUnit(unit);
    setUnitSerial(unit.assetTag || '');
    setUnitCondition(unit.condition || 'good');
    setUnitNotes(unit.notes || '');
    setIsUnitDialogOpen(true);
  };

  const handleSaveUnit = async () => {
    if (!unitSerial || !selectedAsset) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a serial number." });
      return;
    }
    try {
      const currentUnits = await Storage.getUnits();
      const currentAssets = await Storage.getAssets();

      if (editingUnit) {
        const updatedUnits = currentUnits.map(u =>
          u.unitId === editingUnit.unitId
            ? { ...u, assetTag: unitSerial, condition: unitCondition, notes: unitNotes }
            : u
        );
        await Storage.saveUnits(updatedUnits);
        toast({ title: "Unit Updated", description: `Serial ${unitSerial} has been updated.` });
      } else {
        const newUnit: AssetUnit = {
          unitId: `unit-${Date.now()}`,
          assetId: selectedAsset.assetId,
          assetName: `${selectedAsset.brand} ${selectedAsset.model}`,
          assetTag: unitSerial,
          brand: selectedAsset.brand,
          model: selectedAsset.model,
          category: selectedAsset.category,
          condition: unitCondition,
          currentStatus: 'available',
          currentBorrowerId: '',
          currentBorrowerName: '',
          currentRequestId: '',
          borrowHistory: '[]',
          notes: unitNotes,
          addedDate: new Date().toISOString().split('T')[0]
        };

        await Storage.saveUnits([...currentUnits, newUnit]);

        // Update asset availableQty
        const updatedAssets = currentAssets.map(a =>
          a.assetId === selectedAsset.assetId
            ? { ...a, availableQty: (a.availableQty || 0) + 1, status: 'available' as const }
            : a
        );
        await Storage.saveAssets(updatedAssets);
        toast({ title: "Unit Added", description: `Serial ${unitSerial} added under ${selectedAsset.brand} ${selectedAsset.model}.` });
      }

      await loadAll();
      resetUnitForm();
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to save unit" });
    }
  };

  const handleDeleteUnit = async (unit: AssetUnit) => {
    if (unit.currentStatus === 'borrowed') {
      toast({ variant: "destructive", title: "Cannot Delete", description: "Unit is currently being borrowed." });
      return;
    }
    try {
      const currentUnits = await Storage.getUnits();
      const currentAssets = await Storage.getAssets();

      await Storage.saveUnits(currentUnits.filter(u => u.unitId !== unit.unitId));

      const updatedAssets = currentAssets.map(a =>
        a.assetId === unit.assetId
          ? { ...a, availableQty: Math.max(0, (a.availableQty || 1) - 1) }
          : a
      );
      await Storage.saveAssets(updatedAssets);
      await loadAll();
      toast({ variant: "destructive", title: "Unit Removed", description: `Serial ${unit.assetTag} has been deleted.` });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete unit" });
    }
  };

  const resetUnitForm = () => {
    setUnitSerial(''); setUnitCondition('good'); setUnitNotes('');
    setEditingUnit(null); setSelectedAsset(null);
    setIsUnitDialogOpen(false);
  };

  // ─── FILTER & GROUP ───────────────────────────────────────────

  const filteredAssets = assets.filter(a => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (a.brand || '').toLowerCase().includes(term) ||
      (a.model || '').toLowerCase().includes(term) ||
      (a.category || '').toLowerCase().includes(term);
    const matchesCategory = selectedCategory === 'all' || a.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedAssets = CATEGORIES.reduce((acc, cat) => {
    const catAssets = filteredAssets.filter(a => a.category === cat);
    if (catAssets.length > 0) acc[cat] = catAssets;
    return acc;
  }, {} as Record<string, Asset[]>);

  const getUnitsByAsset = (assetId: string) => units.filter(u => u.assetId === assetId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available': return <Badge className="bg-green-500 text-[10px]">Available</Badge>;
      case 'borrowed': return <Badge className="bg-blue-500 text-[10px]">Borrowed</Badge>;
      case 'maintenance': return <Badge className="bg-orange-500 text-[10px]">Maintenance</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  // ─── RENDER ───────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ─── HEADER BARU DENGAN BUTANG UPLOAD CSV ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">Asset Management</h1>
          <p className="text-sm text-muted-foreground">Register assets and manage individual unit serial numbers.</p>
        </div>
        <div className="flex flex-wrap w-full md:w-auto gap-2">
          {/* Input fail tersembunyi yang akan dipanggil oleh butang Upload */}
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload} 
          />
          <Button variant="outline" className="flex-1 md:flex-none gap-2" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4" /> Template CSV
          </Button>
          <Button variant="outline" className="flex-1 md:flex-none gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Upload CSV
          </Button>
          <Button className="w-full md:w-auto gap-2" onClick={() => setIsAssetDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Register New Asset
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search assets..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="w-full md:w-48">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Asset List */}
      <Card className="shadow-md">
        <CardContent className="p-0">
          {Object.keys(groupedAssets).length === 0 ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground">No assets found.</div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {Object.entries(groupedAssets).map(([cat, catAssets]) => (
                <AccordionItem key={cat} value={cat} className="border-b last:border-b-0">
                  <AccordionTrigger className="hover:no-underline px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">{cat}</span>
                      <Badge variant="outline" className="text-xs">{catAssets.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 py-0">
                    {catAssets.map(asset => {
                      const assetUnits = getUnitsByAsset(asset.assetId);
                      return (
                        <div key={asset.assetId} className="border-t px-6 py-4 space-y-3">
                          {/* Asset Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {asset.imageUrl && (
                                <img src={asset.imageUrl} alt={asset.model} className="w-10 h-10 object-cover rounded" />
                              )}
                              <div>
                                <p className="font-semibold text-sm">{asset.brand} {asset.model}</p>
                                <p className="text-[10px] text-muted-foreground">{asset.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{assetUnits.length} unit(s)</Badge>
                              <Button variant="outline" size="sm" className="gap-1 h-8 text-xs" onClick={() => handleOpenAddUnit(asset)}>
                                <Plus className="h-3 w-3" /> Add Unit
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditAsset(asset)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setConfirmType('asset'); setDeleteTargetId(asset.assetId); setConfirmOpen(true); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Units Table */}
                          {assetUnits.length > 0 && (
                            <div className="rounded-lg border overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/30">
                                    <TableHead className="text-xs">Serial / Tag</TableHead>
                                    <TableHead className="text-xs">Status</TableHead>
                                    <TableHead className="text-xs">Condition</TableHead>
                                    <TableHead className="text-xs">Current User</TableHead>
                                    <TableHead className="text-right text-xs">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {assetUnits.map(unit => (
                                    <TableRow key={unit.unitId}>
                                      <TableCell className="font-mono text-xs font-bold">{unit.assetTag}</TableCell>
                                      <TableCell>{getStatusBadge(unit.currentStatus)}</TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="text-[10px] capitalize">{unit.condition}</Badge>
                                      </TableCell>
                                      <TableCell className="text-xs">
                                        {unit.currentBorrowerName || <span className="text-muted-foreground italic">—</span>}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditUnit(asset, unit)}>
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setConfirmType('unit'); setDeleteTargetUnit(unit); setConfirmOpen(true); }}>
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}

                          {assetUnits.length === 0 && (
                            <p className="text-xs text-muted-foreground italic text-center py-2">No units registered yet. Click "Add Unit" to add serial numbers.</p>
                          )}
                        </div>
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Asset Dialog */}
      <Dialog open={isAssetDialogOpen} onOpenChange={(open) => { if (!open) resetAssetForm(); setIsAssetDialogOpen(open); }}>
        <DialogContent className="max-w-[95vw] md:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>{editingAsset ? 'Edit Asset' : 'Register New Asset'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Asset Type (Category)</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Brand</Label>
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Lenovo" />
              </div>
              <div className="grid gap-2">
                <Label>Model</Label>
                <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Thinkpad P15" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Specification</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="RAM, Processor, Storage, etc." />
            </div>
            <div className="grid gap-2">
              <Label>Asset Image</Label>
              <div className="flex flex-col gap-2">
                {imagePreview && (
                  <div className="relative w-full h-40 bg-muted rounded-lg overflow-hidden">
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                    <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-8 w-8" onClick={() => { setImageUrl(''); setImagePreview(''); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <input id="image" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <Button type="button" variant="outline" className="w-full gap-2" onClick={() => document.getElementById('image')?.click()}>
                  <Upload className="h-4 w-4" /> Upload Image
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={resetAssetForm}>Cancel</Button>
            <Button onClick={handleSaveAsset} disabled={!category || !brand || !model}>
              {editingAsset ? 'Update' : 'Register'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unit Dialog */}
      <Dialog open={isUnitDialogOpen} onOpenChange={(open) => { if (!open) resetUnitForm(); setIsUnitDialogOpen(open); }}>
        <DialogContent className="max-w-[95vw] md:max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p><strong>Asset:</strong> {selectedAsset?.brand} {selectedAsset?.model}</p>
              <p><strong>Category:</strong> {selectedAsset?.category}</p>
            </div>
            <div className="grid gap-2">
              <Label>Serial Number / Asset Tag</Label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={unitSerial}
                  onChange={(e) => setUnitSerial(e.target.value)}
                  placeholder="SN-001 / HF-001"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Condition</Label>
              <Select value={unitCondition} onValueChange={(val: any) => setUnitCondition(val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good / Functional</SelectItem>
                  <SelectItem value="damaged">Damaged / Broken</SelectItem>
                  <SelectItem value="lost">Lost / Missing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Notes (Optional)</Label>
              <Textarea value={unitNotes} onChange={(e) => setUnitNotes(e.target.value)} placeholder="Any remarks about this unit..." />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={resetUnitForm}>Cancel</Button>
            <Button onClick={handleSaveUnit} disabled={!unitSerial}>
              {editingUnit ? 'Update Unit' : 'Add Unit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmType === 'asset' ? "Delete Asset?" : "Delete Unit?"}
        description={
          confirmType === 'asset'
            ? "This will permanently delete the asset and all its units. This action cannot be undone."
            : `This will permanently remove unit ${deleteTargetUnit?.assetTag}. This action cannot be undone.`
        }
        onConfirm={handleConfirmDelete}
      />
  
    </div>
  );
}