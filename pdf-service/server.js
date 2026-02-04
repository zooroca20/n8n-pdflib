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

    console.log(`Total líneas: ${lineasArray.length}`);

    // AGRUPAR LÍNEAS POR ALBARÁN
    const lineasPorAlbaran = [];
    let albaranActual = null;
    
    lineasArray.forEach(linea => {
      // USAR LOS NOMBRES CORRECTOS DE LOS CAMPOS
      const numAlbaran = linea.Albaran_Factura || '';
      const fechaAlbaran = linea.FechaAlbaran_Factura || '';
      
      console.log('Procesando línea:', {
        Albaran_Factura: numAlbaran,
        FechaAlbaran_Factura: fechaAlbaran
      });

      const albaranKey = `${numAlbaran}_${fechaAlbaran}`;
      
      if (!albaranActual || albaranActual.key !== albaranKey) {
        albaranActual = {
          key: albaranKey,
          albaran: numAlbaran,
          fecha: fechaAlbaran,
          lineas: []
        };
        lineasPorAlbaran.push(albaranActual);
        console.log('Nuevo grupo albarán:', { albaran: numAlbaran, fecha: fechaAlbaran });
      }
      
      albaranActual.lineas.push(linea);
    });

    console.log(`Total albaranes agrupados: ${lineasPorAlbaran.length}`);

    const fillHeader = (page, pageNumber, totalPaginas) => {
      if (fields.numero_factura) {
        page.drawText(String(fields.numero_factura), {
          x: 41,
          y: 589,
          size: regularFont,
          font
        });
      }

      if (fields.fecha) {
        const fechaStr = String(fields.fecha).split('T')[0];
        page.drawText(fechaStr, {
          x: 82,
          y: 589,
          size: regularFont,
          font
        });
      }

      if (fields.forma_pago) {
        page.drawText(String(fields.forma_pago), {
          x: 175,
          y: 589,
          size: regularFont,
          font
        });
      }

      page.drawText('1 Empresa', {
        x: 374,
        y: 589,
        size: regularFont,
        font
      });

      if (totalPaginas > 1) {
        page.drawText(`${pageNumber}/${totalPaginas}`, {
          x: 513,
          y: 589,
          size: regularFont,
          font
        });
      }
    };

    const drawAlbaranHeader = (page, albaran, fecha, y) => {
      // Formatear fecha (solo YYYY-MM-DD)
      let fechaFormateada = String(fecha);
      if (fechaFormateada.includes('T')) {
        fechaFormateada = fechaFormateada.split('T')[0];
      }
      
      // Construir texto SIN acento en Albaran
      const texto = `**** Albaran    ${albaran}     del    ${fechaFormateada}   **   Pedido 0 Fecha 0 *****`;
      
      console.log('Dibujando cabecera:', texto);
      
      page.drawText(texto, {
        x: 54,
        y,
        size: smallFont,
        font
      });
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

    let totalLineasConCabeceras = 0;
    lineasPorAlbaran.forEach(grupo => {
      totalLineasConCabeceras += 1 + grupo.lineas.length;
    });
    const totalPaginas = Math.ceil(totalLineasConCabeceras / LINEAS_POR_PAGINA);

    console.log(`Total líneas con cabeceras: ${totalLineasConCabeceras}, Total páginas: ${totalPaginas}`);

    const nuevoPdfDoc = await PDFDocument.create();
    let currentPage = null;
    let currentY = 0;
    let lineasEnPagina = 0;
    let pageNumber = 0;

    const crearNuevaPagina = async () => {
      const [paginaCopia] = await nuevoPdfDoc.copyPages(pdfDoc, [0]);
      nuevoPdfDoc.addPage(paginaCopia);
      pageNumber++;
      currentPage = nuevoPdfDoc.getPages()[pageNumber - 1];
      fillHeader(currentPage, pageNumber, totalPaginas);
      currentY = 543;
      lineasEnPagina = 0;
    };

    await crearNuevaPagina();

    for (const grupo of lineasPorAlbaran) {
      if (lineasEnPagina >= LINEAS_POR_PAGINA) {
        await crearNuevaPagina();
      }

      console.log('Dibujando grupo:', { albaran: grupo.albaran, fecha: grupo.fecha, numLineas: grupo.lineas.length });
      
      drawAlbaranHeader(currentPage, grupo.albaran, grupo.fecha, currentY);
      currentY -= 15;
      lineasEnPagina++;

      for (const linea of grupo.lineas) {
        if (lineasEnPagina >= LINEAS_POR_PAGINA) {
          await crearNuevaPagina();
        }

        drawProductLine(currentPage, linea, currentY);
        currentY -= 15;
        lineasEnPagina++;
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
