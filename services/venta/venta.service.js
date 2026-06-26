const db = require('../../config/db');

// ============================================
// GENERAR NÚMERO DE NOTA CORRELATIVO
// ============================================
exports.generarNumeroNota = async () => {
    const [result] = await db.query('CALL sp_generar_numero_nota(@p_numero)');
    const [rows] = await db.query('SELECT @p_numero AS numero');
    return rows[0].numero;
};

// ============================================
// LISTAR VENTAS
// ============================================
exports.getVentas = async () => {
    const [rows] = await db.query('CALL sp_listar_ventas()');
    return rows[0];
};

// ============================================
// OBTENER VENTA POR ID
// ============================================
exports.getVentaById = async (id) => {
    const [rows] = await db.query('CALL sp_obtener_venta(?)', [id]);
    return rows[0][0] || null;
};

// ============================================
// OBTENER DETALLES DE VENTA
// ============================================
exports.getDetallesVenta = async (idVenta) => {
    const [rows] = await db.query('CALL sp_detalle_venta_listar_por_venta(?)', [idVenta]);
    return rows[0];
};

// ============================================
// OBTENER PAGOS DE VENTA
// ============================================
exports.getPagosVenta = async (idVenta) => {
    const [rows] = await db.query('CALL sp_pago_venta_listar_por_venta(?)', [idVenta]);
    return rows[0];
};

// ============================================
// OBTENER CUOTAS DE VENTA
// ============================================
exports.getCuotasVenta = async (idVenta) => {
    const [rows] = await db.query('CALL sp_cuota_venta_listar_por_venta(?)', [idVenta]);
    return rows[0];
};

