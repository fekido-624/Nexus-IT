"use client"

import { useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  onConfirm,
}: ConfirmDialogProps) {
  // Radix can leave document.body stuck at pointer-events: none after this dialog closes,
  // especially when onConfirm is async — nothing on the page is clickable until a refresh.
  // Once we're closed, if no other modal is genuinely open, clear the stuck lock.
  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => {
      const anyModalOpen = document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
      if (!anyModalOpen && document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}