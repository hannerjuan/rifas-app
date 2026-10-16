import { Dialog } from '@angular/cdk/dialog';
import { Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AvisosService } from '../../core/avisos.service';
import { mensajeError } from '../../core/errores';
import { listaNumeros } from '../../core/formato';
import { Boleta, EstadoBoleta, Rifa, Venta } from '../../core/modelos';
import { escucharCambios } from '../../core/publico.service';
import { RifasService } from '../../core/rifas.service';
import { enlaceWhatsApp, mensajeGanador } from '../../core/whatsapp';
import { confirmar } from '../../shared/confirmar';
import { Celda, Leyenda, MatrizBoletas } from '../../shared/matriz-boletas';
import { DosCifrasPipe, FechaPipe, PesosPipe, TelefonoPipe } from '../../shared/pipes';
import { DatosFinalizar, FinalizarDialog } from './finalizar-dialog';
import { DatosVenta, VentaDialog } from './venta-dialog';
import { DatosPanelVenta, VentaPanel } from './venta-panel';

type Filtro = 'TODAS' | EstadoBoleta;

interface Comprador {
  ventaId: string;
  nombre: string;
  telefono: string;
  boletas: { numero: number; estado: EstadoBoleta }[];
  pendiente: number;
}

@Component({
  selector: 'app-rifa-detalle',
  imports: [RouterLink, MatrizBoletas, Leyenda, DosCifrasPipe, FechaPipe, PesosPipe, TelefonoPipe],
  templateUrl: './rifa-detalle.html',
})
export class RifaDetalle implements OnInit {
  private readonly rifasService = inject(RifasService);
  private readonly avisos = inject(AvisosService);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input.required<string>();

  protected readonly rifa = signal<Rifa | null>(null);
  protected readonly boletas = signal<Boleta[]>([]);
  protected readonly seleccion = signal<number[]>([]);
  protected readonly filtro = signal<Filtro>('TODAS');
  protected readonly pestana = signal<'matriz' | 'compradores'>('matriz');
  protected readonly busqueda = signal('');
  protected readonly exportando = signal<'' | 'pdf' | 'excel'>('');
  // Reloj para que la pantalla se bloquee sola cuando llega la hora del sorteo
  private readonly ahora = signal(Date.now());

  protected readonly listaNumeros = listaNumeros;

  protected readonly abierta = computed(() => {
    const r = this.rifa();
    return !!r && r.estado === 'ACTIVA' && new Date(r.fechaSorteo).getTime() > this.ahora();
  });
  protected readonly porFinalizar = computed(() => {
    const r = this.rifa();
    return !!r && r.estado === 'ACTIVA' && new Date(r.fechaSorteo).getTime() <= this.ahora();
  });

  // Métricas calculadas desde la matriz (se actualizan con cada cambio)
  protected readonly metricas = computed(() => {
    const valor = this.rifa()?.valorBoleta ?? 0;
    const cuenta = (e: EstadoBoleta) => this.boletas().filter((b) => b.estado === e).length;
    const pagadas = cuenta('PAGADA');
    const reservadas = cuenta('RESERVADA');
    return {
      pagadas,
      reservadas,
      disponibles: cuenta('DISPONIBLE'),
      recaudado: pagadas * valor,
      porCobrar: reservadas * valor,
    };
  });

  protected readonly celdas = computed<Celda[]>(() => {
    const r = this.rifa();
    const seleccion = new Set(this.seleccion());
    const filtro = this.filtro();
    return this.boletas().map((b) => ({
      numero: b.numero,
      tono: b.estado === 'PAGADA' ? 'pagada' : b.estado === 'RESERVADA' ? 'reservada' : 'disponible',
      interactiva: b.estado !== 'DISPONIBLE' || this.abierta(),
      seleccionada: seleccion.has(b.numero),
      ganadora: r?.estado === 'FINALIZADA' && r.numeroGanador === b.numero,
      atenuada: filtro !== 'TODAS' && b.estado !== filtro,
      titulo: b.venta ? `${b.venta.nombre} · ${b.estado === 'PAGADA' ? 'Pagada' : 'Reservada'}` : 'Disponible',
    }));
  });

  protected readonly compradores = computed<Comprador[]>(() => {
    const valor = this.rifa()?.valorBoleta ?? 0;
    const mapa = new Map<string, Comprador>();
    for (const b of this.boletas()) {
      if (!b.venta) continue;
      const c = mapa.get(b.venta.id) ?? {
        ventaId: b.venta.id,
        nombre: b.venta.nombre,
        telefono: b.venta.telefono,
        boletas: [],
        pendiente: 0,
      };
      c.boletas.push({ numero: b.numero, estado: b.estado });
      if (b.estado === 'RESERVADA') c.pendiente += valor;
      mapa.set(b.venta.id, c);
    }
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  });

