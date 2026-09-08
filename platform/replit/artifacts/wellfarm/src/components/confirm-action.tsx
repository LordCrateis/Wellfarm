import { createRoot } from "react-dom/client";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

export function confirmAction(description: string): Promise<boolean> {
  return new Promise(resolve => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    let closed = false;
    const close = (confirmed: boolean) => {
      if (closed) return;
      closed = true;
      resolve(confirmed);
      setTimeout(() => { root.unmount(); container.remove(); }, 0);
    };
    root.render(<AlertDialog open onOpenChange={open => { if (!open) close(false); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete saved scans?</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel onClick={() => close(false)}>Keep scans</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => close(true)}>Remove from my history</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>);
  });
}
