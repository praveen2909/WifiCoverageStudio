import { Component, ElementRef, effect, input, output, viewChild, inject } from '@angular/core';
import { CoverageService } from '../../core/services/coverage.service';
import { FloorPlan, Wall } from '../../core/models/wifi.models';

type EditorTool = 'select' | 'wall';

@Component({
  selector: 'app-coverage-canvas',
  template: `
    <canvas
      #canvas
      [attr.width]="floorPlan().width"
      [attr.height]="floorPlan().height"
      [class.editable]="editable()"
      [class.range-limited]="rangeMeters() !== null"
      [attr.aria-label]="editable() ? 'Editable Wi-Fi floor plan' : 'Wi-Fi coverage heatmap'"
      role="img"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerCancel($event)"
    ></canvas>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    canvas {
      display: block;
      width: 100%;
      height: auto;
      aspect-ratio: 20 / 13;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 0.75rem;
      background: #f7f8fa;
      touch-action: none;
    }

    canvas.editable {
      cursor: crosshair;
    }

    canvas.range-limited {
      cursor: default;
    }
  `,
})
export class CoverageCanvas {
  private static readonly METERS_PER_PLAN_PIXEL = 0.05;
  readonly floorPlan = input.required<FloorPlan>();
  readonly editable = input(false);
  readonly rangeMeters = input<number | null>(null);
  readonly tool = input<EditorTool>('select');
  readonly wallType = input<Wall['type']>('drywall');
  readonly deviceMoved = output<{ id: string; x: number; y: number }>();
  readonly wallCreated = output<Omit<Wall, 'id'>>();

  private readonly coverage = inject(CoverageService);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private draggingDeviceId: string | null = null;
  private pointerId: number | null = null;
  private wallStart: { x: number; y: number } | null = null;
  private pointerPosition: { x: number; y: number } | null = null;

  constructor() {
    effect(() => {
      const plan = this.floorPlan();
      const canvas = this.canvas()?.nativeElement;
      this.editable();
      this.rangeMeters();
      this.tool();
      this.wallType();
      if (canvas) this.draw(canvas, plan);
    });
  }

  onPointerDown(event: PointerEvent): void {
    if (!this.editable()) return;

    const canvas = event.currentTarget as HTMLCanvasElement;
    const point = this.toPlanPoint(event, canvas);
    canvas.setPointerCapture(event.pointerId);
    this.pointerId = event.pointerId;
    this.pointerPosition = point;

    if (this.tool() === 'wall') {
      this.wallStart = point;
      this.draw(canvas, this.floorPlan());
      return;
    }

    const nearestDevice = this.floorPlan().devices
      .map((device) => ({
        device,
        distance: Math.hypot(device.x - point.x, device.y - point.y),
      }))
      .filter(({ distance }) => distance <= 24)
      .sort((a, b) => a.distance - b.distance)[0];

    this.draggingDeviceId = nearestDevice?.device.id ?? null;
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.editable() || this.pointerId !== event.pointerId) return;

    const canvas = event.currentTarget as HTMLCanvasElement;
    const point = this.toPlanPoint(event, canvas);
    this.pointerPosition = point;

