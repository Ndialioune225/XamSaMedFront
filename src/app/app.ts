import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth/auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected title = 'xamsamed';
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    // Valide la session persistée auprès du backend (best-effort, sans bloquer).
    this.auth.restoreSession();
  }
}
