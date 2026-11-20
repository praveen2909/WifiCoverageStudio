import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MeshSimulator } from './mesh-simulator';

describe('MeshSimulator', () => {
  let component: MeshSimulator;
  let fixture: ComponentFixture<MeshSimulator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeshSimulator],
    }).compileComponents();

    fixture = TestBed.createComponent(MeshSimulator);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
