const express = require('express');
const { PDFDocument } = require('pdf-lib');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('/fill-pdf', async (req, res) => {
  try {
    const { pdfBase64, fields } = req.body;

    if (!pdfBase64 || !fields) {
      return res.status(400).json({ error: 'Missing pdfBase64 or fields' });
    }

    // Convertir base64 a bytes
    const pdfBytes = Buffer.from(pdfBase64, 'base64');
    
    // Cargar el PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    // Rellenar campos
    Object.entries(fields).forEach(([fieldName, fieldValue]) => {
      try {
        const field = form.getField(fieldName);
        field.setText(String(fieldValue));
      } catch (err) {
        console.log(`Campo ${fieldName} no encontrado o error al rellenarlo`);
      }
    });

    // Guardar PDF modificado
    const modifiedPdfBytes = await pdfDoc.save();
    const resultBase64 = Buffer.from(modifiedPdfBytes).toString('base64');

    res.json({ success: true, pdf: resultBase64 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PDF Filler Service running on port ${PORT}`);
});
```

## Paso 2: Desplegar en Railway

1. **Sube estos archivos a tu repo GitHub**
2. **En Railway.app:**
   - Click en "New Project"
   - Selecciona "Deploy from GitHub repo"
   - Elige tu repositorio
   - Railway detectará automáticamente que es Node.js
   - Se desplegará automáticamente

3. **Obtendrás una URL pública**, algo como:
```
   https://tu-proyecto-xxxx.railway.app
```

## Paso 3: Usar en n8n

En tu flujo de n8n, usa un **HTTP Request Node**:
```
Método: POST
URL: https://tu-proyecto-xxxx.railway.app/fill-pdf

Body (JSON):
{
  "pdfBase64": "{{ $node['Read PDF'].binary.data }}",
  "fields": {
    "nombre": "Juan Pérez",
    "edad": "30",
    "ciudad": "Madrid"
  }
}
