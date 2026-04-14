import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Auth layout — centred card with glassmorphism, used for login/register/forgot-password.
 * Background uses a radial gradient with a saffron glow for visual identity.
 */
@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden"
      style="background: radial-gradient(ellipse at top, #1A1A2E 0%, #0F0F1A 70%)"
    >
      <!-- Saffron ambient glow -->
      <div
        class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none opacity-20"
        style="background: radial-gradient(ellipse, #FF6B35 0%, transparent 70%); filter: blur(60px);"
        aria-hidden="true"
      ></div>

      <div class="w-full max-w-md relative z-10">

        <!-- Brand logo -->
        <div class="flex flex-col items-center mb-8">
          <div
            class="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style="background: linear-gradient(135deg, #FF6B35, #E94560)"
            aria-hidden="true"
          >
            <span class="text-white font-heading font-bold text-2xl">ES</span>
          </div>
          <h1 class="font-heading font-bold text-2xl text-white tracking-tight">
            ExamSathi
          </h1>
          <p class="text-white/50 text-sm mt-1">AI-Powered Exam Preparation</p>
        </div>

        <!-- Auth card -->
        <div class="glass-card p-6 md:p-8">
          <router-outlet />
        </div>

        <p class="text-center text-white/25 text-xs mt-6 tracking-wide">
          For NEET &nbsp;·&nbsp; JEE &nbsp;·&nbsp; UPSC &nbsp;·&nbsp; CAT &nbsp;·&nbsp; SSC
        </p>

      </div>
    </div>
  `,
})
export class AuthLayoutComponent {}
