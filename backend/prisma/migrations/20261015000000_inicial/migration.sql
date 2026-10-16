-- CreateEnum
CREATE TYPE "EstadoRifa" AS ENUM ('ACTIVA', 'FINALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoBoleta" AS ENUM ('DISPONIBLE', 'RESERVADA', 'PAGADA');

-- CreateEnum
CREATE TYPE "ResultadoSorteo" AS ENUM ('GANADOR', 'CASA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rifas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "premioNombre" TEXT NOT NULL,
    "premioDescripcion" TEXT,
    "premioUrl" TEXT,
    "premioImagenUrl" TEXT,
    "valorBoleta" INTEGER NOT NULL,
    "fechaSorteo" TIMESTAMP(3) NOT NULL,
    "loteria" TEXT NOT NULL,
    "responsableNombre" TEXT NOT NULL,
    "responsableTelefono" TEXT NOT NULL,
    "estado" "EstadoRifa" NOT NULL DEFAULT 'ACTIVA',
    "resultadoLoteria" TEXT,
    "numeroGanador" INTEGER,
    "resultado" "ResultadoSorteo",
    "ganadorNombre" TEXT,
    "ganadorTelefono" TEXT,
    "finalizadaEn" TIMESTAMP(3),
    "canceladaEn" TIMESTAMP(3),
    "creadaPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rifas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" TEXT NOT NULL,
    "rifaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boletas" (
    "id" TEXT NOT NULL,
    "rifaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "estado" "EstadoBoleta" NOT NULL DEFAULT 'DISPONIBLE',
    "ventaId" TEXT,
    "reservadaEn" TIMESTAMP(3),
    "pagadaEn" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boletas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_boleta" (
    "id" TEXT NOT NULL,
    "boletaId" TEXT NOT NULL,
    "estadoAnterior" "EstadoBoleta" NOT NULL,
    "estadoNuevo" "EstadoBoleta" NOT NULL,
    "ventaId" TEXT,
    "nombre" TEXT,
    "telefono" TEXT,
    "motivo" TEXT,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_boleta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "rifas_estado_idx" ON "rifas"("estado");

-- CreateIndex
CREATE INDEX "ventas_rifaId_idx" ON "ventas"("rifaId");

-- CreateIndex
CREATE INDEX "ventas_telefono_idx" ON "ventas"("telefono");

-- CreateIndex
CREATE INDEX "boletas_rifaId_estado_idx" ON "boletas"("rifaId", "estado");

-- CreateIndex
CREATE INDEX "boletas_ventaId_idx" ON "boletas"("ventaId");

-- CreateIndex
CREATE UNIQUE INDEX "boletas_rifaId_numero_key" ON "boletas"("rifaId", "numero");

-- CreateIndex
CREATE INDEX "movimientos_boleta_boletaId_idx" ON "movimientos_boleta"("boletaId");

-- AddForeignKey
ALTER TABLE "rifas" ADD CONSTRAINT "rifas_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_rifaId_fkey" FOREIGN KEY ("rifaId") REFERENCES "rifas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletas" ADD CONSTRAINT "boletas_rifaId_fkey" FOREIGN KEY ("rifaId") REFERENCES "rifas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletas" ADD CONSTRAINT "boletas_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_boleta" ADD CONSTRAINT "movimientos_boleta_boletaId_fkey" FOREIGN KEY ("boletaId") REFERENCES "boletas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_boleta" ADD CONSTRAINT "movimientos_boleta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

