import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (result: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmModalService {
  readonly pending = signal<PendingConfirm | null>(null);

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.pending.set({ ...options, resolve });
    });
  }

  respond(result: boolean): void {
    const p = this.pending();
    if (p) {
      p.resolve(result);
      this.pending.set(null);
    }
  }
}
