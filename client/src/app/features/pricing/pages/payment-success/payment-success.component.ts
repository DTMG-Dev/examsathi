import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

interface ConfettiParticle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payment-success.component.html',
  styleUrl:    './payment-success.component.scss',
})
export class PaymentSuccessComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);

  @ViewChild('confettiCanvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  readonly planName    = signal('Pro');
  readonly amountPaid  = signal(0);
  readonly billingCycle = signal<'monthly' | 'annual'>('monthly');
  readonly endDate     = signal<string | null>(null);

  readonly unlockedFeatures = signal<string[]>([]);

  private animFrame?: number;

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const state = (nav?.extras?.state ?? history.state) as {
      planName?: string;
      data?: { planName: string; amountPaid: number; billingCycle: string; endDate: string };
    };

    if (state?.data) {
      this.planName.set(state.data.planName ?? 'Pro');
      this.amountPaid.set(state.data.amountPaid ?? 0);
      this.billingCycle.set((state.data.billingCycle as 'monthly' | 'annual') ?? 'monthly');
      this.endDate.set(state.data.endDate ?? null);
    }

    // Feature summary based on plan
    const plan = this.planName().toLowerCase();
    if (plan.includes('pro')) {
      this.unlockedFeatures.set([
        '✅ Unlimited AI question generation',
        '✅ AI Doubt Solver (unlimited)',
        '✅ Hindi language support',
        '✅ Advanced analytics & heatmaps',
        '✅ Adaptive weak area practice',
        '✅ Download tests as PDF',
        '✅ Priority support',
      ]);
    } else if (plan.includes('student') || plan.includes('basic')) {
      this.unlockedFeatures.set([
        '✅ Unlimited AI question generation',
        '✅ All subjects unlocked',
        '✅ AI-powered study roadmap',
        '✅ Weak area detection & spaced repetition',
        '✅ Previous year questions (PYQ)',
        '✅ Download tests as PDF',
      ]);
    } else if (plan.includes('institute')) {
      this.unlockedFeatures.set([
        '✅ Multi-student management portal',
        '✅ Batch creation & test assignment',
        '✅ Student performance analytics',
        '✅ White-label branding',
        '✅ Bulk AI question generation',
        '✅ Dedicated support',
      ]);
    } else {
      this.unlockedFeatures.set([
        '✅ Unlimited AI questions',
        '✅ All subjects',
        '✅ Study roadmap & analytics',
      ]);
    }
  }

  ngAfterViewInit(): void {
    // Small delay to let the DOM render
    setTimeout(() => this.startConfetti(), 100);
  }

  goToDashboard(): void {
    this.stopConfetti();
    this.router.navigate(['/dashboard']);
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  }

  // ── Confetti ────────────────────────────────────────────────────────────────

  private stopConfetti(): void {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }

  private startConfetti(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width  = canvas.offsetWidth  || window.innerWidth;
    canvas.height = canvas.offsetHeight || 400;

    const COLORS = ['#ff6b35', '#e94560', '#22c55e', '#a855f7', '#facc15', '#38bdf8'];
    const COUNT  = 120;

    const particles: ConfettiParticle[] = Array.from({ length: COUNT }, () => ({
      x:             Math.random() * canvas.width,
      y:             Math.random() * canvas.height - canvas.height,
      vx:            (Math.random() - 0.5) * 2,
      vy:            Math.random() * 3 + 2,
      color:         COLORS[Math.floor(Math.random() * COLORS.length)],
      size:          Math.random() * 8 + 4,
      rotation:      Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
      opacity:       1,
    }));

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      for (const p of particles) {
        p.x  += p.vx;
        p.y  += p.vy;
        p.rotation += p.rotationSpeed;
        if (frame > 120) p.opacity = Math.max(0, p.opacity - 0.008);

        if (p.y > canvas.height) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
          p.opacity = 1;
        }

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      if (frame < 300) {
        this.animFrame = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    this.animFrame = requestAnimationFrame(animate);
  }

  ngOnDestroy(): void {
    this.stopConfetti();
  }
}