  protected readonly compradoresFiltrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    if (!q) return this.compradores();
    const digitos = q.replace(/\D/g, '');
    return this.compradores().filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (digitos.length >= 3 && c.telefono.includes(digitos)) ||
        (digitos.length > 0 && digitos.length <= 2 && c.boletas.some((b) => b.numero === Number(digitos))),
    );
  });

  protected readonly totalSeleccion = computed(() => this.seleccion().length * (this.rifa()?.valorBoleta ?? 0));

  protected readonly enlaceGanador = computed(() => {
    const r = this.rifa();
    if (!r || r.resultado !== 'GANADOR' || !r.ganadorTelefono || r.numeroGanador === null) return '';
    return enlaceWhatsApp(r.ganadorTelefono, mensajeGanador(r, r.ganadorNombre ?? '', r.numeroGanador));
  });

  protected readonly leyenda = [
    { tono: 'disponible' as const, etiqueta: 'Disponible' },
    { tono: 'reservada' as const, etiqueta: 'Reservada (sin pagar)' },
    { tono: 'pagada' as const, etiqueta: 'Pagada' },
    { tono: 'seleccionada' as const, etiqueta: 'Seleccionada' },
  ];

  protected readonly filtros: { valor: Filtro; etiqueta: string }[] = [
    { valor: 'TODAS', etiqueta: 'Todas' },
    { valor: 'DISPONIBLE', etiqueta: 'Disponibles' },
    { valor: 'RESERVADA', etiqueta: 'Reservadas' },
    { valor: 'PAGADA', etiqueta: 'Pagadas' },
  ];

  ngOnInit() {
    this.cargar();
    // Tiempo real: cualquier cambio (de este u otro administrador) recarga la matriz
    escucharCambios(this.id(), this.destroyRef)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargar());
    const reloj = setInterval(() => this.ahora.set(Date.now()), 30_000);
    this.destroyRef.onDestroy(() => clearInterval(reloj));
  }

  private cargar() {
    forkJoin([this.rifasService.obtener(this.id()), this.rifasService.boletas(this.id())]).subscribe({
      next: ([rifa, boletas]) => {
        this.rifa.set(rifa);
        this.boletas.set(boletas);
        // Quita de la selección los números que alguien más vendió entretanto
        const libres = new Set(boletas.filter((b) => b.estado === 'DISPONIBLE').map((b) => b.numero));
        this.seleccion.update((s) => s.filter((n) => libres.has(n)));
      },
      error: (e) => {
        this.avisos.error(mensajeError(e));
        if (!this.rifa()) this.router.navigate(['/admin']);
      },
    });
  }

  elegir(numero: number) {
    const boleta = this.boletas().find((b) => b.numero === numero);
    if (!boleta) return;
    if (boleta.venta) {
      this.abrirComprador(boleta.venta.id, numero);
    } else if (this.abierta()) {
      this.seleccion.update((s) => (s.includes(numero) ? s.filter((n) => n !== numero) : [...s, numero].sort((a, b) => a - b)));
    }
  }

  limpiarSeleccion() {
    this.seleccion.set([]);
  }

  vender() {
    const rifa = this.rifa();
    if (!rifa || !this.seleccion().length) return;
    const data: DatosVenta = {
      rifa,
      numeros: this.seleccion(),
      compradores: this.compradores().map((c) => ({
        nombre: c.nombre,
        telefono: c.telefono,
        numeros: c.boletas.map((b) => b.numero),
      })),
    };
    const ref = this.dialog.open<Venta>(VentaDialog, { data, width: '100%', maxWidth: '30rem', disableClose: true });
    ref.closed.subscribe((venta) => {
      if (venta) this.seleccion.set([]);
      this.cargar();
    });
  }

  abrirComprador(ventaId: string, numero?: number) {
    const rifa = this.rifa();
    if (!rifa) return;
    const data: DatosPanelVenta = { rifa, ventaId, numero };
    this.dialog
      .open(VentaPanel, { data, width: '100%', maxWidth: '34rem' })
      .closed.subscribe(() => this.cargar());
  }

  finalizar() {
    const rifa = this.rifa();
    if (!rifa) return;
    const data: DatosFinalizar = { rifa, boletas: this.boletas() };
    this.dialog
      .open<Rifa>(FinalizarDialog, { data, width: '100%', maxWidth: '28rem', disableClose: true })
      .closed.subscribe((r) => {
        if (r) {
          this.avisos.exito('Rifa finalizada.');
          this.cargar();
        }
      });
  }

  async cancelar() {
    const rifa = this.rifa();
    if (!rifa) return;
    const ok = await confirmar(this.dialog, {
      titulo: 'Cancelar rifa',
      mensaje: `La rifa "${rifa.nombre}" pasará al historial como cancelada y no admitirá más cambios. Esta acción no se puede deshacer.`,
      confirmar: 'Cancelar rifa',
      peligro: true,
    });
    if (!ok) return;
    this.rifasService.cancelar(rifa.id).subscribe({
      next: () => {
        this.avisos.info('Rifa cancelada.');
        this.cargar();
      },
      error: (e) => this.avisos.error(mensajeError(e)),
    });
  }

  exportar(formato: 'pdf' | 'excel') {
    this.exportando.set(formato);
    this.rifasService.exportar(this.id(), formato).subscribe({
      next: () => this.exportando.set(''),
      error: (e) => {
        this.avisos.error(mensajeError(e, 'No fue posible generar el archivo.'));
        this.exportando.set('');
      },
    });
  }

  async copiarEnlacePublico() {
    const url = `${location.origin}/rifa/${this.id()}`;
    try {
      await navigator.clipboard.writeText(url);
      this.avisos.exito('Enlace del portal copiado.');
    } catch {
      this.avisos.info(url);
    }
  }
}
