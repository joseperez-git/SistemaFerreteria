async function consultarAplicloud(numero, tipo) {
    const token = process.env.MIAPI_CLOUD_TOKEN;
    
    if (!token) {
        return { success: false, message: 'Token no configurado' };
    }
    
    let url = '';
    if (tipo === 'DNI') {
        url = `https://miapi.cloud/v1/dni/${numero}`;
    } else if (tipo === 'RUC') {
        url = `https://miapi.cloud/v1/ruc/${numero}`;
    } else {
        return { success: false, message: 'Tipo no soportado' };
    }
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            return { success: false, message: `Error HTTP: ${response.status}` };
        }
        
        const data = await response.json();
        
        const persona = data.datos || data.data || data;
        
        const nombres = persona.nombres || '';
        const apePaterno = persona.ape_paterno || '';
        const apeMaterno = persona.ape_materno || '';
        
        const razonSocial = persona.razon_social || persona.business_name || '';
        
        let nombreCompleto = '';
        let apellidoCompleto = '';
        
        if (tipo === 'DNI') {
            nombreCompleto = nombres;
            apellidoCompleto = `${apePaterno} ${apeMaterno}`.trim();
        } else {
            nombreCompleto = razonSocial;
            apellidoCompleto = '';
        }
        
        return {
            success: true,
            data: {
                nombre: nombreCompleto,
                apellido: apellidoCompleto,
                tipo_documento: tipo,
                numero_documento: numero,
                telefono: persona.telefono || '',  // La API no devuelve teléfono
                correo: persona.correo || ''       // La API no devuelve correo
            }
        };
        
    } catch (error) {
        console.error('Error:', error);
        return { success: false, message: 'Error de conexión' };
    }
}

module.exports = { consultarAplicloud };




