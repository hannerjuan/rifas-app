import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { prisma } from '../../config/database';
import { ETIQUETA_ESTADO, formatoFecha, formatoNumero, formatoPesos } from '../../lib/formato';
import { formatoTelefono } from '../../lib/telefono';
import { buscarRifa, calcularMetricas, conteoPorRifa } from './rifa.service';

interface FilaComprador {
    nombre: string;
    telefono: string;
    pagadas: number[];
    reservadas: number[];
    total: number;
    pendiente: number;
}

// Datos comunes de ambos formatos: la rifa, sus métricas y una fila por venta (orden alfabético)
async function datosExportacion(rifaId: string) {
    const rifa = await buscarRifa(rifaId);
    const [conteos, ventas, boletas] = await Promise.all([
        conteoPorRifa([rifaId]),
        prisma.venta.findMany({
            where: { rifaId },
            orderBy: { nombre: 'asc' },
            include: { boletas: { select: { numero: true, estado: true }, orderBy: { numero: 'asc' } } },
        }),
        prisma.boleta.findMany({
            where: { rifaId },
            orderBy: { numero: 'asc' },
            include: { venta: { select: { nombre: true, telefono: true } } },
        }),
    ]);
    const metricas = calcularMetricas(conteos.get(rifaId) ?? {}, rifa.valorBoleta);
    const filas: FilaComprador[] = ventas.map((v) => {
        const pagadas = v.boletas.filter((b) => b.estado === 'PAGADA').map((b) => b.numero);
        const reservadas = v.boletas.filter((b) => b.estado === 'RESERVADA').map((b) => b.numero);
        return {
            nombre: v.nombre,
            telefono: v.telefono,
            pagadas,
            reservadas,
            total: v.boletas.length * rifa.valorBoleta,
            pendiente: reservadas.length * rifa.valorBoleta,
        };
    });
    return { rifa, metricas, filas, boletas };
}

function nombreArchivo(nombre: string, extension: string) {
    const base = nombre
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
    return `compradores-${base || 'rifa'}.${extension}`;
}

const lista = (numeros: number[]) => numeros.map(formatoNumero).join(', ');

