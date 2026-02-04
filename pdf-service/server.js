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
    const smallFont = 9;
    const regularFont = 10;

    // ENCABEZADO
    if (fields.numero_factura) {
      firstPage.drawText(String(fields.numero_factura), {
        x: 95, y: height - 235, size: regularFont, font
      });
    }

    if (fields.fecha) {
      const fechaStr = String(fields.fecha).split('T')[0];
      firstPage.drawText(fechaStr, {
        x: 160, y: height - 235, size: regularFont, font
      });
    }

    if (fields.forma_pago) {
      firstPage.drawText(String(fields.forma_pago), {
        x: 280, y: height - 235, size: regularFont, font
      });
    }

    if (fields.nombre_cliente) {
      firstPage.drawText(String(fields.nombre_cliente), {
        x: 50, y: height - 280, size: smallFont, font
      });
    }

    if (fields.domicilio_cliente) {
      firstPage.drawText(String(fields.domicilio_cliente), {
        x: 50, y: height - 295, size: smallFont, font
      });
    }

    if (fields.albaran) {
      firstPage.drawText(String(fields.albaran), {
        x: 50, y: height - 315, size: smallFont, font
      });
    }

    if (fields.fecha_albaran) {
      const fechaAlb = String(fields.fecha_albaran).split('T')[0];
      firstPage.drawText(fechaAlb, {
        x: 180, y: height - 315, size: smallFont, font
      });
    }

    // LÍNEAS DE PRODUCTOS
    let lineas = fields.lineas || [];
    console.log("Lineas recibidas:", lineas);
    console.log("Tipo de lineas:", typeof lineas);

    let lineasArray = [];
    try {
      if (typeof lineas === 'string') {
        lineasArray = JSON.parse(lineas);
      } else if (Array.isArray(lineas)) {
        lineasArray = lineas;
      } else {
        lineasArray = [];
      }
    } catch (e) {
      console.error("Error parseando lineas:", e);
      lineasArray = [];
    }

    console.log("Cantidad de lineas parseadas:", lineasArray.length);

    const startY = height - 335;
    const lineHeight = 15;

    lineasArray.forEach((linea, index) => {
      const y = startY - (index * lineHeight);
      console.log(`Escribiendo línea ${index} en Y=${y}:`, linea);

      // Cajas
      if (linea.Cajas !== undefined && linea.Cajas !== null) {
        firstPage.drawText(String(linea.Cajas), {
          x: 65, y, size: smallFont, font
        });
      }

      // Bruto
      if (linea.Bruto) {
        firstPage.drawText(String(linea.Bruto), {
          x: 105, y, size: smallFont, font
        });
      }

      // Tara
      if (linea.Tara) {
        firstPage.drawText(String(linea.Tara), {
          x: 150, y, size: smallFont, font
        });
      }

      // Neto
      if (linea.Neto) {
        firstPage.drawText(String(linea.Neto), {
          x: 195, y, size: smallFont, font
        });
      }

      // Artículo
      if (linea.Articulo) {
        firstPage.drawText(String(linea.Articulo), {
          x: 260, y, size: smallFont, font
        });
      }

      // Precio
      if (linea.Precio) {
        firstPage.drawText(String(linea.Precio), {
          x: 570, y, size: smallFont, font
        });
      }

      // Importe
      if (linea.Importe) {
        firstPage.drawText(String(linea.Importe), {
          x: 625, y, size: smallFont, font
        });
      }
    });

    const modifiedPdfBytes = await pdfDoc.save();
    const resultBase64 = Buffer.from(modifiedPdfBytes).toString('base64');

    res.json({ success: true, pdf: resultBase64 });
  } catch (error) {
    console.error("Error completo:", error);
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