// ============================================
// CREAR VENTA (CORREGIDO)
// ============================================
exports.createVenta = async (body, idUsuarioSesion) => {
    const {
        numero_nota_venta,
        id_cotizacion,
        id_cliente,
        modalidad_pago,
        total_venta,
        observacion,
        productos,
        pagos,           // Si no hay pagos, se asume EFECTIVO por el total
        cantidad_cuotas,
        intervalo_dias
    } = body;

    // ─── VALIDACIONES BÁSICAS ───
    if (!numero_nota_venta || numero_nota_venta.trim() === '') {
        throw new Error('El número de nota de venta es obligatorio');
    }
    if (!id_cliente) throw new Error('El cliente es obligatorio');
    if (!idUsuarioSesion) throw new Error('Usuario no autenticado');
    if (!modalidad_pago) throw new Error('La modalidad de pago es obligatoria');
    if (!total_venta || total_venta <= 0) throw new Error('El total de la venta es inválido');
    if (!productos || productos.length === 0) throw new Error('Debe agregar al menos un producto');

    // ─── PROCESAR PAGOS ───
    let pagosFinales = [];

    if (!pagos || pagos.length === 0) {
        // Si no se enviaron pagos, asumir EFECTIVO por el total
        pagosFinales = [{
            metodo_pago: 'EFECTIVO',
            monto: total_venta,
            numero_operacion: null,
            observacion: null
        }];
    } else {
        // Validar pagos enviados
        const metodosUsados = new Set();
        let totalPagado = 0;

        for (const pago of pagos) {
            if (!pago.metodo_pago) throw new Error('Cada pago debe tener un método');
            if (!pago.monto || parseFloat(pago.monto) <= 0) throw new Error('Cada pago debe tener un monto mayor a 0');

            const metodoUpper = pago.metodo_pago.toUpperCase();
            if (!['EFECTIVO', 'YAPE', 'PLIN', 'TARJETA', 'TRANSFERENCIA'].includes(metodoUpper)) {
                throw new Error(`Método de pago inválido: ${pago.metodo_pago}`);
            }

            if (metodosUsados.has(metodoUpper)) {
                throw new Error(`No puede usar ${metodoUpper} más de una vez`);
            }
            metodosUsados.add(metodoUpper);

            if (metodoUpper !== 'EFECTIVO' && (!pago.numero_operacion || pago.numero_operacion.trim() === '')) {
                throw new Error(`El número de operación es obligatorio para ${metodoUpper}`);
            }

            totalPagado += parseFloat(pago.monto);
            pagosFinales.push({
                metodo_pago: metodoUpper,
                monto: parseFloat(pago.monto),
                numero_operacion: pago.numero_operacion || null,
                observacion: pago.observacion || null
            });
        }

        // ─── VALIDAR CONTADO ───
        if (modalidad_pago.toUpperCase() === 'CONTADO') {
            if (totalPagado > total_venta) {
                // Ajustar el último pago
                const excedente = totalPagado - total_venta;
                pagosFinales[pagosFinales.length - 1].monto = parseFloat((pagosFinales[pagosFinales.length - 1].monto - excedente).toFixed(2));
                totalPagado = total_venta;
            }
            if (totalPagado < total_venta) {
                throw new Error(`El pago total (S/ ${totalPagado.toFixed(2)}) no cubre el total (S/ ${total_venta.toFixed(2)})`);
            }
        }

        // ─── VALIDAR CRÉDITO ───
        if (modalidad_pago.toUpperCase() === 'CREDITO') {
            const deuda = total_venta - totalPagado;
            if (deuda <= 0) {
                throw new Error('No hay deuda pendiente. Use modalidad CONTADO.');
            }
            if (!cantidad_cuotas || cantidad_cuotas <= 0) {
                throw new Error('Para crédito, la cantidad de cuotas es obligatoria');
            }
            if (!intervalo_dias || intervalo_dias <= 0) {
                throw new Error('Para crédito, el intervalo de días es obligatorio');
            }
        }
    }

    // ─── TRANSACCIÓN ───
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const totalPagado = pagosFinales.reduce((s, p) => s + p.monto, 0);

        // 1. Registrar venta
        await connection.query(
            'CALL sp_registrar_venta(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @venta_id)',
            [
                numero_nota_venta.trim(),
                null,
                id_cotizacion || null,
                id_cliente,
                idUsuarioSesion,
                modalidad_pago.toUpperCase(),
                totalPagado,
                cantidad_cuotas || 0,
                intervalo_dias || 0,
                total_venta,
                observacion || null
            ]
        );

        const [ventaIdResult] = await connection.query('SELECT @venta_id AS id');
        const ventaId = ventaIdResult[0].id;
        if (!ventaId) throw new Error('No se pudo registrar la venta');

        // 2. Registrar detalles de productos
        for (const item of productos) {
            await connection.query(
                'CALL sp_detalle_venta_registrar(?, ?, ?, ?)',
                [item.id_producto, ventaId, item.precio_unitario, item.cantidad]
            );
        }

        // 3. Registrar pagos
        for (const pago of pagosFinales) {
            await connection.query(
                'CALL sp_pago_venta_registrar_detallado(?, ?, ?, ?, ?)',
                [ventaId, pago.metodo_pago, pago.monto, pago.numero_operacion, pago.observacion]
            );
        }

        // 4. Generar cuotas si es crédito con deuda
        const deudaFinal = total_venta - totalPagado;
        if (modalidad_pago.toUpperCase() === 'CREDITO' && deudaFinal > 0 && cantidad_cuotas > 0) {
            const montoPorCuota = parseFloat((deudaFinal / cantidad_cuotas).toFixed(2));
            const ajusteUltima = parseFloat((deudaFinal - (montoPorCuota * (cantidad_cuotas - 1))).toFixed(2));
            const fechaVenta = new Date();

            for (let i = 1; i <= cantidad_cuotas; i++) {
                const fechaVencimiento = new Date(fechaVenta);
                fechaVencimiento.setDate(fechaVencimiento.getDate() + (intervalo_dias * i));
                const fechaVencimientoStr = fechaVencimiento.toISOString().split('T')[0];
                const monto = i === cantidad_cuotas ? ajusteUltima : montoPorCuota;

                await connection.query(
                    'CALL sp_registrar_cuota_venta(?, ?, ?, ?, ?)',
                    [ventaId, monto, i, fechaVencimientoStr, 0]
                );
            }
        }

        // 5. Marcar cotización como procesada
        if (id_cotizacion) {
            await connection.query('CALL sp_cotizacion_cambiar_estado(?, ?)', [id_cotizacion, 3]);
        }

        await connection.commit();
        connection.release();

        return {
            id: ventaId,
            numero_nota_venta,
            message: 'Venta registrada correctamente'
        };

    } catch (error) {
        await connection.rollback();
        connection.release();
        throw new Error(error.message);
    }
};

