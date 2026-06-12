const db = require('../../config/db');

exports.getEstadisticas = async () => {
    const [rows] = await db.query('CALL sp_inventario_estadisticas()');
    return rows[0][0];
};

exports.listarProductos = async () => {
    const [rows] = await db.query('CALL sp_inventario_listar()');
    return rows[0];
};

exports.getDetalleProducto = async (id) => {
    const [rows] = await db.query('CALL sp_inventario_detalle(?)', [id]);
    const prod = rows[0][0];
    if (!prod) throw new Error('Producto no encontrado');

    // Obtener estadísticas de ventas
    const [statsVentas] = await db.query('CALL sp_inventario_stats_ventas(?)', [id]);
    const stats = statsVentas[0][0];

    // Obtener últimas ventas
    const [ultimasVentas] = await db.query('CALL sp_inventario_ultimas_ventas(?)', [id]);

    // Distribución de stock (producto principal + reservado)
    const distribucion = {
        [`${prod.nombre} (${prod.stock})`]: prod.stock || 0
    };
    // Agregar stock reservado si existe
    if (prod.stock_reservado > 0) {
        distribucion[`Reservado (${prod.stock_reservado})`] = prod.stock_reservado;
    }
    // Agregar stock disponible
    const disponible = (prod.stock || 0) - (prod.stock_reservado || 0);
    if (disponible > 0 && prod.stock_reservado > 0) {
        distribucion[`Disponible (${disponible})`] = disponible;
    }

    return {
        ...prod,
        sku: `SKU-${String(prod.id).padStart(4, '0')}`,
        stock_total: prod.stock || 0,
        valor_total: (prod.precio || 0) * (prod.stock || 0),
        total_ventas: stats?.total_ventas || 0,
        unidades_vendidas: stats?.unidades_vendidas || 0,
        total_ingresos: stats?.total_ingresos || 0,
        ultimas_ventas: ultimasVentas[0] || [],
        distribucion_stock: distribucion
    };
};

exports.actualizarStock = async (idProducto, nuevoStock, idUsuario, motivo) => {
    if (!idProducto) throw new Error('Producto obligatorio');
    if (nuevoStock === undefined || nuevoStock === null || nuevoStock < 0) throw new Error('Stock inválido');
    if (!idUsuario) throw new Error('Usuario obligatorio');
    if (!motivo) throw new Error('Motivo obligatorio');

    await db.query('CALL sp_inventario_actualizar_stock(?, ?, ?, ?)', [
        idProducto, nuevoStock, idUsuario, motivo
    ]);
    return { message: 'Stock actualizado correctamente' };
};