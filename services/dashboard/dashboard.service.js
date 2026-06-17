const db = require('../../config/db');

// ==================== OBTENER RESUMEN GENERAL ====================
exports.getResumen = async () => {
    const [rows] = await db.query('CALL sp_dashboard_resumen()');
    return rows[0][0] || {};
};

// ==================== OBTENER VENTAS POR RANGO ====================
exports.getVentasPorRango = async (dias = 7, fechaDesde = null, fechaHasta = null) => {
    const [rows] = await db.query(
        'CALL sp_dashboard_ventas_rango(?, ?, ?)',
        [dias, fechaDesde, fechaHasta]
    );
    return rows[0] || [];
};

// ==================== OBTENER TOP 5 PRODUCTOS ====================
exports.getTopProductos = async () => {
    const [rows] = await db.query('CALL sp_dashboard_top_productos()');
    return rows[0] || [];
};

// ==================== OBTENER ÚLTIMOS PEDIDOS ====================
exports.getUltimosPedidos = async () => {
    const [rows] = await db.query('CALL sp_dashboard_ultimos_pedidos()');
    return rows[0] || [];
};

// ==================== OBTENER STOCK CRÍTICO ====================
exports.getStockCritico = async () => {
    const [rows] = await db.query('CALL sp_dashboard_stock_critico()');
    return rows[0] || [];
};

// ==================== OBTENER PRODUCTOS POR CATEGORÍA ====================
exports.getProductosPorCategoria = async () => {
    const [rows] = await db.query('CALL sp_dashboard_productos_por_categoria()');
    return rows[0] || [];
};


