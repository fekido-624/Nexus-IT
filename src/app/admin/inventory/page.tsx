"use client"

import { useState, useEffect } from 'react';
import { Storage, AssetUnit, Asset, AssetCategory } from '@/lib/storage';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Search, Pencil, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';

export default function UnitInventory() {
  const [units, setUnits] = useState<AssetUnit[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]); // STATE BARU: Simpan kategori dari DB
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Dialog States
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<AssetUnit | null>(null);

  const { toast } = useToast();

  // Edit Form State
  const [condition, setCondition] = useState<'good' | 'damaged' | 'lost'>('good');
  const [status, setStatus] = useState<'available' | 'maintenance'>('available');
  const [notes, setNotes] = useState('');
  const [editAssetId, setEditAssetId] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [loadedUnits, loadedAssets, loadedCategories] = await Promise.all([
          Storage.getUnits(),
          Storage.getAssets(),
          Storage.getCategories() // Ambil kategori dinamik
        ]);
        setUnits(loadedUnits);
        setAssets(loadedAssets);
        setCategories(loadedCategories || []);
      } catch (error) {
        console.error('Failed to load data:', error);
        toast({ variant: "destructive", title: "Error", description: "Failed to load data" });
      }
    }
    loadData();
  }, [toast]);

  const handleUpdateUnit = async () => {
    if (!editingUnit) return;

    try {
      const newStatus = status;

      const updatedUnits = units.map(u => {
        if (u.unitId === editingUnit.unitId) {
          return {
            ...u,
            condition,
            currentStatus: newStatus as any,
            notes,
            ...(newStatus !== 'available' && {
              currentBorrowerId: '',
              currentBorrowerName: '',
              currentRequestId: ''
            })
          };
        }
        return u;
      });

      await Storage.saveUnits(updatedUnits);
      setUnits(updatedUnits);

      const allAssets = await Storage.getAssets();
      const updatedAssets = allAssets.map(a => {
        if (a.assetId === editingUnit.assetId) {
          return { ...a, status: (newStatus === 'available' ? 'available' : 'maintenance') as any };
        }
        return a;
      });
      await Storage.saveAssets(updatedAssets);

      toast({ title: "Unit Updated", description: `Record for ${editingUnit.assetTag} has been saved.` });
      resetForm();
    } catch (error) {
      console.error('Failed to update unit:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update unit" });
    }
  };

  const resetForm = () => {
    setCondition('good');
    setStatus('available');
    setNotes('');
    setEditAssetId('');  
    setEditingUnit(null);
    setIsEditDialogOpen(false);
  };

  const handleOpenEdit = (unit: AssetUnit) => {
    setEditingUnit(unit);
    setCondition(unit.condition || 'good');
    setStatus((unit.currentStatus as string) === 'borrowed' ? 'available' : (unit.currentStatus as any || 'available'));
    setNotes(unit.notes || '');
    setEditAssetId(unit.assetId || '');
    setIsEditDialogOpen(true);
  };

  const filteredUnits = units.filter(u => {
    const term = searchTerm.toLowerCase();
    const tag = (u.assetTag || "").toLowerCase();
    const name = (u.assetName || "").toLowerCase();
    const cat = (u.category || "").toLowerCase();
    
    const matchesSearch = tag.includes(term) || name.includes(term) || cat.includes(term);
    const matchesCategory = selectedCategory === 'all' || u.category.toLowerCase() === selectedCategory.toLowerCase();
    
    return matchesSearch && matchesCategory;
  });

  // ─── PENJANAAN KUMPULAN ACCORDION SECARA DINAMIK ───────────────────
  const groupedUnits = categories.reduce((acc, cat) => {
    const catUnits = filteredUnits.filter(u => u.category.toLowerCase() === cat.name.toLowerCase());
    if (catUnits.length > 0) {
      acc[cat.name] = catUnits;
    }
    return acc;
  }, {} as Record<string, AssetUnit[]>);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available': return <Badge className="bg-green-500">Available</Badge>;
      case 'borrowed': return <Badge className="bg-blue-500">Borrowed</Badge>;
      case 'maintenance': return <Badge className="bg-orange-500 flex items-center gap-1"><Wrench className="h-3 w-3" /> Maintenance</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderUnitTable = (unitsToRender: AssetUnit[]) => (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead>Asset Tag</TableHead>
          <TableHead>Asset Details</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Condition</TableHead>
          <TableHead>Current User</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {unitsToRender.map((unit) => (
          <TableRow key={unit.unitId}>
            <TableCell className="font-bold">{unit.assetTag}</TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span className="font-medium">{unit.assetName}</span>
                <span className="text-[10px] text-muted-foreground">{unit.category}</span>
              </div>
            </TableCell>
            <TableCell>{getStatusBadge(unit.currentStatus)}</TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize">{unit.condition}</Badge>
            </TableCell>
            <TableCell>
              {unit.currentBorrowerName || <span className="text-muted-foreground italic text-xs">None</span>}
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(unit)}>
                <Pencil className="h-4 w-4" />
              </Button>
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
          <h1 className="text-3xl font-bold tracking-tight text-primary">Unit Inventory</h1>
          <p className="text-muted-foreground">Monitor and update maintenance status for individual units.</p>
        </div>
      </div>

      <Card className="shadow-md">
        <CardHeader className="pb-3 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by tag or asset name..." 
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
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {Object.keys(groupedUnits).length === 0 ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No units in inventory.
            </div>
          ) : (
            <Accordion type="single" collapsible defaultValue={Object.keys(groupedUnits)[0]} className="w-full">
              {Object.entries(groupedUnits).map(([categoryName, catUnits]) => (
                <AccordionItem key={categoryName} value={categoryName} className="border-b last:border-b-0">
                  <AccordionTrigger className="hover:no-underline px-6 py-4 flex justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">{categoryName}</span>
                      <Badge variant="outline" className="text-xs">
                        {catUnits.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 py-0">
                    {renderUnitTable(catUnits)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Edit Maintenance Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Maintenance / Condition</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="bg-muted/50 p-3 rounded-lg text-sm mb-2">
              <div className="grid gap-2 mb-2">
                <Label>Parent Asset</Label>
                <Select value={editAssetId} onValueChange={setEditAssetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent asset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map(a => (
                      <SelectItem key={a.assetId} value={a.assetId}>
                        {a.brand} {a.model} ({a.assetId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p><strong>Asset:</strong> {editingUnit?.assetName}</p>
              <p><strong>Tag:</strong> {editingUnit?.assetTag}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Physical Condition</Label>
                <Select value={condition} onValueChange={(val: any) => setCondition(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good / Functional</SelectItem>
                    <SelectItem value="damaged">Damaged / Broken</SelectItem>
                    <SelectItem value="lost">Lost / Missing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Inventory Status</Label>
                <Select 
                  value={status} 
                  onValueChange={(val: any) => setStatus(val)}
                  disabled={false}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="maintenance">Under Maintenance</SelectItem>
                  </SelectContent>
                </Select>
                {editingUnit?.currentStatus === 'borrowed' && (
                  <p className="text-[10px] text-muted-foreground italic">Unit is currently borrowed.</p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Maintenance Notes</Label>
              <Textarea 
                id="edit-notes" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="Remarks about the unit's condition..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleUpdateUnit}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}