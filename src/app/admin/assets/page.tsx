"use client"

import { useState, useEffect, useRef } from 'react';
import { Storage, Asset, AssetUnit, AssetCategory, CustodyRecord, User } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Pencil, Trash2, Search, Upload, Download, X, Tag, Settings2, Loader2, UserCheck, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import React from 'react';

export default function AssetManagement() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [units, setUnits] = useState<AssetUnit[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedUsageType, setSelectedUsageType] = useState('all');
  
  // Dialog konfirmasi padam
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<'asset' | 'unit' | 'category'>('asset');
  const [deleteTargetId, setDeleteTargetId] = useState('');
  const [deleteTargetUnit, setDeleteTargetUnit] = useState<AssetUnit | null>(null);

  // Asset Dialog State
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [usageType, setUsageType] = useState<'gunasama' | 'master'>('gunasama');

  // Unit Dialog State
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [editingUnit, setEditingUnit] = useState<AssetUnit | null>(null);
  const [unitSerial, setUnitSerial] = useState('');
  const [unitCondition, setUnitCondition] = useState<'good' | 'damaged' | 'lost'>('good');
  const [unitStatus, setUnitStatus] = useState<'available' | 'maintenance'>('available');
  const [unitNotes, setUnitNotes] = useState('');

  // Category Manager Dialog State
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Custody (Hak Jagaan) Dialog State
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isCustodyDialogOpen, setIsCustodyDialogOpen] = useState(false);
  const [custodyUnit, setCustodyUnit] = useState<AssetUnit | null>(null);
  const [custodyUserId, setCustodyUserId] = useState('');
  const [custodyUserSearch, setCustodyUserSearch] = useState('');
  const [isCustodyUserListOpen, setIsCustodyUserListOpen] = useState(false);
  const [custodyDate, setCustodyDate] = useState('');
  const [custodyLocation, setCustodyLocation] = useState('');
  const [custodyNotes, setCustodyNotes] = useState('');
  const [isAssigningCustody, setIsAssigningCustody] = useState(false);
  const isAssigningCustodyRef = useRef(false);

  // Loading / re-entrancy guards
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const isAddingCategoryRef = useRef(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const isDeletingCategoryRef = useRef(false);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const isUploadingCsvRef = useRef(false);
  const [isSavingAsset, setIsSavingAsset] = useState(false);
  const isSavingAssetRef = useRef(false);
  const isDeletingRef = useRef(false);
  const [isSavingUnit, setIsSavingUnit] = useState(false);
  const isSavingUnitRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [a, u, c, usr] = await Promise.all([
        Storage.getAssets(),
        Storage.getUnits(),
        Storage.getCategories(),
        Storage.getUsers()
      ]);
      setAssets(a);
      setUnits(u);
      setCategories(c);
      setAllUsers(usr);
    } catch {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal memuatkan data dari sistem." });
    }
  };

  // ─── 📁 LOGIK PENGURUSAN KATEGORI ───────────────────────────────────

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || isAddingCategoryRef.current) return;

    // Kemas kini format tulisan (Huruf besar pada huruf pertama)
    const formattedName = newCategoryName.trim().charAt(0).toUpperCase() + newCategoryName.trim().slice(1);

    if (categories.some(c => c.name.toLowerCase() === formattedName.toLowerCase())) {
      toast({ variant: "destructive", title: "Ralat", description: "Kategori ini sudah pun wujud." });
      return;
    }

    isAddingCategoryRef.current = true;
    setIsAddingCategory(true);
    try {
      const newCat: AssetCategory = {
        id: `cat-${Date.now()}`,
        name: formattedName,
        slug: formattedName.toLowerCase().replace(/\s+/g, '-'),
        addedDate: new Date().toISOString().split('T')[0]
      };

      const updatedCats = [...categories, newCat];
      await Storage.saveCategories(updatedCats);
      setCategories(updatedCats);
      setNewCategoryName('');
      toast({ title: "Berjaya", description: `Kategori "${formattedName}" telah didaftarkan.` });
    } catch {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal menyimpan kategori baru." });
    } finally {
      isAddingCategoryRef.current = false;
      setIsAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (isDeletingCategoryRef.current) return;

    // Sekat jika kategori sedang digunakan oleh mana-mana aset aktif
    const isBeingUsed = assets.some(a => a.category.toLowerCase() === catName.toLowerCase());
    if (isBeingUsed) {
      toast({
        variant: "destructive",
        title: "Tidak Boleh Dipadam",
        description: `Kategori "${catName}" gagal dipadam kerana masih mempunyai senarai aset terikat.`
      });
      return;
    }

    isDeletingCategoryRef.current = true;
    setDeletingCategoryId(catId);
    try {
      const updatedCats = categories.filter(c => c.id !== catId);
      await Storage.saveCategories(updatedCats);
      setCategories(updatedCats);
      toast({ variant: "destructive", title: "Dipadam", description: `Kategori "${catName}" dikeluarkan.` });
    } catch {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal memadam kategori." });
    } finally {
      isDeletingCategoryRef.current = false;
      setDeletingCategoryId(null);
    }
  };

  // ─── 📊 FUNGSI BULK UPLOAD CSV (KEMAS KINI TOTAL ANTI-CRASH) ─────────

  const handleDownloadTemplate = () => {
    const headers = "category,brand,model,description,serialNumbers,usageType\n";
    const sample = "Laptop,Dell,Latitude 5420,Laptop pejabat,SN-DELL-01;SN-DELL-02,gunasama\nMonitor,HP,24f,Monitor 24 inci,TAG-HP-99,master\n";
    
    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Template_Upload_Aset.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || isUploadingCsvRef.current) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({ variant: "destructive", title: "Format Salah", description: "Sila muat naik fail berformat CSV sahaja." });
      return;
    }

    isUploadingCsvRef.current = true;
    setIsUploadingCsv(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
          toast({ variant: "destructive", title: "Fail Kosong", description: "Sila masukkan data aset ke dalam template." });
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const todayStr = new Date().toISOString().split('T')[0];
        const timeStr = new Date().toISOString();

        let currentAssets = [...await Storage.getAssets()];
        let currentUnits = [...await Storage.getUnits()];
        let currentCategories = [...await Storage.getCategories()];

        let newAssetsCount = 0;
        let updatedAssetsCount = 0;
        let newUnitsCount = 0;
        let newCategoriesCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const currentLine = lines[i].split(',').map(val => val.trim());
          if (currentLine.length < 2) continue;

          const rawCategory = currentLine[headers.indexOf('category')] || 'Others';
          const categoryName = rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1).toLowerCase();
          const brand = currentLine[headers.indexOf('brand')] || '-';
          const model = currentLine[headers.indexOf('model')] || '-';
          const description = currentLine[headers.indexOf('description')] || '';
          
          const serialsRaw = currentLine[headers.indexOf('serialnumbers')] || '';
          const serialsList = serialsRaw.split(';').map(s => s.trim()).filter(s => s !== '');
          const incomingQty = serialsList.length;

          const usageTypeIdx = headers.indexOf('usagetype');
          const rawUsageType = usageTypeIdx !== -1 ? (currentLine[usageTypeIdx] || '').toLowerCase() : '';
          const rowUsageType: 'gunasama' | 'master' = rawUsageType === 'master' ? 'master' : 'gunasama';

          if (incomingQty > 0) {
            // 1. Semak & cipta kategori baru secara automatik jika tiada
            if (!currentCategories.some(c => c.name.toLowerCase() === categoryName.toLowerCase())) {
              currentCategories.push({
                id: `cat-${Date.now()}-${Math.random().toString().slice(2, 5)}`,
                name: categoryName,
                slug: categoryName.toLowerCase().replace(/\s+/g, '-'),
                addedDate: todayStr
              });
              newCategoriesCount++;
            }

            // 2. Cari penyepaduan aset sedia ada
            const existingAssetIdx = currentAssets.findIndex(
              a => a.category.toLowerCase() === categoryName.toLowerCase() &&
                   a.brand.toLowerCase() === brand.toLowerCase() &&
                   a.model.toLowerCase() === model.toLowerCase()
            );

            let targetAssetId = '';

            if (existingAssetIdx !== -1) {
              const existingAsset = currentAssets[existingAssetIdx];
              targetAssetId = existingAsset.assetId;
              
              currentAssets[existingAssetIdx] = {
                ...existingAsset,
                description: description || existingAsset.description,
                availableQty: (existingAsset.availableQty || 0) + incomingQty,
                lastUpdated: timeStr
              };
              updatedAssetsCount++;
            } else {
              targetAssetId = `a-${Date.now()}-${i}`;
              // Solusi unik: Letakkan timetag di assetTag baru untuk jaminan bebas ralat P2002 Prisma
              const uniqTag = `${brand}-${model}-${Date.now().toString().slice(-3)}-${i}`.replace(/\s+/g, '-').toUpperCase();
              
              currentAssets.push({
                assetId: targetAssetId,
                category: categoryName,
                brand,
                model,
                assetTag: uniqTag,
                description,
                imageUrl: '',
                status: 'available',
                availableQty: incomingQty,
                addedDate: todayStr,
                lastUpdated: timeStr,
                usageType: rowUsageType
              });
              newAssetsCount++;
            }

            // 3. Masukkan senarai Kod Siri baharu
            serialsList.forEach((serial, index) => {
              if (!currentUnits.some(u => u.assetTag.toLowerCase() === serial.toLowerCase())) {
                currentUnits.push({
                  unitId: `unit-${Date.now()}-${i}-${index}`,
                  assetId: targetAssetId,
                  assetName: `${brand} ${model}`,
                  assetTag: serial,
                  brand,
                  model,
                  category: categoryName,
                  condition: 'good',
                  currentStatus: 'available',
                  currentBorrowerId: '',
                  currentBorrowerName: '',
                  currentRequestId: '',
                  borrowHistory: '[]',
                  notes: 'Muat naik pukal (CSV)',
                  addedDate: todayStr
                });
                newUnitsCount++;
              }
            });
          }
        }

        // Simpan keseluruhan data serentak ke backend database
        await Storage.saveCategories(currentCategories);
        await Storage.saveAssets(currentAssets);
        await Storage.saveUnits(currentUnits);

        toast({ 
          title: "Muat Naik Berjaya", 
          description: `Kategori baru: ${newCategoriesCount} | Daftar aset: ${newAssetsCount} | Auto-Update: ${updatedAssetsCount} | Unit siri ditambah: ${newUnitsCount}.` 
        });

        if (fileInputRef.current) fileInputRef.current.value = '';
        await loadAll();

      } catch (error) {
        toast({ variant: "destructive", title: "Ralat", description: "Gagal memproses fail muat naik pukal." });
      } finally {
        isUploadingCsvRef.current = false;
        setIsUploadingCsv(false);
      }
    };
    reader.readAsText(file);
  };

  // ─── ASSET MANUAL HANDLERS ───────────────────────────────────────────

  const handleSaveAsset = async () => {
    if (isSavingAssetRef.current) return;
    if (!category || !brand || !model) {
      toast({ variant: "destructive", title: "Ralat", description: "Sila isi semua ruangan mandatori." });
      return;
    }
    isSavingAssetRef.current = true;
    setIsSavingAsset(true);
    try {
      const currentAssets = await Storage.getAssets();
      const currentUnits = await Storage.getUnits();

      if (editingAsset) {
        const updatedAssets = currentAssets.map(a =>
          a.assetId === editingAsset.assetId
            ? { ...a, category, brand, model, description, imageUrl, usageType, lastUpdated: new Date().toISOString().split('T')[0] }
            : a
        );
        await Storage.saveAssets(updatedAssets);

        const updatedUnits = currentUnits.map(u =>
          u.assetId === editingAsset.assetId
            ? { ...u, brand, model, category, assetName: `${brand} ${model}` }
            : u
        );
        await Storage.saveUnits(updatedUnits);
        toast({ title: "Berjaya Dikemaskini", description: `${brand} ${model} telah dikemas kini.` });
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
          lastUpdated: new Date().toISOString().split('T')[0],
          usageType
        };
        await Storage.saveAssets([...currentAssets, newAsset]);
        toast({ title: "Aset Didaftarkan", description: `${brand} ${model} berjaya didaftar. Sila masukkan nombor siri unit sekarang.` });
      }

      await loadAll();
      resetAssetForm();
    } catch {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal menyimpan rekod aset." });
    } finally {
      isSavingAssetRef.current = false;
      setIsSavingAsset(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    try {
      const currentUnits = await Storage.getUnits();
      if (currentUnits.some(u => u.assetId === assetId && u.currentStatus === 'borrowed')) {
        toast({ variant: "destructive", title: "Gagal Padam", description: "Aset ini mempunyai unit yang masih aktif dipinjam." });
        return;
      }
      if (currentUnits.some(u => u.assetId === assetId && u.currentStatus === 'assigned')) {
        toast({ variant: "destructive", title: "Gagal Padam", description: "Aset ini mempunyai unit di bawah Hak Jagaan staf. Sila tarik balik dahulu." });
        return;
      }
      const currentAssets = await Storage.getAssets();
      const updatedAssets = currentAssets.filter(a => a.assetId !== assetId);
      const updatedUnits = currentUnits.filter(u => u.assetId !== assetId);

      await Storage.saveAssets(updatedAssets);
      await Storage.saveUnits(updatedUnits);

      setAssets(updatedAssets);
      setUnits(updatedUnits);
      toast({ variant: "destructive", title: "Aset Dibuang", description: "Profil aset dan kesemua unit di bawahnya telah dipadam." });
    } catch {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal memadam aset." });
    }
  };

  const handleConfirmDelete = async () => {
    if (isDeletingRef.current) return;
    isDeletingRef.current = true;
    try {
      if (confirmType === 'asset') {
        await handleDeleteAsset(deleteTargetId);
      } else if (confirmType === 'unit' && deleteTargetUnit) {
        await handleDeleteUnit(deleteTargetUnit);
      }
    } finally {
      isDeletingRef.current = false;
      setConfirmOpen(false);
    }
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
    setUsageType('gunasama');
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
    setUsageType(asset.usageType === 'master' ? 'master' : 'gunasama');
    setIsAssetDialogOpen(true);
  };

  // ─── UNIT MANUAL HANDLERS ───────────────────────────────────────

  const handleOpenAddUnit = (asset: Asset) => {
    setSelectedAsset(asset);
    setEditingUnit(null);
    setUnitSerial('');
    setUnitCondition('good');
    setUnitStatus('available');
    setUnitNotes('');
    setIsUnitDialogOpen(true);
  };

  const handleOpenEditUnit = (asset: Asset, unit: AssetUnit) => {
    setSelectedAsset(asset);
    setEditingUnit(unit);
    setUnitSerial(unit.assetTag || '');
    setUnitCondition(unit.condition || 'good');
    setUnitStatus(unit.currentStatus === 'borrowed' || unit.currentStatus === 'assigned' ? 'available' : (unit.currentStatus as 'available' | 'maintenance') || 'available');
    setUnitNotes(unit.notes || '');
    setIsUnitDialogOpen(true);
  };

  const handleSaveUnit = async () => {
    if (isSavingUnitRef.current) return;
    if (!unitSerial || !selectedAsset) {
      toast({ variant: "destructive", title: "Ralat", description: "Sila masukkan nombor siri/tag aset." });
      return;
    }
    isSavingUnitRef.current = true;
    setIsSavingUnit(true);
    try {
      const currentUnits = await Storage.getUnits();
      const currentAssets = await Storage.getAssets();

      if (editingUnit) {
        const isBorrowed = editingUnit.currentStatus === 'borrowed' || editingUnit.currentStatus === 'assigned';
        const updatedUnits = currentUnits.map(u =>
          u.unitId === editingUnit.unitId
            ? {
                ...u,
                assetTag: unitSerial,
                condition: unitCondition,
                notes: unitNotes,
                currentStatus: (isBorrowed ? u.currentStatus : unitStatus) as any,
                ...(!isBorrowed && unitStatus !== 'available' && {
                  currentBorrowerId: '',
                  currentBorrowerName: '',
                  currentRequestId: ''
                })
              }
            : u
        );
        await Storage.saveUnits(updatedUnits);

        if (!isBorrowed) {
          const updatedAssetStatus = currentAssets.map(a =>
            a.assetId === editingUnit.assetId
              ? { ...a, status: (unitStatus === 'available' ? 'available' : 'maintenance') as any }
              : a
          );
          await Storage.saveAssets(updatedAssetStatus);
        }

        toast({ title: "Unit Dikemaskini", description: `Serial ${unitSerial} berjaya disimpan.` });
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

        const updatedAssets = currentAssets.map(a =>
          a.assetId === selectedAsset.assetId
            ? { ...a, availableQty: (a.availableQty || 0) + 1, status: 'available' as const }
            : a
        );
        await Storage.saveAssets(updatedAssets);
        toast({ title: "Unit Ditambah", description: `Serial ${unitSerial} berjaya diletakkan di bawah model ${selectedAsset.brand}.` });
      }

      await loadAll();
      resetUnitForm();
    } catch {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal menyimpan unit." });
    } finally {
      isSavingUnitRef.current = false;
      setIsSavingUnit(false);
    }
  };

  const handleDeleteUnit = async (unit: AssetUnit) => {
    if (unit.currentStatus === 'borrowed') {
      toast({ variant: "destructive", title: "Gagal", description: "Unit ini sedang aktif dipinjam." });
      return;
    }
    if (unit.currentStatus === 'assigned') {
      toast({ variant: "destructive", title: "Gagal", description: "Unit ini berada di bawah Hak Jagaan staf. Sila tarik balik dahulu." });
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
      toast({ variant: "destructive", title: "Unit Dipadam", description: `Serial ${unit.assetTag} dibuang.` });
    } catch {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal mengosongkan unit." });
    }
  };

  // ─── HAK JAGAAN (CUSTODY) HANDLERS ───────────────────────────────

  const handleOpenCustody = (unit: AssetUnit) => {
    setCustodyUnit(unit);
    setCustodyUserId('');
    setCustodyUserSearch('');
    setIsCustodyUserListOpen(false);
    setCustodyDate(new Date().toISOString().split('T')[0]);
    setCustodyLocation('');
    setCustodyNotes('');
    setIsCustodyDialogOpen(true);
  };

  const resetCustodyForm = () => {
    setIsCustodyDialogOpen(false);
    setCustodyUnit(null);
    setCustodyUserId('');
    setCustodyUserSearch('');
    setIsCustodyUserListOpen(false);
    setCustodyDate('');
    setCustodyLocation('');
    setCustodyNotes('');
  };

  const handleAssignCustody = async () => {
    if (isAssigningCustodyRef.current) return;
    if (!custodyUnit || !custodyUserId || !custodyDate || !user) {
      toast({ variant: "destructive", title: "Ralat", description: "Sila pilih staf dan tarikh mula jagaan." });
      return;
    }
    isAssigningCustodyRef.current = true;
    setIsAssigningCustody(true);
    try {
      const targetUser = allUsers.find(u => u.uid === custodyUserId);
      if (!targetUser) throw new Error('user not found');

      const custodyId = `cust-${Date.now()}`;
      const newRecord: CustodyRecord = {
        custodyId,
        unitId: custodyUnit.unitId,
        assetId: custodyUnit.assetId,
        assetName: custodyUnit.assetName,
        assetTag: custodyUnit.assetTag,
        userId: targetUser.uid,
        userName: targetUser.name,
        userDept: targetUser.department,
        assignedBy: user.name,
        assignedDate: custodyDate,
        status: 'active',
        location: custodyLocation.trim() || undefined,
        notes: custodyNotes.trim() || undefined,
      };

      const currentRecords = await Storage.getCustodyRecords();
      await Storage.saveCustodyRecords([...currentRecords, newRecord]);

      const currentUnits = await Storage.getUnits();
      await Storage.saveUnits(currentUnits.map(u =>
        u.unitId === custodyUnit.unitId
          ? { ...u, currentStatus: 'assigned' as const, currentBorrowerId: targetUser.uid, currentBorrowerName: targetUser.name, currentRequestId: custodyId, assignedDate: custodyDate }
          : u
      ));

      const currentAssets = await Storage.getAssets();
      await Storage.saveAssets(currentAssets.map(a =>
        a.assetId === custodyUnit.assetId
          ? { ...a, availableQty: Math.max(0, (a.availableQty || 1) - 1) }
          : a
      ));

      toast({ title: "Hak Jagaan Diberikan", description: `${custodyUnit.assetTag} kini di bawah jagaan ${targetUser.name}.` });
      await loadAll();
      resetCustodyForm();
    } catch {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal memberi hak jagaan." });
    } finally {
      isAssigningCustodyRef.current = false;
      setIsAssigningCustody(false);
    }
  };

  const custodyStaffOptions = allUsers.filter(u =>
    (u.name || '').toLowerCase().includes(custodyUserSearch.toLowerCase()) ||
    (u.department || '').toLowerCase().includes(custodyUserSearch.toLowerCase())
  );

  const resetUnitForm = () => {
    setUnitSerial(''); setUnitCondition('good'); setUnitStatus('available'); setUnitNotes('');
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
    const matchesCategory = selectedCategory === 'all' || a.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesUsageType = selectedUsageType === 'all' || (a.usageType || 'gunasama') === selectedUsageType;
    return matchesSearch && matchesCategory && matchesUsageType;
  });

  // Susun pengelompokan accordion secara dinamik berdasarkan senarai kategori pangkalan data terkini
  const groupedAssets = categories.reduce((acc, cat) => {
    const catAssets = filteredAssets.filter(a => a.category.toLowerCase() === cat.name.toLowerCase());
    if (catAssets.length > 0) acc[cat.name] = catAssets;
    return acc;
  }, {} as Record<string, Asset[]>);

  const getUnitsByAsset = (assetId: string) => units.filter(u => u.assetId === assetId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available': return <Badge className="bg-green-500 text-[10px]">Available</Badge>;
      case 'borrowed': return <Badge className="bg-blue-500 text-[10px]">Borrowed</Badge>;
      case 'maintenance': return <Badge className="bg-orange-500 text-[10px]">Maintenance</Badge>;
      case 'assigned': return <Badge className="bg-purple-600 text-[10px]">Hak Jagaan</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">Asset Management</h1>
          <p className="text-sm text-muted-foreground">Register assets and manage individual unit serial numbers.</p>
        </div>
        <div className="flex flex-wrap w-full md:w-auto gap-2">
          <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          
          <Button variant="outline" className="flex-1 md:flex-none gap-2" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4" /> Template CSV
          </Button>
          
          <Button
            variant="outline"
            className="flex-1 md:flex-none gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            disabled={isUploadingCsv}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploadingCsv ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isUploadingCsv ? 'Uploading...' : 'Upload CSV'}
          </Button>
          
          <Button className="w-full md:w-auto gap-2" onClick={() => setIsAssetDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Register New Asset
          </Button>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
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
                  {categories.map(cat => <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Select value={selectedUsageType} onValueChange={setSelectedUsageType}>
                <SelectTrigger><SelectValue placeholder="Semua Jenis" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  <SelectItem value="gunasama">Gunasama</SelectItem>
                  <SelectItem value="master">Aset Master</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ACCORDION DATA JADUAL */}
      <Card className="shadow-md">
        <CardContent className="p-0">
          {Object.keys(groupedAssets).length === 0 ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground">No assets found.</div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {Object.entries(groupedAssets).map(([catName, catAssets]) => (
                <AccordionItem key={catName} value={catName} className="border-b last:border-b-0">
                  <AccordionTrigger className="hover:no-underline px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">{catName}</span>
                      <Badge variant="outline" className="text-xs">{catAssets.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 py-0">
                    {catAssets.map(asset => {
                      const assetUnits = getUnitsByAsset(asset.assetId);
                      return (
                        <div key={asset.assetId} className="border-t px-6 py-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {asset.imageUrl && <img src={asset.imageUrl} alt={asset.model} className="w-10 h-10 object-cover rounded" />}
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-sm">{asset.brand} {asset.model}</p>
                                  {asset.usageType === 'master' ? (
                                    <Badge className="bg-purple-600 text-[10px]">Aset Master</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px]">Gunasama</Badge>
                                  )}
                                </div>
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
                                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{unit.condition}</Badge></TableCell>
                                      <TableCell className="text-xs">{unit.currentBorrowerName || <span className="text-muted-foreground italic">—</span>}</TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                          {asset.usageType === 'master' && unit.currentStatus === 'available' && unit.condition === 'good' && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-7 text-[10px] gap-1 text-purple-700 border-purple-300 hover:bg-purple-50"
                                              onClick={() => handleOpenCustody(unit)}
                                            >
                                              <UserCheck className="h-3 w-3" /> Beri Hak Jagaan
                                            </Button>
                                          )}
                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditUnit(asset, unit)}><Pencil className="h-3 w-3" /></Button>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setConfirmType('unit'); setDeleteTargetUnit(unit); setConfirmOpen(true); }}><Trash2 className="h-3 w-3" /></Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
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

      {/* ASSET DIALOG */}
      <Dialog open={isAssetDialogOpen} onOpenChange={(open) => { if (!open) resetAssetForm(); setIsAssetDialogOpen(open); }}>
        <DialogContent className="max-w-[95vw] md:max-w-md rounded-xl">
          <DialogHeader><DialogTitle>{editingAsset ? 'Edit Asset' : 'Register New Asset'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label>Asset Type (Category)</Label>
                {/* TOMBOL MODAL URUS CUSTOM CATEGORY */}
                <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs gap-1" onClick={() => setIsCategoryManagerOpen(true)}>
                  <Settings2 className="h-3 w-3" /> Urus Kategori
                </Button>
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori..." /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Jenis Aset</Label>
              <Select value={usageType} onValueChange={(val: any) => setUsageType(val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gunasama">Gunasama (Pinjaman)</SelectItem>
                  <SelectItem value="master">Aset Master (Hak Jagaan)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Aset Master tidak dipaparkan dalam katalog pinjaman staf. Ia hanya boleh diserahkan sebagai Hak Jagaan oleh admin.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Brand</Label><Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Lenovo" /></div>
              <div className="grid gap-2"><Label>Model</Label><Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Thinkpad P15" /></div>
            </div>
            <div className="grid gap-2"><Label>Specification</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="RAM, Processor, Storage, dll." /></div>
            <div className="grid gap-2">
              <Label>Asset Image</Label>
              <div className="flex flex-col gap-2">
                {imagePreview && (
                  <div className="relative w-full h-40 bg-muted rounded-lg overflow-hidden">
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                    <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-8 w-8" onClick={() => { setImageUrl(''); setImagePreview(''); }}><X className="h-4 w-4" /></Button>
                  </div>
                )}
                <input id="image" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <Button type="button" variant="outline" className="w-full gap-2" onClick={() => document.getElementById('image')?.click()}><Upload className="h-4 w-4" /> Upload Image</Button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={resetAssetForm} disabled={isSavingAsset}>Cancel</Button>
            <Button onClick={handleSaveAsset} disabled={!category || !brand || !model || isSavingAsset} className="gap-2">
              {isSavingAsset && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSavingAsset ? 'Saving...' : (editingAsset ? 'Update' : 'Register')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG DINAMIK URUS KATEGORI (MANAGE CUSTOM CATEGORIES) */}
      <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-sm rounded-xl">
          <DialogHeader><DialogTitle>Pengurusan Kategori Aset</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input placeholder="Nama kategori baru..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
              <Button size="sm" onClick={handleAddCategory} disabled={isAddingCategory} className="gap-1">
                {isAddingCategory && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isAddingCategory ? 'Menambah...' : 'Tambah'}
              </Button>
            </div>
            <Label className="text-xs text-muted-foreground uppercase">Senarai Kategori Aktif</Label>
            <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
              {categories.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground py-4">Tiada kategori dikesan.</p>
              ) : (
                categories.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center p-2 px-3 text-sm">
                    <span>{cat.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:bg-red-50"
                      disabled={deletingCategoryId === cat.id}
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    >
                      {deletingCategoryId === cat.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter><Button variant="outline" size="sm" onClick={() => setIsCategoryManagerOpen(false)}>Selesai</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UNIT DIALOG */}
      <Dialog open={isUnitDialogOpen} onOpenChange={(open) => { if (!open) resetUnitForm(); setIsUnitDialogOpen(open); }}>
        <DialogContent className="max-w-[95vw] md:max-w-sm rounded-xl">
          <DialogHeader><DialogTitle>{editingUnit ? 'Edit Unit' : 'Add New Unit'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p><strong>Asset:</strong> {selectedAsset?.brand} {selectedAsset?.model}</p>
              <p><strong>Category:</strong> {selectedAsset?.category}</p>
            </div>
            <div className="grid gap-2">
              <Label>Serial Number / Asset Tag</Label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" value={unitSerial} onChange={(e) => setUnitSerial(e.target.value)} placeholder="SN-001 / HF-001" />
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
            {editingUnit && (
              <div className="grid gap-2">
                <Label>Inventory Status</Label>
                <Select
                  value={unitStatus}
                  onValueChange={(val: any) => setUnitStatus(val)}
                  disabled={editingUnit.currentStatus === 'borrowed' || editingUnit.currentStatus === 'assigned'}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="maintenance">Under Maintenance</SelectItem>
                  </SelectContent>
                </Select>
                {editingUnit.currentStatus === 'borrowed' && (
                  <p className="text-[10px] text-muted-foreground italic">Unit is currently borrowed.</p>
                )}
                {editingUnit.currentStatus === 'assigned' && (
                  <p className="text-[10px] text-muted-foreground italic">Unit ini di bawah Hak Jagaan.</p>
                )}
              </div>
            )}
            <div className="grid gap-2"><Label>Notes (Optional)</Label><Textarea value={unitNotes} onChange={(e) => setUnitNotes(e.target.value)} placeholder="Any remarks..." /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={resetUnitForm} disabled={isSavingUnit}>Cancel</Button>
            <Button onClick={handleSaveUnit} disabled={!unitSerial || isSavingUnit} className="gap-2">
              {isSavingUnit && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSavingUnit ? 'Saving...' : (editingUnit ? 'Update Unit' : 'Add Unit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG BERI HAK JAGAAN */}
      <Dialog open={isCustodyDialogOpen} onOpenChange={(open) => { if (!open) resetCustodyForm(); else setIsCustodyDialogOpen(open); }}>
        <DialogContent className="max-w-[95vw] md:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Beri Hak Jagaan Aset</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg text-sm">
              <p><strong>Aset:</strong> {custodyUnit?.assetName}</p>
              <p><strong>Tag:</strong> <code className="font-mono text-xs">{custodyUnit?.assetTag}</code></p>
            </div>

            <div className="grid gap-2 relative">
              <Label>Pilih Staf</Label>
              <div className="relative">
                <Input
                  placeholder="Taip nama atau jabatan staf untuk mencari..."
                  value={custodyUserSearch}
                  onChange={(e) => {
                    setCustodyUserSearch(e.target.value);
                    setIsCustodyUserListOpen(true);
                    if (custodyUserId) setCustodyUserId('');
                  }}
                  onFocus={() => setIsCustodyUserListOpen(true)}
                  className="pr-8"
                />
                {custodyUserId ? (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => { setCustodyUserId(''); setCustodyUserSearch(''); setIsCustodyUserListOpen(true); }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                )}
              </div>

              {isCustodyUserListOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsCustodyUserListOpen(false)} />
                  <div className="absolute z-50 top-[100%] left-0 right-0 max-h-48 overflow-y-auto bg-background border rounded-lg shadow-lg mt-1 p-1 divide-y divide-muted/50">
                    {custodyStaffOptions.length === 0 ? (
                      <div className="text-xs text-muted-foreground p-3 text-center">Tiada nama staf ditemui</div>
                    ) : (
                      custodyStaffOptions.map(u => (
                        <div
                          key={u.uid}
                          className={`text-xs p-2.5 cursor-pointer rounded-md transition-colors flex items-center justify-between ${
                            custodyUserId === u.uid ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted/80 text-foreground"
                          }`}
                          onClick={() => {
                            setCustodyUserId(u.uid);
                            setCustodyUserSearch(`${u.name} (${u.department})`);
                            setIsCustodyUserListOpen(false);
                          }}
                        >
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className={`text-[10px] ${custodyUserId === u.uid ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              {u.jawatan || 'Tiada Jawatan'} • {u.department}
                            </p>
                          </div>
                          {custodyUserId === u.uid && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Tarikh Mula Jagaan</Label>
              <Input type="date" value={custodyDate} onChange={(e) => setCustodyDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Lokasi Penempatan (Pilihan)</Label>
              <Input value={custodyLocation} onChange={(e) => setCustodyLocation(e.target.value)} placeholder="Contoh: Bilik Server, Aras 2" />
            </div>
            <div className="grid gap-2">
              <Label>Catatan (Pilihan)</Label>
              <Textarea value={custodyNotes} onChange={(e) => setCustodyNotes(e.target.value)} placeholder="Sebarang catatan tambahan..." />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={resetCustodyForm} disabled={isAssigningCustody}>Batal</Button>
            <Button
              onClick={handleAssignCustody}
              disabled={!custodyUserId || !custodyDate || isAssigningCustody}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              {isAssigningCustody && <Loader2 className="h-4 w-4 animate-spin" />}
              {isAssigningCustody ? 'Memproses...' : 'Sahkan Hak Jagaan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmType === 'asset' ? "Delete Asset?" : "Delete Unit?"}
        description={confirmType === 'asset' ? "This will permanently delete the asset and all its units." : `This will permanently remove unit ${deleteTargetUnit?.assetTag}.`}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}