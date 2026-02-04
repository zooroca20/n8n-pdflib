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
    const ALTURA_PAGINA = 803; // Altura de tu plantilla

    console.log(`Total líneas: ${totalLineas}, Total páginas necesarias: ${totalPaginas}`);

    // Función para rellenar encabezado
    const fillHeader = (page) => {
      // NÚMERO DE FACTURA
      // Affinity: X=47.4, Y=211.6 → Código: X=47, Y=803-212=591
      if (fields.numero_factura) {
        page.drawText(String(fields.numero_factura), {
          x: 47,
          y: 591,
          size: regularFont,
          font
        });
      }

      // FECHA
      // Ajusta estas coordenadas con Affinity Designer
      if (fields.fecha) {
        const fechaStr = String(fields.fecha).split('T')[0];
        page.drawText(fechaStr, {
          x: 172,
          y: 591,
          size: regularFont,
          font
        });
      }

      // FORMA DE PAGO
      // Ajusta estas coordenadas con Affinity Designer
      if (fields.forma_pago) {
        page.drawText(String(fields.forma_pago), {
          x: 315,
          y: 591,
          size: regularFont,
          font
        });
      }

      // NOMBRE CLIENTE
      // Ajusta estas coordenadas con Affinity Designer
      if (fields.nombre_cliente) {
        page.drawText(String(fields.nombre_cliente), {
          x: 85,
          y: 547,
          size: smallFont,
          font
        });
      }

      // DOMICILIO CLIENTE
      // Ajusta estas coordenadas con Affinity Designer
      if (fields.domicilio_cliente) {
        page.drawText(String(fields.domicilio_cliente), {
          x: 85,
          y: 532,
          size: smallFont,
          font
        });
      }

      // ALBARÁN
      // Ajusta estas coordenadas con Affinity Designer
      if (fields.albaran) {
        page.drawText(String(fields.albaran), {
          x: 85,
          y: 512,
          size: smallFont,
          font
        });
      }

      // FECHA ALBARÁN
      // Ajusta estas coordenadas con Affinity Designer
      if (fields.fecha_albaran) {
        const fechaAlb = String(fields.fecha_albaran).split('T')[0];
        page.drawText(fechaAlb, {
          x: 220,
          y: 512,
          size: smallFont,
          font
        });
      }
    };

    // Función para escribir una línea de producto
    const drawProductLine = (page, linea, y) => {
      // CAJAS
      if (linea.Cajas !== undefined && linea.Cajas !== null) {
        page.drawText(String(linea.Cajas), {
          x: 52,
          y,
          size: smallFont,
          font
        });
      }

      // BRUTO
      if (linea.Bruto) {
        page.drawText(String(linea.Bruto), {
          x: 118,
          y,
          size: smallFont,
          font
        });
      }

      // TARA
      if (linea.Tara) {
        page.drawText(String(linea.Tara), {
          x: 183,
          y,
          size: smallFont,
          font
        });
      }

      // NETO
      if (linea.Neto) {
        page.drawText(String(linea.Neto), {
          x: 245,
          y,
          size: smallFont,
          font
        });
      }

      // ARTÍCULO
      if (linea.Articulo) {
        page.drawText(String(linea.Articulo), {
          x: 320,
          y,
          size: smallFont,
          font
        });
      }

      // PRECIO
      if (linea.Precio) {
        page.drawText(String(linea.Precio), {
          x: 485,
          y,
          size: smallFont,
          font
        });
      }

      // IMPORTE
      if (linea.Importe) {
        page.drawText(String(linea.Importe), {
          x: 520,
          y,
          size: smallFont,
          font
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

      // Rellenar encabezado en cada página
      fillHeader(currentPage);

      // Calcular qué líneas van en esta página
      const startLineIndex = pageIndex * LINEAS_POR_PAGINA;
      const endLineIndex = Math.min(startLineIndex + LINEAS_POR_PAGINA, totalLineas);
      const lineasPagina = lineasArray.slice(startLineIndex, endLineIndex);

      console.log(`Página ${pageIndex + 1}: Líneas ${startLineIndex + 1} a ${endLineIndex}`);

      // Dibujar líneas de productos
      // Ajusta este startY con Affinity Designer (donde empieza la primera línea)
      const startY = 490;
      const lineHeight = 15;

      lineasPagina.forEach((linea, index) => {
        const y = startY - (index * lineHeight);
        drawProductLine(currentPage, linea, y);
      });

      // Agregar número de página si hay más de una
      if (totalPaginas > 1) {
        currentPage.drawText(`Página ${pageIndex + 1} de ${totalPaginas}`, {
          x: 500,
          y: 591,
          size: smallFont,
          font
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
```

## **Coordenadas ya aplicadas:**
**Número de factura:** 
- Affinity: X=47.4, Y=211.6
- Código: `x: 47, y: 591` (803 - 212)

---

## **Ahora necesitas mapear el resto de campos en Affinity:**

Coloca rectángulos o texto en estas posiciones y dame las coordenadas **X, Y**:

1. **Fecha** (donde debe ir la fecha de la factura)
2. **Forma de Pago** (Tarjeta, Transferencia, etc.)
3. **Nombre Cliente**
4. **Domicilio Cliente**
5. **Albarán**
6. **Fecha Albarán**
7. **Primera línea de productos** (la línea #1 de Cajas, Bruto, Tara, etc.)

Para cada campo, dame las coordenadas como:
```
Campo: X=?, Y=?
