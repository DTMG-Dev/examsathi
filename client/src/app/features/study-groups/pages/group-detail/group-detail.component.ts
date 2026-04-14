import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GroupsService } from '../../../../core/services/groups.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  StudyGroup,
  Challenge,
  GroupMember,
  LeaderboardEntry,
  CreateChallengeRequest,
  ExamType,
} from '../../../../core/models/study-group.model';

type Tab = 'feed' | 'challenges' | 'leaderboard' | 'members';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [RouterLink, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './group-detail.component.html',
  styleUrl: './group-detail.component.scss',
})
export class GroupDetailComponent implements OnInit {
  private readonly groupsService = inject(GroupsService);
  private readonly toastService  = inject(ToastService);
  private readonly router        = inject(Router);
  private readonly route         = inject(ActivatedRoute);
  private readonly destroyRef    = inject(DestroyRef);

  // ── State ──────────────────────────────────────────────────────────────────
  readonly group        = signal<StudyGroup | null>(null);
  readonly isLoading    = signal(true);
  readonly activeTab    = signal<Tab>('feed');
  readonly showCreateChallenge = signal(false);
  readonly isSubmittingChallenge = signal(false);
  readonly showInviteToast = signal(false);

  // Challenge form
  readonly challengeForm = signal<CreateChallengeRequest>({
    title:         '',
    description:   '',
    topic:         '',
    subject:       '',
    difficulty:    'medium',
    questionCount: 10,
    dueDate:       '',
  });

  readonly tabs: Tab[] = ['feed', 'challenges', 'leaderboard', 'members'];

  // ── Computed ───────────────────────────────────────────────────────────────

  readonly canManage = computed(() => {
    const g = this.group();
    return g?.myRole === 'admin' || g?.myRole === 'moderator';
  });

  readonly activeChallenges = computed(() => {
    const g = this.group();
    if (!g) return [];
    const now = new Date();
    return g.challenges.filter((c) => c.isActive && new Date(c.dueDate) > now)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  });

  readonly expiredChallenges = computed(() => {
    const g = this.group();
    if (!g) return [];
    const now = new Date();
    return g.challenges.filter((c) => !c.isActive || new Date(c.dueDate) <= now)
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  });

  readonly leaderboard = computed(() => this.group()?.leaderboard ?? []);

  readonly members = computed(() => this.group()?.members ?? []);

  readonly groupId = computed(() => this.route.snapshot.paramMap.get('groupId') ?? '');

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadGroup();
  }

  private loadGroup(): void {
    const id = this.groupId();
    if (!id) { this.router.navigate(['/study-groups']); return; }

    this.groupsService.getGroupDetail(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success) this.group.set(res.data);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.toastService.error('Failed to load group.');
          this.router.navigate(['/study-groups']);
        },
      });
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  setTab(tab: Tab): void { this.activeTab.set(tab); }

  openCreateChallenge(): void  { this.showCreateChallenge.set(true); }
  closeCreateChallenge(): void { this.showCreateChallenge.set(false); }

  updateChallengeForm(patch: Partial<CreateChallengeRequest>): void {
    this.challengeForm.update((f) => ({ ...f, ...patch }));
  }

  submitChallenge(): void {
    const form = this.challengeForm();
    if (!form.title.trim() || !form.topic.trim() || !form.subject.trim() || !form.dueDate) {
      this.toastService.error('Please fill in all required fields.');
      return;
    }

    this.isSubmittingChallenge.set(true);
    this.groupsService.createChallenge(this.groupId(), form)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSubmittingChallenge.set(false);
          if (res.success) {
            this.closeCreateChallenge();
            this.toastService.success('Challenge created!');
            this.loadGroup(); // refresh
            this.activeTab.set('challenges');
          }
        },
        error: () => {
          this.isSubmittingChallenge.set(false);
          this.toastService.error('Failed to create challenge.');
        },
      });
  }

  startChallenge(challenge: Challenge): void {
    this.router.navigate(
      ['/study-groups', this.groupId(), 'challenge', challenge._id],
      { state: { challenge, groupName: this.group()?.name } },
    );
  }

  copyInviteCode(): void {
    const code = this.group()?.inviteCode;
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      this.showInviteToast.set(true);
      setTimeout(() => this.showInviteToast.set(false), 2000);
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  examColor(exam: ExamType): string {
    const map: Record<ExamType, string> = {
      NEET: '#10b981', JEE: '#3b82f6', UPSC: '#8b5cf6', CAT: '#f59e0b', SSC: '#ec4899',
    };
    return map[exam] ?? '#6b7280';
  }

  difficultyColor(d: string): string {
    return d === 'easy' ? '#10b981' : d === 'medium' ? '#f59e0b' : '#ef4444';
  }

  countdown(dueDate: string): string {
    const diff = new Date(dueDate).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
    return `${h}h ${m}m left`;
  }

  rankEmoji(rank: number): string {
    return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  }

  timeSince(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  minDateTime(): string {
    const d = new Date(Date.now() + 60 * 60 * 1000); // +1 hour
    return d.toISOString().slice(0, 16);
  }

  trackById(_: number, item: Challenge | GroupMember | LeaderboardEntry): string {
    return (item as Challenge)._id ?? (item as LeaderboardEntry).rank?.toString() ?? '';
  }
}
