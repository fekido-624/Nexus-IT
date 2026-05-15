
"use client"

import { useState, useEffect } from 'react';
import { Storage, Asset, AssetUnit } from '@/lib/storage';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Package, Plus, Pencil, Trash2, Search, Tag, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const CATEGORIES = ['Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Projector', 'Printer', 'Networking', 'UPS', 'Others'];

export default function AssetManagement() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const { toast } = useToast();

  // Form State initialized with empty strings to prevent uncontrolled input warnings
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    async function loadAssets() {
      try {
        const loadedAssets = await Storage.getAssets();
        setAssets(loadedAssets);
      } catch (error) {
        console.error('Failed to load assets:', error);
        toast({ variant: "destructive", title: "Error", description: "Failed to load assets" });
      }
    }
    loadAssets();
  }, [toast]);

  const handleSave = async () => {
    if (!category || !brand || !model || !assetTag) {
      toast({ variant: "destructive", title: "Error", description: "Please fill in all mandatory fields." });
      return;     
    }

    try {
      const currentAssets = await Storage.getAssets();
      const currentUnits = await Storage.getUnits();
      
      if (editingAsset) {
        // Update existing asset
        const updatedAssets = currentAssets.map(a => 
          a.assetId === editingAsset.assetId 
            ? { ...a, category, brand, model, assetTag, description, imageUrl, lastUpdated: new Date().toISOString().split('T')[0] } 
            : a
        );
        await Storage.saveAssets(updatedAssets);
        setAssets(updatedAssets);

        // Update corresponding unit record
        const updatedUnits = currentUnits.map(u => 
          u.assetId === editingAsset.assetId 
            ? { ...u, brand, model, category, assetTag, assetName: `${brand} ${model}` } 
            : u
        );
        await Storage.saveUnits(updatedUnits);

        toast({ title: "Asset Updated", description: `${brand} ${model} has been updated.` });
      } else {
        // Create new Asset & Unit
        const assetId = `a-${Date.now()}`;
        const newAsset: Asset = {
          assetId,
          category,
          brand,
          model,
          assetTag,
          description,
          imageUrl,
          status: 'available',
          availableQty: 1,
          addedDate: new Date().toISOString().split('T')[0],
          lastUpdated: new Date().toISOString().split('T')[0]
        };

        const newUnit: AssetUnit = {
          unitId: `unit-${Date.now()}`,
          assetId: assetId,
          assetName: `${brand} ${model}`,
          assetTag: assetTag,
          brand: brand,
          model: model,
          category: category,
          condition: 'good',
          currentStatus: 'available',
          currentBorrowerId: '',
          currentBorrowerName: '',
          currentRequestId: '',
          borrowHistory: '[]',
          notes: '',
          addedDate: new Date().toISOString().split('T')[0]
        };

        await Storage.saveAssets([...currentAssets, newAsset]);
        await Storage.saveUnits([...currentUnits, newUnit]);
        setAssets([...currentAssets, newAsset]);
        
        toast({ title: "Asset Registered", description: `New asset ${brand} ${model} with tag ${assetTag} added.` });
      }

      resetForm();
    } catch (error) {
      console.error('Failed to save asset:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save asset" });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImageUrl(base64String);
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setCategory('');
    setBrand('');
    setModel('');
    setAssetTag('');
    setDescription('');
    setImageUrl('');
    setImagePreview('');
    setEditingAsset(null);
    setIsAddDialogOpen(false);
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setCategory(asset.category || '');
    setBrand(asset.brand || '');
    setModel(asset.model || '');
    setAssetTag(asset.assetTag || '');
    setDescription(asset.description || '');
    setImageUrl(asset.imageUrl || '');
    setImagePreview(asset.imageUrl || '');
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const currentAssets = await Storage.getAssets();
      const currentUnits = await Storage.getUnits();
      
      // Check if borrowed
      const unit = currentUnits.find(u => u.assetId === id);
      if (unit && unit.currentStatus === 'borrowed') {
        toast({ variant: "destructive", title: "Cannot Delete", description: "Asset is currently being borrowed." });
        return;
      }

      const updatedAssets = currentAssets.filter(a => a.assetId !== id);
      const updatedUnits = currentUnits.filter(u => u.assetId !== id);
      
      await Storage.saveAssets(updatedAssets);
      await Storage.saveUnits(updatedUnits);
      setAssets(updatedAssets);
      toast({ variant: "destructive", title: "Asset Removed", description: "The asset has been deleted from records." });
    } catch (error) {
      console.error('Failed to delete asset:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete asset" });
    }
  };

  const filteredAssets = assets.filter(a => {
    const term = searchTerm.toLowerCase();
    const brandStr = (a.brand || "").toLowerCase();
    const modelStr = (a.model || "").toLowerCase();
    const tagStr = (a.assetTag || "").toLowerCase();
    const catStr = (a.category || "").toLowerCase();
    
    const matchesSearch = brandStr.includes(term) || modelStr.includes(term) || tagStr.includes(term) || catStr.includes(term);
    const matchesCategory = selectedCategory === 'all' || !selectedCategory || a.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const groupedAssets = CATEGORIES.reduce((acc, cat) => {
    const catAssets = filteredAssets.filter(a => a.category === cat);
    if (catAssets.length > 0) {
      acc[cat] = catAssets;
    }
    return acc;
  }, {} as Record<string, Asset[]>);

  const renderAssetTable = (assets: Asset[]) => (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead>Asset Tag</TableHead>
          <TableHead className="hidden md:table-cell">Description</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assets.map((asset) => (
          <TableRow key={asset.assetId}>
            <TableCell className="font-bold">
              <div className="flex flex-col">
                <span className="text-xs md:text-sm">{asset.assetTag}</span>
                <span className="text-[10px] text-muted-foreground font-normal">{asset.brand} {asset.model}</span>
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell text-xs max-w-[150px] truncate">{asset.description}</TableCell>
            <TableCell>
              <Badge variant={asset.status === 'available' ? 'default' : 'secondary'} className="text-[10px]">
                {asset.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(asset)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(asset.assetId)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">Asset Management</h1>
          <p className="text-sm text-muted-foreground">Register and manage individual IT assets.</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { if(!open) resetForm(); setIsAddDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto gap-2">
              <Plus className="h-4 w-4" /> Register New Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] md:max-w-md rounded-xl">
            <DialogHeader>
              <DialogTitle>{editingAsset ? 'Edit Asset' : 'Register New Asset'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Asset Type (Category)</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Dell" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="model">Model</Label>
                  <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Lat 5420" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tag">Asset Tag / Serial</Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="tag" className="pl-9" value={assetTag} onChange={(e) => setAssetTag(e.target.value)} placeholder="DEPT-LAP-001" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc">Specification</Label>
                <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="RAM, Processor, etc." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="image">Asset Image</Label>
                <div className="flex flex-col gap-2">
                  {imagePreview && (
                    <div className="relative w-full h-40 bg-muted rounded-lg overflow-hidden">
                      <img 
                        src={imagePreview} 
                        alt="preview" 
                        className="w-full h-full object-cover"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={() => {
                          setImageUrl('');
                          setImagePreview('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => document.getElementById('image')?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      Upload Image
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleSave} disabled={!category || !brand || !model || !assetTag}>
                {editingAsset ? 'Update' : 'Register'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-md">
        <CardHeader className="pb-3 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search assets..." 
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {Object.keys(groupedAssets).length === 0 ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No assets found.
            </div>
          ) : (
            <Accordion type="single" collapsible defaultValue={Object.keys(groupedAssets)[0]} className="w-full">
              {Object.entries(groupedAssets).map(([category, catAssets]) => (
                <AccordionItem key={category} value={category} className="border-b last:border-b-0">
                  <AccordionTrigger className="hover:no-underline px-6 py-4 flex justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">{category}</span>
                      <Badge variant="outline" className="text-xs">
                        {catAssets.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 py-0">
                    {renderAssetTable(catAssets)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
