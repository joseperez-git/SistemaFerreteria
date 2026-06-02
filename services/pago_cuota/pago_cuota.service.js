const db = require('../../config/db');

exports.registrarPago = async (id_cuota_venta, metodo_pago, monto) => {
    await db.query('CALL sp_registrar_pago_cuota(?, ?, ?)', [
        id_cuota_venta,
        metodo_pago,
        monto
    ]);
    
    return { message: 'Pago registrado correctamente' };
};


