import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GroupsService } from '../../../../core/services/groups.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  StudyGroupSummary,
  ExamType,
  CreateGroupRequest,
} from '../../../../core/models/study-group.model';

@Component({
  selector: 'app-groups-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './groups-list.component.html',
  styleUrl: './groups-list.component.scss',
})
export class GroupsListComponent implements OnInit {
  private readonly groupsService = inject(GroupsService);
  private readonly toastService  = inject(ToastService);
  private readonly router        = inject(Router);
  private readonly destroyRef    = inject(DestroyRef);

  // ── State ──────────────────────────────────────────────────────────────────
  readonly myGroups        = signal<StudyGroupSummary[]>([]);
  readonly publicGroups    = signal<StudyGroupSummary[]>([]);
  readonly isLoading       = signal(true);
  readonly isLoadingPublic = signal(false);
  readonly showCreateModal = signal(false);
  readonly showJoinModal   = signal(false);
  readonly isSubmitting    = signal(false);

  // Create form
  readonly createForm = signal<CreateGroupRequest>({
    name:        '',
    description: '',
    exam:        'NEET',
    isPublic:    true,
    maxMembers:  50,
  });

  // Join form
  readonly joinCode = signal('');

  // Discover filter
  readonly discoverExam = signal<ExamType | ''>('');

  readonly examOptions: ExamType[] = ['NEET', 'JEE', 'UPSC', 'CAT', 'SSC'];

  readonly hasMyGroups = computed(() => this.myGroups().length > 0);

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadMyGroups();
    this.loadPublicGroups();
  }

  private loadMyGroups(): void {
    this.groupsService.getMyGroups()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success) this.myGroups.set(res.data);
          this.isLoading.set(false);
        },
        error: () => { this.isLoading.set(false); },
      });
  }

  loadPublicGroups(exam?: ExamType): void {
    this.isLoadingPublic.set(true);
    this.groupsService.discoverGroups(exam)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success) this.publicGroups.set(res.data as unknown as StudyGroupSummary[]);
          this.isLoadingPublic.set(false);
        },
        error: () => { this.isLoadingPublic.set(false); },
      });
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  openCreateModal(): void  { this.showCreateModal.set(true); }
  closeCreateModal(): void { this.showCreateModal.set(false); }
  openJoinModal(): void    { this.showJoinModal.set(true); }
  closeJoinModal(): void   { this.showJoinModal.set(false); this.joinCode.set(''); }

  updateCreateForm(patch: Partial<CreateGroupRequest>): void {
    this.createForm.update((f) => ({ ...f, ...patch }));
  }

  submitCreate(): void {
    const form = this.createForm();
    if (!form.name.trim()) {
      this.toastService.error('Group name is required.');
      return;
    }

    this.isSubmitting.set(true);
    this.groupsService.createGroup(form)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          if (res.success) {
            this.closeCreateModal();
            this.toastService.success('Study group created!');
            this.router.navigate(['/study-groups', res.data._id]);
          }
        },
        error: () => {
          this.isSubmitting.set(false);
          this.toastService.error('Failed to create group.');
        },
      });
  }

  submitJoin(): void {
    const code = this.joinCode().trim();
    if (!code) {
      this.toastService.error('Please enter an invite code.');
      return;
    }

    this.isSubmitting.set(true);
    this.groupsService.joinGroup({ inviteCode: code })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          if (res.success) {
            this.closeJoinModal();
            this.toastService.success(`Joined "${res.data.name}" successfully!`);
            this.router.navigate(['/study-groups', res.data.groupId]);
          }
        },
        error: () => {
          this.isSubmitting.set(false);
          this.toastService.error('Invalid or expired invite code.');
        },
      });
  }

  filterDiscover(exam: ExamType | ''): void {
    this.discoverExam.set(exam);
    this.loadPublicGroups(exam || undefined);
  }

  navigateToGroup(groupId: string): void {
    this.router.navigate(['/study-groups', groupId]);
  }

  joinPublicGroup(inviteCode: string): void {
    this.joinCode.set(inviteCode);
    this.submitJoin();
  }

  examColor(exam: ExamType): string {
    const map: Record<ExamType, string> = {
      NEET: '#10b981', JEE: '#3b82f6', UPSC: '#8b5cf6', CAT: '#f59e0b', SSC: '#ec4899',
    };
    return map[exam] ?? '#6b7280';
  }

  timeSince(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  trackById(_: number, item: StudyGroupSummary): string { return item._id; }
}
