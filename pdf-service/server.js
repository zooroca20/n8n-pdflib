const express = require('express');
const { PDFDocument, StandardFonts } = require('pdf-lib');
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

    const pdfBytes = Buffer.from(pdfBase64, 'base64');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 10;

    // Coordenadas aproximadas basadas en tu PDF (en puntos)
    // Necesitarás ajustar estos valores según tu plantilla
    const coordinates = {
      numero_factura: { x: 95, y: height - 235 },
      fecha: { x: 160, y: height - 235 },
      forma_pago: { x: 280, y: height - 235 },
      vendedor: { x: 480, y: height - 235 },
      pagina: { x: 750, y: height - 235 },
      
      nombre_cliente: { x: 50, y: height - 280 },
      domicilio_cliente: { x: 50, y: height - 295 },
      
      // Campos de líneas de productos (ejemplo para primera línea)
      cajas_1: { x: 65, y: height - 330 },
      bruto_1: { x: 105, y: height - 330 },
      tara_1: { x: 150, y: height - 330 },
      neto_1: { x: 195, y: height - 330 },
      articulo_1: { x: 260, y: height - 330 },
      precio_1: { x: 570, y: height - 330 },
      importe_1: { x: 625, y: height - 330 },
    };

    // Rellenar encabezado
    if (fields.numero_factura) {
      const coord = coordinates.numero_factura;
      firstPage.drawText(String(fields.numero_factura), {
        x: coord.x,
        y: coord.y,
        size: fontSize,
        font: font
        });
    }

    if (fields.fecha) {
      const coord = coordinates.fecha;
      firstPage.drawText(String(fields.fecha).split('T')[0], {
        x: coord.x,
        y: coord.y,
        size: fontSize,
        font: font,
      });
    }

    if (fields.forma_pago) {
      const coord = coordinates.forma_pago;
      firstPage.drawText(String(fields.forma_pago), {
        x: coord.x,
        y: coord.y,
        size: fontSize,
        font: font,
      });
    }

    if (fields.nombre_cliente) {
      const coord = coordinates.nombre_cliente;
      firstPage.drawText(String(fields.nombre_cliente), {
        x: coord.x,
        y: coord.y,
        size: fontSize,
        font: font,
      });
    }

    if (fields.domicilio_cliente) {
      const coord = coordinates.domicilio_cliente;
      firstPage.drawText(String(fields.domicilio_cliente), {
        x: coord.x,
        y: coord.y,
        size: fontSize,
        font: font,
      });
    }

    // Aplanar el PDF (opcional, para hacer que no se pueda editar)
    // await pdfDoc.flatten();

    const modifiedPdfBytes = await pdfDoc.save();
    const resultBase64 = Buffer.from(modifiedPdfBytes).toString('base64');

    res.json({ success: true, pdf: resultBase64 });
  } catch (error) {
    console.error("Error:", error);
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
