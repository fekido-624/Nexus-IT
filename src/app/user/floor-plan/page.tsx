"use client"

import { useState, useEffect } from 'react';
import { Storage, FloorPlan, FloorZone } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, User as UserIcon, Network, Search, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FloorPlanCanvas } from '@/components/floor-plan/floor-plan-canvas';
import { FloorPlanTabs } from '@/components/floor-plan/floor-plan-tabs';
import { parsePortNumbers } from '@/lib/utils';

export default function UserFloorPlanPage() {
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [activeFloorPlanId, setActiveFloorPlanId] = useState<string | null>(null);
  const [zones, setZones] = useState<FloorZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<FloorZone | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

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
    async function loadData() {
      try {
        await Storage.init();
        const [plans, z] = await Promise.all([Storage.getFloorPlans(), Storage.getFloorZones()]);
        setFloorPlans(plans);
        setZones(z);
        setActiveFloorPlanId(plans[0]?.id ?? null);
      } catch {
        toast({ variant: "destructive", title: "Ralat", description: "Gagal memuatkan pelan lantai." });
      }
    }
    loadData();
  }, [toast]);

  useEffect(() => {
    if (!searchTerm.trim() || matchingZones.length === 0) return;
    const hasMatchInActive = matchingZones.some((z) => z.floorPlanId === activeFloorPlanId);
    if (!hasMatchInActive) {
      setActiveFloorPlanId(matchingZones[0].floorPlanId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">Floor Plan</h1>
        <p className="text-sm text-muted-foreground">Peta pejabat — klik meja/bilik untuk lihat siapa duduk dan no. port internet.</p>
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
        <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed border-muted/60">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
          <p className="text-base font-semibold text-muted-foreground">Pelan lantai belum dimuat naik oleh admin.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-4">
            <FloorPlanCanvas
              imageUrl={activeFloorPlan.imageUrl}
              zones={activeZones}
              editable={false}
              onZoneClick={setSelectedZone}
              highlightedZoneIds={searchTerm.trim() ? matchingZoneIds : undefined}
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedZone} onOpenChange={(open) => !open && setSelectedZone(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle>{selectedZone?.label}</DialogTitle>
            <DialogDescription>Maklumat kedudukan pejabat</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <UserIcon className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Staf</p>
                {selectedZone?.assignedUserName ? (
                  <p className="text-sm font-medium">{selectedZone.assignedUserName}</p>
                ) : (
                  <Badge variant="outline">Kosong / Vacant</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Network className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">No. Port Internet</p>
                {selectedZone && parsePortNumbers(selectedZone.portNumber).length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {parsePortNumbers(selectedZone.portNumber).map((port) => (
                      <Badge key={port} variant="secondary" className="font-mono">{port}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-medium">—</p>
                )}
              </div>
            </div>
            {selectedZone?.notes && (
              <p className="text-xs text-muted-foreground italic px-1">{selectedZone.notes}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
