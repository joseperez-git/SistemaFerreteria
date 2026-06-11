const db = require('../../config/db');

// ============================================
// LISTAR COTIZACIONES
// ============================================
exports.getCotizaciones = async () => {
    const [rows] = await db.query('CALL sp_cotizacion_listar()');
    return rows[0];
};

// ============================================
// OBTENER COTIZACIÓN POR ID
// ============================================
exports.getCotizacionById = async (id) => {
    const [rows] = await db.query('CALL sp_cotizacion_obtener(?)', [id]);
    const cotizacion = rows[0][0];

    if (cotizacion) {
        const detalles = await exports.getDetallesCotizacion(id);
        return {
            ...cotizacion,
            detalles
        };
    }
    return cotizacion;
};

// ============================================
// OBTENER DETALLES DE COTIZACIÓN
// ============================================
exports.getDetallesCotizacion = async (idCotizacion) => {
    const [rows] = await db.query('CALL sp_detalle_cotizacion_listar_por_cotizacion(?)', [idCotizacion]);
    return rows[0];
};

// ============================================
// GENERAR NÚMERO DE COTIZACIÓN
// ============================================
exports.generarNumeroCotizacion = async () => {
    const fecha = new Date();
    const año = fecha.getFullYear().toString().slice(-2);
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');

    // Contar SOLO las cotizaciones del día actual
    const [result] = await db.query(
        'SELECT COUNT(*) AS total FROM cotizacion WHERE DATE(fecha_creacion) = CURDATE()'
    );
    const count = (result[0]?.total || 0) + 1;

    return `COT-${año}${mes}${dia}-${String(count).padStart(4, '0')}`;
};

// ============================================
// CREAR COTIZACIÓN
// ============================================
exports.createCotizacion = async (body, idUsuarioSesion) => {
    const {
        id_cliente,
        fecha_vencimiento,
        observacion,
        productos
    } = body;

    // Validaciones
    if (!id_cliente) throw new Error('El cliente es obligatorio');
    if (!fecha_vencimiento) throw new Error('La fecha de vencimiento es obligatoria');
    if (!productos || productos.length === 0) throw new Error('Debe agregar al menos un producto');

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // Generar número de cotización
        const numeroCotizacion = await exports.generarNumeroCotizacion();

        // Calcular total
        let total = 0;
        for (const item of productos) {
            const subtotal = (parseFloat(item.precio_original) * parseInt(item.cantidad)) - parseFloat(item.descuento || 0);
            total += subtotal;
        }

        // Registrar cotización
        await connection.query(
            'CALL sp_cotizacion_registrar(?, ?, ?, ?, ?, ?, ?)',
            [
                numeroCotizacion,
                id_cliente,
                idUsuarioSesion,
                fecha_vencimiento,
                total,
                observacion || null,
                1 // estado: 1 = Activo
            ]
        );

        // Obtener ID de la cotización recién creada
        const [idResult] = await connection.query('CALL sp_cotizacion_obtener_por_numero(?, @p_id)', [numeroCotizacion]);
        const [cotizacionIdResult] = await connection.query('SELECT @p_id AS id');
        const cotizacionId = cotizacionIdResult[0].id;

        // Registrar detalles
        for (const item of productos) {
            await connection.query(
                'CALL sp_detalle_cotizacion_registrar(?, ?, ?, ?, ?, ?)',
                [
                    cotizacionId,
                    item.id_producto || null,
                    item.producto_nombre,
                    parseFloat(item.precio_original),
                    parseFloat(item.precio_final || item.precio_original),
                    parseInt(item.cantidad)
                ]
            );
        }

        await connection.commit();
        connection.release();

        return {
            id: cotizacionId,
            numero_cotizacion: numeroCotizacion,
            message: 'Cotización registrada correctamente'
        };

    } catch (error) {
        await connection.rollback();
        connection.release();
        throw new Error(error.message);
    }
};

// ============================================
// ACTUALIZAR COTIZACIÓN
// ============================================
exports.updateCotizacion = async (id, body, idUsuarioSesion) => {
    const {
        id_cliente,
        fecha_vencimiento,
        observacion,
        estado,
        productos
    } = body;

    // Si solo cambia estado
    if (estado !== undefined && Object.keys(body).length === 1) {
        await db.query('CALL sp_cotizacion_cambiar_estado(?, ?)', [id, estado]);
        let mensaje = '';
        if (estado === 0) mensaje = 'Cotización desactivada';
        if (estado === 1) mensaje = 'Cotización activada';
        if (estado === 2) mensaje = 'Cotización eliminada';
        if (estado === 3) mensaje = 'Cotización procesada';
        return { message: mensaje };
    }

    // Actualización completa
    if (!id_cliente) throw new Error('El cliente es obligatorio');
    if (!productos || productos.length === 0) throw new Error('Debe agregar al menos un producto');

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        let total = 0;
        for (const item of productos) {
            const subtotal = (parseFloat(item.precio_original) * parseInt(item.cantidad)) - parseFloat(item.descuento || 0);
            total += subtotal;
        }

        await connection.query(
            'CALL sp_cotizacion_actualizar(?, ?, ?, ?, ?, ?)',
            [
                id,
                id_cliente,
                idUsuarioSesion,
                fecha_vencimiento,
                total,
                observacion || null
            ]
        );

        // Eliminar detalles anteriores
        await connection.query('CALL sp_detalle_cotizacion_eliminar_por_cotizacion(?)', [id]);

        // Registrar nuevos detalles
        for (const item of productos) {
            await connection.query(
                'CALL sp_detalle_cotizacion_registrar(?, ?, ?, ?, ?, ?)',
                [
                    id,
                    item.id_producto || null,
                    item.producto_nombre,
                    parseFloat(item.precio_original),
                    parseFloat(item.precio_final || item.precio_original),
                    parseInt(item.cantidad)
                ]
            );
        }

        await connection.commit();
        connection.release();

        return { message: 'Cotización actualizada correctamente' };

    } catch (error) {
        await connection.rollback();
        connection.release();
        throw new Error(error.message);
    }
};

// ============================================
// ELIMINAR COTIZACIÓN (LÓGICO)
// ============================================
exports.deleteCotizacion = async (id) => {
    const [rows] = await db.query('CALL sp_cotizacion_obtener(?)', [id]);
    const cotizacion = rows[0][0];

    if (!cotizacion) throw new Error('Cotización no encontrada');

    await db.query('CALL sp_cotizacion_cambiar_estado(?, ?)', [id, 2]);
    return { message: 'Cotización eliminada correctamente' };
};

// ============================================
// MARCAR COMO PROCESADA
// ============================================
exports.marcarComoProcesada = async (id) => {
    const [rows] = await db.query('CALL sp_cotizacion_obtener(?)', [id]);
    const cotizacion = rows[0][0];

    if (!cotizacion) throw new Error('Cotización no encontrada');

    await db.query('CALL sp_cotizacion_cambiar_estado(?, ?)', [id, 3]);
    return { message: 'Cotización marcada como procesada' };
};