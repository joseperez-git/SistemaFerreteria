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
// LISTAR VENTAS (NO MOSTRAR ELIMINADAS)
// ============================================
exports.getVentas = async () => {
    const [rows] = await db.query('CALL sp_listar_ventas()');
    // Filtrar eliminadas (estado 3)
    return rows[0].filter(v => v.estado != 3);
};

// ============================================
// OBTENER VENTA POR ID
// ============================================
exports.getVentaById = async (id) => {
    const [rows] = await db.query('CALL sp_obtener_venta(?)', [id]);
    return rows[0][0];
};

// ============================================
// OBTENER DETALLES DE VENTA
// ============================================
exports.getDetallesVenta = async (idVenta) => {
    const [rows] = await db.query('CALL sp_detalle_venta_listar_por_venta(?)', [idVenta]);
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
// OBTENER CUOTA POR ID
// ============================================
exports.getCuotaById = async (idCuota) => {
    const [rows] = await db.query('CALL sp_obtener_cuota_venta_por_id(?)', [idCuota]);
    return rows[0][0];
};

// ============================================
// OBTENER PAGOS DE VENTA
// ============================================
exports.getPagosVenta = async (idVenta) => {
    const [rows] = await db.query('CALL sp_pago_venta_listar_por_venta(?)', [idVenta]);
    return rows[0];
};

// ============================================
// CREAR VENTA (CON PAGO MIXTO Y VALIDACIONES)
// ============================================
exports.createVenta = async (body) => {
    const {
        numero_nota_venta,
        id_pedido,
        id_cliente,
        id_usuario,
        modalidad_pago,
        total_venta,
        observacion,
        productos,
        pagos,           // ← NUEVO: array de pagos [{metodo_pago, monto, numero_operacion, observacion}]
        cantidad_cuotas,
        intervalo_dias
    } = body;

    // Validaciones
    if (!numero_nota_venta || numero_nota_venta.trim() === '') {
        throw new Error('El número de nota de venta es obligatorio');
    }
    if (!id_cliente) throw new Error('El cliente es obligatorio');
    if (!id_usuario) throw new Error('El usuario es obligatorio');
    if (!modalidad_pago) throw new Error('La modalidad de pago es obligatoria');
    if (!total_venta || total_venta <= 0) throw new Error('El total de la venta es inválido');
    if (!productos || productos.length === 0) throw new Error('Debe agregar al menos un producto');

    // Validar pagos
    if (!pagos || pagos.length === 0) {
        throw new Error('Debe especificar al menos un método de pago');
    }

    let totalPagado = 0;
    for (const pago of pagos) {
        if (!pago.metodo_pago) throw new Error('Cada pago debe tener un método');
        if (!pago.monto || pago.monto <= 0) throw new Error('Cada pago debe tener un monto mayor a 0');
        if (pago.metodo_pago !== 'EFECTIVO' && (!pago.numero_operacion || pago.numero_operacion.trim() === '')) {
            throw new Error(`El número de operación es obligatorio para ${pago.metodo_pago}`);
        }
        totalPagado += parseFloat(pago.monto);
    }

    // Validar que el pago cubra el total para CONTADO
    if (modalidad_pago === 'CONTADO') {
        if (totalPagado < total_venta) {
            throw new Error(`El pago total (S/ ${totalPagado.toFixed(2)}) no cubre el total de la venta (S/ ${total_venta.toFixed(2)})`);
        }
    }

    // Para CRÉDITO, validar cuotas
    if (modalidad_pago === 'CREDITO') {
        if (!cantidad_cuotas || cantidad_cuotas <= 0) {
            throw new Error('Para crédito, la cantidad de cuotas es obligatoria');
        }
        if (!intervalo_dias || intervalo_dias <= 0) {
            throw new Error('Para crédito, el intervalo de días es obligatorio');
        }
        const deuda = total_venta - totalPagado;
        if (deuda <= 0 && cantidad_cuotas > 0) {
            throw new Error('No puede haber cuotas si el pago inicial cubre el total');
        }
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // Calcular estado inicial
        const deudaCalculada = total_venta - totalPagado;
        const estadoInicial = deudaCalculada > 0 ? 0 : 1; // 0=Pago Parcial, 1=Pagada

        // Registrar venta
        const [result] = await connection.query(
            'CALL sp_registrar_venta(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @venta_id)',
            [
                numero_nota_venta.trim(),
                id_pedido || null,
                id_cliente,
                id_usuario,
                modalidad_pago,
                totalPagado,        // pago_inicial = total pagado
                cantidad_cuotas || 0,
                intervalo_dias || 0,
                total_venta,
                observacion || null
            ]
        );

        const [ventaIdResult] = await connection.query('SELECT @venta_id AS id');
        const ventaId = ventaIdResult[0].id;

        if (!ventaId) throw new Error('No se pudo obtener el ID de la venta');

        // Actualizar estado según deuda
        if (estadoInicial === 1) {
            await connection.query('UPDATE venta SET estado = 1 WHERE id = ?', [ventaId]);
        }

        // Registrar detalles
        for (const item of productos) {
            await connection.query(
                'CALL sp_detalle_venta_registrar(?, ?, ?, ?)',
                [item.id_producto, ventaId, item.precio_unitario, item.cantidad]
            );
        }

        // Registrar PAGOS (pago mixto)
        for (const pago of pagos) {
            await connection.query(
                'CALL sp_pago_venta_registrar_detallado(?, ?, ?, ?, ?)',
                [
                    ventaId,
                    pago.metodo_pago,
                    pago.monto,
                    pago.numero_operacion || null,
                    pago.observacion || null
                ]
            );
        }

        // Registrar cuotas para crédito (solo si hay deuda)
        if (modalidad_pago === 'CREDITO' && deudaCalculada > 0 && cantidad_cuotas > 0) {
            const montoPorCuota = deudaCalculada / cantidad_cuotas;
            const fechaVenta = new Date();

            for (let i = 1; i <= cantidad_cuotas; i++) {
                const fechaVencimiento = new Date(fechaVenta);
                fechaVencimiento.setDate(fechaVencimiento.getDate() + (intervalo_dias * i));
                const fechaVencimientoStr = fechaVencimiento.toISOString().split('T')[0];

                await connection.query(
                    'CALL sp_registrar_cuota_venta(?, ?, ?, ?, ?)',
                    [ventaId, montoPorCuota, i, fechaVencimientoStr, 0]
                );
            }
        }

        await connection.commit();
        connection.release();

        return {
            id: ventaId,
            numero_nota_venta: numero_nota_venta,
            message: 'Venta registrada correctamente'
        };

    } catch (error) {
        await connection.rollback();
        connection.release();
        throw new Error(error.message);
    }
};

// ============================================
// ACTUALIZAR VENTA
// ============================================
exports.updateVenta = async (id, body) => {
    const { estado } = body;

    // Si solo cambia estado
    if (estado !== undefined && Object.keys(body).length === 1) {
        await db.query('CALL sp_cambiar_estado_venta(?, ?)', [id, estado]);
        let mensaje = '';
        if (estado === 0) mensaje = 'Venta marcada como Pago Parcial';
        if (estado === 1) mensaje = 'Venta marcada como Pagada';
        if (estado === 2) mensaje = 'Venta anulada correctamente';
        return { message: mensaje };
    }

    throw new Error('Actualización no soportada');
};

// ============================================
// CAMBIAR ESTADO VENTA
// ============================================
exports.cambiarEstado = async (id, estado) => {
    if (![0, 1, 2].includes(estado)) {
        throw new Error('Estado inválido. Use 0=Pago Parcial, 1=Pagada, 2=Anulada');
    }

    await db.query('CALL sp_cambiar_estado_venta(?, ?)', [id, estado]);

    const mensajes = {
        0: 'Venta marcada como Pago Parcial',
        1: 'Venta marcada como Pagada',
        2: 'Venta anulada correctamente'
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