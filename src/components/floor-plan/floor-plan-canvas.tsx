"use client"

import { useRef, useState } from "react";
import type { FloorZone } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DragState {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  zoneX: number;
  zoneY: number;
  zoneWidth: number;
  zoneHeight: number;
}

interface FloorPlanCanvasProps {
  imageUrl: string;
  zones: FloorZone[];
  editable?: boolean;
  drawingMode?: boolean;
  onZoneCreate?: (rect: Rect) => void;
  onZoneMove?: (id: string, x: number, y: number) => void;
  onZoneResize?: (id: string, width: number, height: number) => void;
  onZoneClick?: (zone: FloorZone) => void;
  /** When set (non-empty), zones not in this list are dimmed and matching zones get a highlight ring — used for search. */
  highlightedZoneIds?: string[];
  /** When false, zones can't be dragged/resized — clicking always opens onZoneClick instead. Prevents accidental moves. */
  moveEnabled?: boolean;
}

const MIN_SIZE = 2; // minimum zone width/height, % of image
const MOVE_THRESHOLD = 0.3; // % movement below which a drag counts as a click
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function FloorPlanCanvas({
  imageUrl,
  zones,
  editable = false,
  drawingMode = false,
  onZoneCreate,
  onZoneMove,
  onZoneResize,
  onZoneClick,
  highlightedZoneIds,
  moveEnabled = true,
}: FloorPlanCanvasProps) {
  const isSearching = !!highlightedZoneIds && highlightedZoneIds.length > 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const drawStart = useRef<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<Rect | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [liveZone, setLiveZone] = useState<Rect & { id: string } | null>(null);
  const [zoom, setZoom] = useState(1);

  const zoomIn = () => setZoom((z) => clamp(Math.round((z + ZOOM_STEP) * 100) / 100, MIN_ZOOM, MAX_ZOOM));
  const zoomOut = () => setZoom((z) => clamp(Math.round((z - ZOOM_STEP) * 100) / 100, MIN_ZOOM, MAX_ZOOM));
  const resetZoom = () => setZoom(1);

  function handleWheel(e: React.WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom((z) => clamp(Math.round((z - e.deltaY * 0.01) * 100) / 100, MIN_ZOOM, MAX_ZOOM));
  }

  function pointFromEvent(e: React.PointerEvent): { x: number; y: number } {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100),
    };
  }

  function handleContainerPointerDown(e: React.PointerEvent) {
    if (!editable || !drawingMode) return;
    if (e.target !== containerRef.current) return; // only start a new zone on empty background
    const p = pointFromEvent(e);
    drawStart.current = p;
    setDraft({ x: p.x, y: p.y, width: 0, height: 0 });
    containerRef.current?.setPointerCapture(e.pointerId);
  }

  function handleContainerPointerMove(e: React.PointerEvent) {
    if (drawStart.current) {
      const p = pointFromEvent(e);
      setDraft({
        x: Math.min(drawStart.current.x, p.x),
        y: Math.min(drawStart.current.y, p.y),
        width: Math.abs(p.x - drawStart.current.x),
        height: Math.abs(p.y - drawStart.current.y),
      });
      return;
    }
    if (dragState) {
      const p = pointFromEvent(e);
      const dx = p.x - dragState.startX;
      const dy = p.y - dragState.startY;
      if (dragState.mode === "move") {
        setLiveZone({
          id: dragState.id,
          x: clamp(dragState.zoneX + dx, 0, 100 - dragState.zoneWidth),
          y: clamp(dragState.zoneY + dy, 0, 100 - dragState.zoneHeight),
          width: dragState.zoneWidth,
          height: dragState.zoneHeight,
        });
      } else {
        setLiveZone({
          id: dragState.id,
          x: dragState.zoneX,
          y: dragState.zoneY,
          width: clamp(dragState.zoneWidth + dx, MIN_SIZE, 100 - dragState.zoneX),
          height: clamp(dragState.zoneHeight + dy, MIN_SIZE, 100 - dragState.zoneY),
        });
      }
    }
  }

  function handleContainerPointerUp() {
    if (drawStart.current) {
      const finalDraft = draft;
      drawStart.current = null;
      setDraft(null);
      if (finalDraft && finalDraft.width >= MIN_SIZE && finalDraft.height >= MIN_SIZE) {
        onZoneCreate?.(finalDraft);
      }
      return;
    }
    if (dragState) {
      const moved =
        liveZone &&
        (Math.abs(liveZone.x - dragState.zoneX) > MOVE_THRESHOLD ||
          Math.abs(liveZone.y - dragState.zoneY) > MOVE_THRESHOLD ||
          Math.abs(liveZone.width - dragState.zoneWidth) > MOVE_THRESHOLD ||
          Math.abs(liveZone.height - dragState.zoneHeight) > MOVE_THRESHOLD);

      if (moved && liveZone) {
        if (dragState.mode === "move") onZoneMove?.(dragState.id, liveZone.x, liveZone.y);
        else onZoneResize?.(dragState.id, liveZone.width, liveZone.height);
      } else {
        const zone = zones.find((z) => z.id === dragState.id);
        if (zone) onZoneClick?.(zone);
      }
      setDragState(null);
      setLiveZone(null);
    }
  }

  function startDrag(e: React.PointerEvent, zone: FloorZone, mode: "move" | "resize") {
    if (!editable || drawingMode || !moveEnabled) return;
    e.stopPropagation();
    const p = pointFromEvent(e);
    setDragState({
      id: zone.id,
      mode,
      startX: p.x,
      startY: p.y,
      zoneX: zone.x,
      zoneY: zone.y,
      zoneWidth: zone.width,
      zoneHeight: zone.height,
    });
    containerRef.current?.setPointerCapture(e.pointerId);
  }

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1 rounded-lg border bg-background/90 backdrop-blur px-1 py-1 shadow-sm">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={zoom <= MIN_ZOOM} onClick={zoomOut}>
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs font-medium tabular-nums w-10 text-center select-none">{Math.round(zoom * 100)}%</span>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={zoom >= MAX_ZOOM} onClick={zoomIn}>
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        {zoom !== 1 && (
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={resetZoom} title="Set semula zum">
            <Maximize className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div
        className="w-full overflow-auto rounded-lg border bg-muted"
        style={{ maxHeight: "75vh" }}
        onWheel={handleWheel}
      >
        <div style={{ width: `${zoom * 100}%`, minWidth: "100%" }}>
          <div
            ref={containerRef}
            className={cn(
              "relative w-full select-none",
              editable && "touch-none"
            )}
            onPointerDown={handleContainerPointerDown}
            onPointerMove={handleContainerPointerMove}
            onPointerUp={handleContainerPointerUp}
          >
            <img
              src={imageUrl}
              alt="Pelan Lantai"
              className="w-full h-auto block pointer-events-none"
              draggable={false}
            />

            {zones.map((zone) => {
              const live = liveZone && liveZone.id === zone.id ? liveZone : zone;
              const occupied = !!zone.assignedUserId;
              const isMatch = !isSearching || highlightedZoneIds!.includes(zone.id);
              return (
                <div
                  key={zone.id}
                  className={cn(
                    "absolute border-2 rounded-md flex items-center justify-center text-center px-1 transition-opacity",
                    occupied
                      ? "bg-primary/20 border-primary"
                      : "bg-muted-foreground/10 border-muted-foreground/40 border-dashed",
                    editable && !drawingMode && moveEnabled && "cursor-move",
                    editable && !drawingMode && !moveEnabled && "cursor-pointer",
                    !editable && "cursor-pointer",
                    isSearching && isMatch && "ring-4 ring-yellow-400 z-10",
                    isSearching && !isMatch && "opacity-25"
                  )}
                  style={{
                    left: `${live.x}%`,
                    top: `${live.y}%`,
                    width: `${live.width}%`,
                    height: `${live.height}%`,
                  }}
                  onPointerDown={(e) => startDrag(e, zone, "move")}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (drawingMode) return;
                    if (!editable || !moveEnabled) onZoneClick?.(zone);
                  }}
                >
                  <span className="text-[10px] md:text-xs font-medium truncate pointer-events-none">
                    {zone.label}
                  </span>
                  {editable && !drawingMode && moveEnabled && (
                    <div
                      className="absolute -right-1.5 -bottom-1.5 h-3.5 w-3.5 rounded-sm bg-primary border border-background cursor-se-resize touch-none"
                      onPointerDown={(e) => startDrag(e, zone, "resize")}
                    />
                  )}
                </div>
              );
            })}

            {draft && (
              <div
                className="absolute border-2 border-dashed border-primary bg-primary/10 pointer-events-none"
                style={{
                  left: `${draft.x}%`,
                  top: `${draft.y}%`,
                  width: `${draft.width}%`,
                  height: `${draft.height}%`,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
