import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InstituteService } from '../../../../core/services/institute.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Institute, UpdateSettingsRequest } from '../../../../core/models/institute.model';

@Component({
  selector: 'app-institute-settings',
  standalone: true,
  imports: [FormsModule, RouterLink, TitleCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './institute-settings.component.html',
  styleUrl: './institute-settings.component.scss',
})
export class InstituteSettingsComponent implements OnInit {
  private readonly instituteService = inject(InstituteService);
  private readonly toastService     = inject(ToastService);
  private readonly destroyRef       = inject(DestroyRef);

  readonly institute    = signal<Institute | null>(null);
  readonly isLoading    = signal(true);
  readonly isSaving     = signal(false);

  readonly form = signal<UpdateSettingsRequest>({
    name:         '',
    brandColor:   '#FF6B35',
    logo:         '',
    customDomain: '',
    phone:        '',
    address: { street: '', city: '', state: '', pincode: '' },
  });

  readonly previewColor = computed(() => this.form().brandColor ?? '#ff6b35');

  readonly domainPreview = computed(() => {
    const slug = (this.form().customDomain ?? '').trim().toLowerCase().replace(/\s+/g, '-');
    return slug ? `${slug}.examsathi.in` : 'yourname.examsathi.in';
  });

  ngOnInit(): void {
    this.instituteService.getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success) {
            const inst = res.data.institute;
            this.institute.set(inst);
            this.form.set({
              name:         inst.name,
              brandColor:   inst.brandColor ?? '#FF6B35',
              logo:         inst.logo ?? '',
              customDomain: inst.customDomain ?? '',
              phone:        inst.phone ?? '',
              address: {
                street:  inst.address?.street ?? '',
                city:    inst.address?.city ?? '',
                state:   inst.address?.state ?? '',
                pincode: inst.address?.pincode ?? '',
              },
            });
          }
          this.isLoading.set(false);
        },
        error: () => { this.isLoading.set(false); },
      });
  }

  updateForm(patch: Partial<UpdateSettingsRequest>): void {
    this.form.update((f) => ({ ...f, ...patch }));
  }

  updateAddress(patch: Partial<NonNullable<UpdateSettingsRequest['address']>>): void {
    this.form.update((f) => ({ ...f, address: { ...f.address, ...patch } }));
  }

  save(): void {
    this.isSaving.set(true);
    this.instituteService.updateSettings(this.form())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSaving.set(false);
          if (res.success) {
            this.institute.set(res.data);
            this.toastService.success('Settings saved!');
          }
        },
        error: (err) => {
          this.isSaving.set(false);
          this.toastService.error(err?.error?.error ?? 'Failed to save settings.');
        },
      });
  }
}
