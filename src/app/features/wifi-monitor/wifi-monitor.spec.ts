import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WifiMonitor } from './wifi-monitor';

describe('WifiMonitor', () => {
  let component: WifiMonitor;
  let fixture: ComponentFixture<WifiMonitor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WifiMonitor],
    }).compileComponents();

    fixture = TestBed.createComponent(WifiMonitor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