    if (this.draggingDeviceId) {
      this.deviceMoved.emit({ id: this.draggingDeviceId, ...point });
    } else if (this.wallStart) {
      this.draw(canvas, this.floorPlan());
    }
  }

  onPointerUp(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) return;

    if (
      this.wallStart &&
      this.pointerPosition &&
      Math.hypot(this.wallStart.x - this.pointerPosition.x, this.wallStart.y - this.pointerPosition.y) >= 12
    ) {
      const attenuationByType: Record<Wall['type'], number> = {
        drywall: 3,
        wood: 4,
        brick: 8,
        concrete: 15,
      };

      this.wallCreated.emit({
        x1: this.wallStart.x,
        y1: this.wallStart.y,
        x2: this.pointerPosition.x,
        y2: this.pointerPosition.y,
        type: this.wallType(),
        attenuation: attenuationByType[this.wallType()],
      });
    }

    this.draggingDeviceId = null;
    this.pointerId = null;
    this.wallStart = null;
    this.pointerPosition = null;
  }

  onPointerCancel(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) return;
    this.draggingDeviceId = null;
    this.pointerId = null;
    this.wallStart = null;
    this.pointerPosition = null;
  }

  private toPlanPoint(event: PointerEvent, canvas: HTMLCanvasElement): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const plan = this.floorPlan();

    return {
      x: Math.round(Math.max(0, Math.min(plan.width, ((event.clientX - rect.left) / rect.width) * plan.width))),
      y: Math.round(Math.max(0, Math.min(plan.height, ((event.clientY - rect.top) / rect.height) * plan.height))),
    };
  }

  private draw(canvas: HTMLCanvasElement, plan: FloorPlan): void {
    if (typeof CanvasRenderingContext2D === 'undefined') return;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, plan.width, plan.height);
    context.fillStyle = '#f7f8fa';
    context.fillRect(0, 0, plan.width, plan.height);

    const cellSize = 12;
    for (let y = 0; y < plan.height; y += cellSize) {
      for (let x = 0; x < plan.width; x += cellSize) {
        const cellX = x + cellSize / 2;
        const cellY = y + cellSize / 2;
        const signal =
          plan.devices.length === 0
            ? -100
            : Math.max(
                ...plan.devices.map((device) =>
                  this.coverage.getSignalStrength(
                    cellX,
                    cellY,
                    device,
                    plan.walls,
                    CoverageCanvas.METERS_PER_PLAN_PIXEL,
                  ),
                ),
              );
        context.globalAlpha = 0.26;
        context.fillStyle = this.coverage.getSignalColor(signal);
        context.fillRect(x, y, cellSize, cellSize);
        const rangeMeters = this.rangeMeters();
        if (
          rangeMeters !== null &&
          !this.coverage.isWithinRange(
            cellX,
            cellY,
            plan.devices,
            rangeMeters,
            CoverageCanvas.METERS_PER_PLAN_PIXEL,
          )
        ) {
          context.globalAlpha = 0.78;
          context.fillStyle = '#e2e8f0';
          context.fillRect(x, y, cellSize, cellSize);
        }
      }

    }
    context.globalAlpha = 1;

    if (this.rangeMeters() !== null) {
      this.drawRangeBoundaries(context, plan);
    }
    this.drawRooms(context, plan);
    this.drawWalls(context, plan.walls);
    this.drawDevices(context, plan);

    if (this.wallStart && this.pointerPosition) {
      context.save();
      context.strokeStyle = '#2563eb';
      context.lineWidth = 3;
      context.setLineDash([8, 6]);
      context.beginPath();
      context.moveTo(this.wallStart.x, this.wallStart.y);
      context.lineTo(this.pointerPosition.x, this.pointerPosition.y);
      context.stroke();
      context.restore();
    }

    context.strokeStyle = '#475569';
    context.lineWidth = 4;
    context.strokeRect(2, 2, plan.width - 4, plan.height - 4);
  }

  private drawRangeBoundaries(context: CanvasRenderingContext2D, plan: FloorPlan): void {
    const radius = (this.rangeMeters() ?? 0) / CoverageCanvas.METERS_PER_PLAN_PIXEL;
    context.save();
    context.strokeStyle = '#334155';
    context.lineWidth = 2;
    context.setLineDash([8, 6]);
    for (const device of plan.devices) {
      context.beginPath();
      context.arc(device.x, device.y, radius, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }

  private drawRooms(context: CanvasRenderingContext2D, plan: FloorPlan): void {
    context.fillStyle = 'rgba(30, 41, 59, 0.65)';
    context.font = '600 14px system-ui, sans-serif';
    context.fillText('NORTH ↑', 18, 28);
    context.font = '12px system-ui, sans-serif';
    context.fillText('Drag devices to reposition', 18, plan.height - 18);
  }

  private drawWalls(context: CanvasRenderingContext2D, walls: Wall[]): void {
    const colors: Record<Wall['type'], string> = {
      drywall: '#475569',
      wood: '#8b5e3c',
      brick: '#b45309',
      concrete: '#334155',
    };

    for (const wall of walls) {
      context.strokeStyle = colors[wall.type];
      context.lineWidth = wall.type === 'concrete' ? 10 : wall.type === 'brick' ? 8 : 6;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(wall.x1, wall.y1);
      context.lineTo(wall.x2, wall.y2);
      context.stroke();
    }
  }

  private drawDevices(context: CanvasRenderingContext2D, plan: FloorPlan): void {
    for (const device of plan.devices) {
      context.beginPath();
      context.fillStyle = device.type === 'router' ? '#2563eb' : '#0f766e';
      context.arc(device.x, device.y, 13, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 3;
      context.strokeStyle = '#fff';
      context.stroke();
      context.fillStyle = '#0f172a';
      context.font = '600 12px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText(device.type === 'router' ? 'Router' : device.name, device.x, device.y + 31);
    }
    context.textAlign = 'start';
  }
}
