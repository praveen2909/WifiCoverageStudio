import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Dashboard } from './dashboard';
import { WifiService } from '../../core/services/wifi.service';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows a qualified Xiaomi guess for its commonly used gateway IP', () => {
    const wifi = fixture.debugElement.injector.get(WifiService);
    wifi.companionConnected.set(true);
    wifi.reading.set({
      connected: true,
      ssid: null,
      rssiDbm: -50,
      channel: 1,
      routerIp: '192.168.31.1',
      routerIpError: null,
      timestamp: new Date().toISOString(),
      error: null,
    });

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Likely Xiaomi / Mi Router');
    expect(fixture.nativeElement.textContent).toContain('192.168.31.1');
    expect(fixture.nativeElement.textContent).toContain('router model is not verified');
  });
});
