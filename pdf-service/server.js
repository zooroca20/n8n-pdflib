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

    // Parsear líneas
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

    console.log(`Total líneas: ${totalLineas}, Total páginas necesarias: ${totalPaginas}`);

    // GUARDAR LA PLANTILLA ORIGINAL VACÍA
    const plantillaOriginal = pdfDoc.getPages()[0];

    // Función para rellenar encabezado
    const fillHeader = (page, height) => {
      if (fields.numero_factura) {
        page.drawText(String(fields.numero_factura), {
          x: 95, y: height - 235, size: regularFont, font
        });
      }

      if (fields.fecha) {
        const fechaStr = String(fields.fecha).split('T')[0];
        page.drawText(fechaStr, {
          x: 160, y: height - 235, size: regularFont, font
        });
      }

      if (fields.forma_pago) {
        page.drawText(String(fields.forma_pago), {
          x: 280, y: height - 235, size: regularFont, font
        });
      }

      if (fields.nombre_cliente) {
        page.drawText(String(fields.nombre_cliente), {
          x: 50, y: height - 280, size: smallFont, font
        });
      }

      if (fields.domicilio_cliente) {
        page.drawText(String(fields.domicilio_cliente), {
          x: 50, y: height - 295, size: smallFont, font
        });
      }

      if (fields.albaran) {
        page.drawText(String(fields.albaran), {
          x: 50, y: height - 315, size: smallFont, font
        });
      }

      if (fields.fecha_albaran) {
        const fechaAlb = String(fields.fecha_albaran).split('T')[0];
        page.drawText(fechaAlb, {
          x: 180, y: height - 315, size: smallFont, font
        });
      }
    };

    // Función para escribir una línea de producto
    const drawProductLine = (page, linea, y) => {
      if (linea.Cajas !== undefined && linea.Cajas !== null) {
        page.drawText(String(linea.Cajas), {
          x: 65, y, size: smallFont, font
        });
      }

      if (linea.Bruto) {
        page.drawText(String(linea.Bruto), {
          x: 105, y, size: smallFont, font
        });
      }

      if (linea.Tara) {
        page.drawText(String(linea.Tara), {
          x: 150, y, size: smallFont, font
        });
      }

      if (linea.Neto) {
        page.drawText(String(linea.Neto), {
          x: 195, y, size: smallFont, font
        });
      }

      if (linea.Articulo) {
        page.drawText(String(linea.Articulo), {
          x: 260, y, size: smallFont, font
        });
      }

      if (linea.Precio) {
        page.drawText(String(linea.Precio), {
          x: 570, y, size: smallFont, font
        });
      }

      if (linea.Importe) {
        page.drawText(String(linea.Importe), {
          x: 625, y, size: smallFont, font
        });
      }
    };

    // CREAR UN NUEVO PDF PARA EL RESULTADO
    const nuevoPdfDoc = await PDFDocument.create();

    // Procesar páginas
    for (let pageIndex = 0; pageIndex < totalPaginas; pageIndex++) {
      // Copiar la plantilla ORIGINAL (vacía) para cada página
      const [paginaCopia] = await nuevoPdfDoc.copyPages(pdfDoc, [0]);
      nuevoPdfDoc.addPage(paginaCopia);
      
      const currentPage = nuevoPdfDoc.getPages()[pageIndex];
      const { height } = currentPage.getSize();

      // Rellenar encabezado en cada página
      fillHeader(currentPage, height);

      // Calcular qué líneas van en esta página
      const startLineIndex = pageIndex * LINEAS_POR_PAGINA;
      const endLineIndex = Math.min(startLineIndex + LINEAS_POR_PAGINA, totalLineas);
      const lineasPagina = lineasArray.slice(startLineIndex, endLineIndex);

      console.log(`Página ${pageIndex + 1}: Líneas ${startLineIndex + 1} a ${endLineIndex}`);

      // Dibujar líneas de productos
      const startY = height - 335;
      const lineHeight = 15;

      lineasPagina.forEach((linea, index) => {
        const y = startY - (index * lineHeight);
        drawProductLine(currentPage, linea, y);
      });

      // Agregar número de página si hay más de una
      if (totalPaginas > 1) {
        currentPage.drawText(`Página ${pageIndex + 1} de ${totalPaginas}`, {
          x: 50, y: 30, size: smallFont, font
        });
      }
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
