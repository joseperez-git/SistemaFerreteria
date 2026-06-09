const db = require('../../config/db');

// ============================================
// LISTAR MOVIMIENTOS DE INVENTARIO
// ============================================
exports.getMovimientos = async () => {
    const [rows] = await db.query('CALL sp_listar_movimiento_inventario()');
    return rows[0];
};

// ============================================
// OBTENER MOVIMIENTO POR ID
// ============================================
exports.getMovimientoById = async (id) => {
    const [rows] = await db.query('CALL sp_obtener_movimiento_inventario_por_id(?)', [id]);
    return rows[0][0];
};

// ============================================
// REGISTRAR MOVIMIENTO
// ============================================
exports.registrarMovimiento = async (body, idUsuarioSesion) => {
    const {
        id_detalle_venta,
        id_producto,
        tipo_movimiento,
        cantidad,
        motivo
    } = body;

    if (!id_producto) {
        throw new Error('El producto es obligatorio');
    }
    if (!tipo_movimiento) {
        throw new Error('El tipo de movimiento es obligatorio');
    }
    if (!cantidad || cantidad <= 0) {
        throw new Error('La cantidad debe ser mayor a 0');
    }
    if (!motivo) {
        throw new Error('El motivo es obligatorio');
    }

    await db.query(
        'CALL sp_registrar_movimiento_inventario(?, ?, ?, ?, ?, ?)',
        [
            id_detalle_venta || null,
            id_producto,
            idUsuarioSesion,
            tipo_movimiento,
            cantidad,
            motivo
        ]
    );

    return { message: 'Movimiento registrado correctamente' };
};

// ============================================
// ELIMINAR MOVIMIENTO
// ============================================
exports.eliminarMovimiento = async (id) => {
    await db.query('CALL sp_eliminar_movimiento_inventario(?)', [id]);
    return { message: 'Movimiento eliminado correctamente' };
};


