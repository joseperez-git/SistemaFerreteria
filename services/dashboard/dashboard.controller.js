const service = require('./dashboard.service');

// ==================== OBTENER TODO EL DASHBOARD ====================
exports.getAll = async (req, res) => {
    try {
        const { dias, fecha_desde, fecha_hasta } = req.query;
        
        // Determinar rango de fechas
        let diasRango = parseInt(dias) || 7;
        let fechaDesde = fecha_desde || null;
        let fechaHasta = fecha_hasta || null;
        
        // Validar fechas personalizadas
        if (fechaDesde && fechaHasta) {
            diasRango = 0; // No usar días, usar fechas personalizadas
        }
        
        const [resumen, ventasRango, topProductos, ultimosPedidos, stockCritico, productosCategoria] = await Promise.all([
            service.getResumen(),
            service.getVentasPorRango(diasRango, fechaDesde, fechaHasta),
            service.getTopProductos(),
            service.getUltimosPedidos(),
            service.getStockCritico(),
            service.getProductosPorCategoria()
        ]);

        res.json({
            success: true,
            resumen,
            ventasRango,
            topProductos,
            ultimosPedidos,
            stockCritico,
            productosCategoria,
            filtro: {
                dias: diasRango,
                fecha_desde: fechaDesde,
                fecha_hasta: fechaHasta
            }
        });

    } catch (error) {
        console.error('Error al obtener datos del dashboard:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