// ============================================
// CAMBIAR ESTADO DE VENTA
// ============================================
exports.cambiarEstado = async (id, estado) => {
    if (![0, 1, 2, 3].includes(Number(estado))) {
        throw new Error('Estado inválido. Use: 0=Pago Parcial, 1=Pagada, 2=Anulada, 3=Eliminada');
    }
    await db.query('CALL sp_cambiar_estado_venta(?, ?)', [id, estado]);
    const mensajes = {
        0: 'Venta marcada como Pago Parcial',
        1: 'Venta marcada como Pagada',
        2: 'Venta anulada correctamente',
        3: 'Venta eliminada correctamente'
    };
    return { message: mensajes[estado] };
};

// ============================================
// ELIMINAR VENTA (LÓGICO)
// ============================================
exports.deleteVenta = async (id) => {
    const venta = await exports.getVentaById(id);
    if (!venta) throw new Error('Venta no encontrada');
    if (venta.estado !== 2) throw new Error('Solo se pueden eliminar ventas que están anuladas');
    await db.query('CALL sp_eliminar_venta_logico(?)', [id]);
    return { message: 'Venta eliminada correctamente' };
};

// ============================================
// REGISTRAR PAGO ADICIONAL
// ============================================
exports.registrarPagoAdicional = async (idVenta, body) => {
    const { monto, metodo_pago, numero_operacion, observacion } = body;
    if (!monto || monto <= 0) throw new Error('El monto debe ser mayor a 0');
    if (!metodo_pago) throw new Error('El método de pago es obligatorio');

    const venta = await exports.getVentaById(idVenta);
    if (!venta) throw new Error('Venta no encontrada');
    if (venta.estado === 1) throw new Error('La venta ya está pagada');
    if (venta.estado === 2) throw new Error('La venta está anulada');

    const deuda = parseFloat(venta.deuda) || 0;
    if (monto > deuda) throw new Error(`El monto excede la deuda (S/ ${deuda.toFixed(2)})`);

    await db.query('CALL sp_pago_venta_registrar_detallado(?, ?, ?, ?, ?)',
        [idVenta, metodo_pago.toUpperCase(), monto, numero_operacion || null, observacion || null]);

    const ventaActualizada = await exports.getVentaById(idVenta);
    if (parseFloat(ventaActualizada.deuda) <= 0 && ventaActualizada.estado === 0) {
        await db.query('CALL sp_cambiar_estado_venta(?, ?)', [idVenta, 1]);
    }

    return { message: 'Pago registrado correctamente' };
};

// ============================================
// REGISTRAR PAGO DE CUOTA MIXTO
// ============================================
exports.registrarPagoCuotaMixto = async (body) => {
    const { id_cuota_venta, pagos, observacion } = body;
    if (!id_cuota_venta) throw new Error('La cuota es obligatoria');
    if (!pagos || pagos.length === 0) throw new Error('Debe especificar al menos un pago');
    if (pagos.length > 2) throw new Error('Máximo 2 métodos de pago');

    const pago1 = pagos[0];
    const pago2 = pagos.length > 1 ? pagos[1] : {};

    await db.query('CALL sp_registrar_pago_cuota_mixto(?, ?, ?, ?, ?, ?, ?, ?)', [
        id_cuota_venta,
        pago1.metodo_pago, pago1.monto, pago1.numero_operacion || null,
        pago2.metodo_pago || null, pago2.monto || 0, pago2.numero_operacion || null,
        observacion || null
    ]);

    return { message: 'Pago de cuota registrado correctamente' };
};