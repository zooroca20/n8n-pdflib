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
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const smallFont = 9;
    const regularFont = 10;

    let lineasArray = [];
    try {
      if (typeof fields.lineas === 'string') {
        lineasArray = JSON.parse(fields.lineas);
      } else if (Array.isArray(fields.lineas)) {
        lineasArray = fields.lineas;
      }
    } catch (e) {
      console.error("Error parseando lineas:", e);
      lineasArray = [];
    }

    const LINEAS_POR_PAGINA = 11;
    const totalLineas = lineasArray.length;
    const totalPaginas = Math.ceil(totalLineas / LINEAS_POR_PAGINA);
    const ALTURA_PAGINA = 803;

    console.log(`Total líneas: ${totalLineas}, Total páginas necesarias: ${totalPaginas}`);

    const fillHeader = (page, pageNumber) => {
      // NÚMERO DE FACTURA
      // Affinity: X=41.1, Y=214.4 → Código: X=41, Y=803-214=589
      if (fields.numero_factura) {
        page.drawText(String(fields.numero_factura), {
          x: 41,
          y: 589,
          size: regularFont,
          font
        });
      }

      // FECHA FACTURA
      // Affinity: X=82.4, Y=214.4 → Código: X=82, Y=803-214=589
      if (fields.fecha) {
        const fechaStr = String(fields.fecha).split('T')[0];
        page.drawText(fechaStr, {
          x: 82,
          y: 589,
          size: regularFont,
          font
        });
      }

      // FORMA DE PAGO
      // Affinity: X=174.6, Y=214.4 → Código: X=175, Y=803-214=589
      if (fields.forma_pago) {
        page.drawText(String(fields.forma_pago), {
          x: 175,
          y: 589,
          size: regularFont,
          font
        });
      }

      // VENDEDOR
      // Affinity: X=374.3, Y=214.4 → Código: X=374, Y=803-214=589
      if (fields.vendedor) {
        page.drawText(String(fields.vendedor), {
          x: 374,
          y: 589,
          size: regularFont,
          font
        });
      }

      // CONTADOR DE PÁGINAS (formato: 1/2)
      // Affinity: X=513.1, Y=214.4 → Código: X=513, Y=803-214=589
      if (totalPaginas > 1) {
        page.drawText(`${pageNumber}/${totalPaginas}`, {
          x: 513,
          y: 589,
          size: regularFont,
          font
        });
      }

      // ALBARÁN NÚMERO
      // Affinity: X=131, Y=256.9 → Código: X=131, Y=803-257=546
      if (fields.albaran) {
        page.drawText(String(fields.albaran), {
          x: 131,
          y: 546,
          size: smallFont,
          font
        });
      }
    };

    const drawProductLine = (page, linea, y) => {
      if (linea.Cajas !== undefined && linea.Cajas !== null) {
        page.drawText(String(linea.Cajas), {
          x: 52,
          y,
          size: smallFont,
          font
        });
      }

      if (linea.Bruto) {
        page.drawText(String(linea.Bruto), {
          x: 118,
          y,
          size: smallFont,
          font
        });
      }

      if (linea.Tara) {
        page.drawText(String(linea.Tara), {
          x: 183,
          y,
          size: smallFont,
          font
        });
      }

      if (linea.Neto) {
        page.drawText(String(linea.Neto), {
          x: 245,
          y,
          size: smallFont,
          font
        });
      }

      if (linea.Articulo) {
        page.drawText(String(linea.Articulo), {
          x: 320,
          y,
          size: smallFont,
          font
        });
      }

      if (linea.Precio) {
        page.drawText(String(linea.Precio), {
          x: 485,
          y,
          size: smallFont,
          font
        });
      }

      if (linea.Importe) {
        page.drawText(String(linea.Importe), {
          x: 520,
          y,
          size: smallFont,
          font
        });
      }
    };

    const nuevoPdfDoc = await PDFDocument.create();

    for (let pageIndex = 0; pageIndex < totalPaginas; pageIndex++) {
      const [paginaCopia] = await nuevoPdfDoc.copyPages(pdfDoc, [0]);
      nuevoPdfDoc.addPage(paginaCopia);
      
      const currentPage = nuevoPdfDoc.getPages()[pageIndex];
      const pageNumber = pageIndex + 1;

      fillHeader(currentPage, pageNumber);

      const startLineIndex = pageIndex * LINEAS_POR_PAGINA;
      const endLineIndex = Math.min(startLineIndex + LINEAS_POR_PAGINA, totalLineas);
      const lineasPagina = lineasArray.slice(startLineIndex, endLineIndex);

      console.log(`Página ${pageNumber}: Líneas ${startLineIndex + 1} a ${endLineIndex}`);

      const startY = 490;
      const lineHeight = 15;

      lineasPagina.forEach((linea, index) => {
        const y = startY - (index * lineHeight);
        drawProductLine(currentPage, linea, y);
      });
    }

    const modifiedPdfBytes = await nuevoPdfDoc.save();
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
