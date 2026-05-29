// middlewares/auth.js
const db = require('../config/db');

// Middleware para validar solo autenticación (sin validar módulo)
function soloAutenticacion(req, res, next) {
    const idUsuario = req.session.usuario?.id;
    
    if (!idUsuario) {
        return res.status(401).json({ error: 'No autenticado' });
    }
    
    next();
}

// Middleware para validar permiso de módulo específico
function validarPermiso(modulo) {
    return async (req, res, next) => {
        const idUsuario = req.session.usuario?.id;
        const perfilNombre = req.session.usuario?.perfil_nombre;
        
        if (!idUsuario) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        
        // ADMINISTRADOR tiene acceso a todo
        if (perfilNombre && perfilNombre.toUpperCase() === 'ADMINISTRADOR') {
            return next();
        }
        
        if (!modulo) {
            return next();
        }
        
        try {
            const [result] = await db.query(
                'CALL sp_validar_permiso_usuario(?, ?, @p_tiene_permiso)',
                [idUsuario, modulo]
            );
            
            const [permisoResult] = await db.query('SELECT @p_tiene_permiso AS tiene_permiso');
            
            if (!permisoResult[0].tiene_permiso) {
                return res.status(403).json({ 
                    error: `No tiene permisos para acceder a ${modulo}`,
                    codigo: 'PERMISO_DENEGADO'
                });
            }
            
            next();
        } catch (error) {
            console.error('Error al validar permiso:', error);
            res.status(500).json({ error: 'Error al validar permisos' });
        }
    };
}

module.exports = { soloAutenticacion, validarPermiso };