// ---------------------------------------------------------------------------------------------
// PDF (carta vertical)
// ---------------------------------------------------------------------------------------------
export async function exportarPdf(rifaId: string, res: Response) {
    const { rifa, metricas, filas } = await datosExportacion(rifaId);

    const doc = new PDFDocument({ size: 'LETTER', margin: 40, bufferPages: true, info: { Title: `Compradores - ${rifa.nombre}` } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo(rifa.nombre, 'pdf')}"`);
    doc.pipe(res);

    const izq = doc.page.margins.left;
    const ancho = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Encabezado
    doc.font('Helvetica-Bold').fontSize(16).text('Listado de compradores', izq, 40);
    doc.font('Helvetica-Bold').fontSize(12).text(rifa.nombre);
    doc.moveDown(0.3).font('Helvetica').fontSize(9);
    doc.text(`Premio: ${rifa.premioNombre}`);
    doc.text(`Sorteo: ${formatoFecha(rifa.fechaSorteo)} · ${rifa.loteria} (dos últimas cifras)`);
    doc.text(`Valor de la boleta: ${formatoPesos(rifa.valorBoleta)} · Responsable: ${rifa.responsableNombre} (${formatoTelefono(rifa.responsableTelefono)})`);
    if (rifa.estado === 'FINALIZADA') {
        const quien = rifa.resultado === 'GANADOR' ? `ganador: ${rifa.ganadorNombre}` : 'boleta no pagada: el premio queda para el vendedor';
        doc.font('Helvetica-Bold').text(`Resultado: ${rifa.resultadoLoteria} → número ${formatoNumero(rifa.numeroGanador!)} (${quien})`);
        doc.font('Helvetica');
    } else if (rifa.estado === 'CANCELADA') {
        doc.font('Helvetica-Bold').text('Rifa cancelada').font('Helvetica');
    }
    doc.moveDown(0.3);
    doc.text(
        `Pagadas: ${metricas.pagadas} · Reservadas: ${metricas.reservadas} · Disponibles: ${metricas.disponibles} · ` +
            `Recaudado: ${formatoPesos(metricas.recaudado)} · Por cobrar: ${formatoPesos(metricas.porCobrar)}`
    );
    doc.fillColor('#666').text(`Generado: ${formatoFecha(new Date())}`).fillColor('#000');
    doc.moveDown(0.8);

    // Tabla
    const columnas = [
        { titulo: '#', ancho: 22, alinear: 'left' as const },
        { titulo: 'Comprador', ancho: 125, alinear: 'left' as const },
        { titulo: 'WhatsApp', ancho: 70, alinear: 'left' as const },
        { titulo: 'Pagadas', ancho: 105, alinear: 'left' as const },
        { titulo: 'Reservadas', ancho: 105, alinear: 'left' as const },
        { titulo: 'Total', ancho: 52, alinear: 'right' as const },
        { titulo: 'Pendiente', ancho: ancho - 22 - 125 - 70 - 105 - 105 - 52, alinear: 'right' as const },
    ];
    const relleno = 3;
    const limiteInferior = () => doc.page.height - doc.page.margins.bottom - 20;

    const dibujarFila = (celdas: string[], negrita: boolean, fondo?: string) => {
        doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
        const alto =
            Math.max(...celdas.map((c, i) => doc.heightOfString(c || ' ', { width: columnas[i].ancho - relleno * 2 }))) + relleno * 2;
        if (doc.y + alto > limiteInferior()) {
            doc.addPage();
            doc.y = doc.page.margins.top;
            if (!negrita) dibujarFila(columnas.map((c) => c.titulo), true, '#e5e7eb');
        }
        const y = doc.y;
        if (fondo) doc.rect(izq, y, ancho, alto).fill(fondo).fillColor('#000');
        let x = izq;
        celdas.forEach((c, i) => {
            doc.text(c, x + relleno, y + relleno, { width: columnas[i].ancho - relleno * 2, align: columnas[i].alinear });
            x += columnas[i].ancho;
        });
        doc.moveTo(izq, y + alto).lineTo(izq + ancho, y + alto).lineWidth(0.5).strokeColor('#d1d5db').stroke();
        doc.y = y + alto;
    };

    dibujarFila(columnas.map((c) => c.titulo), true, '#e5e7eb');
    if (filas.length === 0) {
        doc.moveDown().font('Helvetica-Oblique').fontSize(9).text('Aún no hay compradores registrados.', izq);
    }
    filas.forEach((f, i) =>
        dibujarFila(
            [
                String(i + 1),
                f.nombre,
                formatoTelefono(f.telefono),
                lista(f.pagadas),
                lista(f.reservadas),
                formatoPesos(f.total),
                f.pendiente ? formatoPesos(f.pendiente) : '—',
            ],
            false,
            i % 2 ? '#f9fafb' : undefined
        )
    );

    doc.moveDown(1).font('Helvetica-Oblique').fontSize(8).fillColor('#444');
    doc.text('Las boletas que no estén pagadas antes del sorteo no participan.', izq, doc.y, { width: ancho });

    // Numeración de páginas
    const paginas = doc.bufferedPageRange();
    for (let i = 0; i < paginas.count; i++) {
        doc.switchToPage(i);
        // El pie queda dentro del margen inferior: se anula el margen para que pdfkit no cree otra página
        const margenInferior = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        doc.font('Helvetica').fontSize(8).fillColor('#666');
        doc.text(`Página ${i + 1} de ${paginas.count}`, izq, doc.page.height - 30, { width: ancho, align: 'right', lineBreak: false });
        doc.page.margins.bottom = margenInferior;
    }
    doc.end();
}

// ---------------------------------------------------------------------------------------------
// Excel: hoja de compradores y hoja con las 100 boletas
// ---------------------------------------------------------------------------------------------
export async function exportarExcel(rifaId: string, res: Response) {
    const { rifa, metricas, filas, boletas } = await datosExportacion(rifaId);

    const libro = new ExcelJS.Workbook();
    libro.creator = 'Rifas';
    libro.created = new Date();
    const formatoMoneda = '"$"#,##0';

    // Hoja 1: compradores
    const hoja = libro.addWorksheet('Compradores');
    hoja.columns = [
        { key: 'n', width: 6 },
        { key: 'nombre', width: 32 },
        { key: 'telefono', width: 16 },
        { key: 'pagadas', width: 30 },
        { key: 'reservadas', width: 30 },
        { key: 'cantidad', width: 10 },
        { key: 'total', width: 14 },
        { key: 'pendiente', width: 14 },
    ];
    hoja.addRow([rifa.nombre]).font = { bold: true, size: 14 };
    hoja.addRow([`Premio: ${rifa.premioNombre}`]);
    hoja.addRow([`Sorteo: ${formatoFecha(rifa.fechaSorteo)} · ${rifa.loteria} · Valor boleta: ${formatoPesos(rifa.valorBoleta)}`]);
    hoja.addRow([
        `Pagadas: ${metricas.pagadas} · Reservadas: ${metricas.reservadas} · Disponibles: ${metricas.disponibles} · ` +
            `Recaudado: ${formatoPesos(metricas.recaudado)} · Por cobrar: ${formatoPesos(metricas.porCobrar)}`,
    ]);
    if (rifa.estado === 'FINALIZADA') {
        hoja.addRow([
            `Resultado: ${rifa.resultadoLoteria} → ${formatoNumero(rifa.numeroGanador!)} · ` +
                (rifa.resultado === 'GANADOR' ? `Ganador: ${rifa.ganadorNombre}` : 'Premio para el vendedor (boleta no pagada)'),
        ]).font = { bold: true };
    }
    hoja.addRow([]);

    const encabezado = hoja.addRow(['#', 'Comprador', 'WhatsApp', 'Pagadas', 'Reservadas', 'Boletas', 'Total', 'Pendiente']);
    encabezado.font = { bold: true };
    encabezado.eachCell((c) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        c.border = { bottom: { style: 'thin' } };
    });
    const filaEncabezado = encabezado.number;

    filas.forEach((f, i) => {
        const fila = hoja.addRow([
            i + 1,
            f.nombre,
            formatoTelefono(f.telefono),
            lista(f.pagadas),
            lista(f.reservadas),
            f.pagadas.length + f.reservadas.length,
            f.total,
            f.pendiente,
        ]);
        fila.getCell(7).numFmt = formatoMoneda;
        fila.getCell(8).numFmt = formatoMoneda;
        fila.alignment = { vertical: 'top', wrapText: true };
    });
    hoja.views = [{ state: 'frozen', ySplit: filaEncabezado }];
    hoja.autoFilter = { from: { row: filaEncabezado, column: 1 }, to: { row: filaEncabezado, column: 8 } };

    // Hoja 2: las 100 boletas
    const hojaBoletas = libro.addWorksheet('Boletas 00-99');
    hojaBoletas.columns = [
        { header: 'Número', key: 'numero', width: 10 },
        { header: 'Estado', key: 'estado', width: 14 },
        { header: 'Comprador', key: 'nombre', width: 32 },
        { header: 'WhatsApp', key: 'telefono', width: 16 },
    ];
    hojaBoletas.getRow(1).font = { bold: true };
    const colores: Record<string, string> = { DISPONIBLE: 'FFF3F4F6', RESERVADA: 'FFFEF3C7', PAGADA: 'FFD1FAE5' };
    for (const b of boletas) {
        const fila = hojaBoletas.addRow({
            numero: formatoNumero(b.numero),
            estado: ETIQUETA_ESTADO[b.estado],
            nombre: b.venta?.nombre ?? '',
            telefono: b.venta ? formatoTelefono(b.venta.telefono) : '',
        });
        fila.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colores[b.estado] } };
    }
    hojaBoletas.views = [{ state: 'frozen', ySplit: 1 }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo(rifa.nombre, 'xlsx')}"`);
    await libro.xlsx.write(res);
    res.end();
}
