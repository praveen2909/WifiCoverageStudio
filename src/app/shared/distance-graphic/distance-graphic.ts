import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-distance-graphic',
  imports: [DecimalPipe],
  template: `
    <section class="distance-card" aria-labelledby="distance-title">
      <div class="distance-heading">
        <div>
          <p class="eyebrow">
            {{ calibrated() ? 'CALIBRATED DISTANCE ESTIMATE' : 'ESTIMATED ACCESS POINT DISTANCE' }}
          </p>
          <h3 id="distance-title">Approximate distance</h3>
        </div>
        <strong class="distance-value">~{{ meters() | number: '1.1-1' }} <span>m</span></strong>
      </div>
      <svg
        class="distance-graphic"
        viewBox="0 0 600 190"
        role="img"
        [attr.aria-label]="
          'Estimated distance ' +
          (meters() | number: '1.1-1') +
          ' meters from access point, on a scale from zero to ' +
          (scaleMeters() | number: '1.1-1') +
          ' meters'
        "
      >
        <defs>
          <linearGradient id="distance-gradient" x1="0" x2="1">
            <stop offset="0%" stop-color="#2563eb" />
            <stop offset="100%" stop-color="#13a89e" />
          </linearGradient>
        </defs>
        <line x1="72" y1="86" x2="528" y2="86" class="distance-track" />
        <line x1="72" y1="86" [attr.x2]="markerX()" y2="86" class="distance-fill" />
        @for (tick of ticks(); track tick.x) {
          <line [attr.x1]="tick.x" y1="76" [attr.x2]="tick.x" y2="98" class="distance-tick" />
          <text [attr.x]="tick.x" y="126" text-anchor="middle" class="distance-tick-label">
            {{ tick.meters | number: '1.1-1' }}
          </text>
        }
        <circle cx="72" cy="86" r="20" class="access-point-marker" />
        <path d="M59 85 Q72 73 85 85 M63 90 Q72 82 81 90 M70 95 Q72 93 74 95" class="router-glyph" />
        <circle [attr.cx]="markerX()" cy="86" r="19" class="device-marker-halo" />
        <circle [attr.cx]="markerX()" cy="86" r="8" class="device-marker" />
        <text x="72" y="53" text-anchor="middle" class="distance-node-label">Access point</text>
        <text [attr.x]="markerX()" y="53" text-anchor="middle" class="distance-node-label">Your device</text>
        <text x="300" y="160" text-anchor="middle" class="distance-axis-label">Estimated distance (m)</text>
      </svg>
      <p class="disclaimer">
        {{ calibrated()
          ? 'Anchored to your known distance and current RSSI. Changes remain estimates and depend on similar walls, band, router power, and interference.'
          : 'Derived from RSSI—not GPS or device positioning. Walls, router power, band, and interference can make the real distance differ significantly.' }}
      </p>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .distance-card {
      display: grid;
      gap: 0.5rem;
      margin-top: 1.25rem;
      padding: clamp(1rem, 3vw, 1.5rem);
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 0.75rem;
      background: var(--mat-sys-surface-container);
    }

    .distance-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .eyebrow {
      margin: 0;
      color: var(--mat-sys-primary);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.12em;
    }

    h3 {
      margin: 0.35rem 0 0;
      font-size: 1.05rem;
    }

    .distance-value {
      font-size: 1.6rem;
      white-space: nowrap;
    }

    .distance-value span {
      font-size: 1rem;
      font-weight: 500;
    }

    .distance-graphic {
      display: block;
      width: 100%;
      max-height: 15rem;
      margin-top: 0.25rem;
      overflow: visible;
    }

    .distance-track {
      stroke: var(--mat-sys-outline-variant);
      stroke-width: 6;
      stroke-linecap: round;
    }

    .distance-fill {
      stroke: url(#distance-gradient);
      stroke-width: 6;
      stroke-linecap: round;
    }

    .distance-tick {
      stroke: var(--mat-sys-outline);
      stroke-width: 1.5;
    }

    .distance-tick-label,
    .distance-axis-label {
      fill: var(--mat-sys-on-surface-variant);
      font: 12px system-ui, sans-serif;
    }

    .distance-node-label {
      fill: var(--mat-sys-on-surface);
      font: 600 12px system-ui, sans-serif;
    }

    .access-point-marker {
      fill: #2563eb;
      stroke: var(--mat-sys-surface);
      stroke-width: 3;
    }

    .router-glyph {
      fill: none;
      stroke: #fff;
      stroke-linecap: round;
      stroke-width: 2;
    }

    .device-marker-halo {
      fill: color-mix(in srgb, #13a89e 20%, transparent);
      stroke: #13a89e;
      stroke-width: 2;
    }

    .device-marker {
      fill: #13a89e;
      stroke: var(--mat-sys-surface);
      stroke-width: 3;
    }

    .disclaimer {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.82rem;
      line-height: 1.5;
    }

    @media (max-width: 760px) {
      .distance-heading {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `,
})
export class DistanceGraphic {
  readonly meters = input.required<number>();
  readonly calibrated = input(false);

  protected readonly scaleMeters = computed(() => this.getNiceScale(this.meters() * 1.12));
  protected readonly markerX = computed(() => 72 + (this.meters() / this.scaleMeters()) * 456);
  protected readonly ticks = computed(() =>
    Array.from({ length: 5 }, (_, index) => {
      const fraction = index / 4;
      return {
        x: 72 + fraction * 456,
        meters: this.scaleMeters() * fraction,
      };
    }),
  );

  private getNiceScale(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 1;

    const magnitude = 10 ** Math.floor(Math.log10(value));
    const normalized = value / magnitude;
    const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

    return step * magnitude;
  }
}
