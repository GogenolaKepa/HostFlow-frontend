import {
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../services/api";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const FILTROS_INICIALES = {
  periodo: "6",
  fechaDesde: "",
  fechaHasta: "",
  idPropiedad: "",
  canal: "",
  estado: "",
};

function Reportes() {
  const [
    datos,
    setDatos,
  ] = useState(null);

  const [
    opciones,
    setOpciones,
  ] = useState({
    propiedades: [],
    canales: [],
    estados: [],
  });

  const [
    filtrosFormulario,
    setFiltrosFormulario,
  ] = useState(
    FILTROS_INICIALES
  );

  const [
    filtrosAplicados,
    setFiltrosAplicados,
  ] = useState(
    FILTROS_INICIALES
  );

  const [
    mostrarFiltros,
    setMostrarFiltros,
  ] = useState(false);

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    ultimaActualizacion,
    setUltimaActualizacion,
  ] = useState(null);

  const [
    mostrarGenerador,
    setMostrarGenerador,
  ] = useState(false);

  const [
    formatoExportacion,
    setFormatoExportacion,
  ] = useState("pdf");

  const [
    errorExportacion,
    setErrorExportacion,
  ] = useState("");

  const [
    seccionesExportacion,
    setSeccionesExportacion,
  ] = useState({
    resumen: true,
    ingresos: true,
    ocupacion: true,
    canales: true,
    estados: true,
    propiedades: true,
  });

  // =========================================================
  // CARGA
  // =========================================================

  useEffect(() => {
    obtenerOpciones();
  }, []);

  useEffect(() => {
    obtenerReportes(
      filtrosAplicados
    );
  }, [filtrosAplicados]);

  const obtenerOpciones =
    async () => {
      try {
        const response =
          await api.get(
            "/dashboard/reportes/opciones"
          );

        setOpciones(
          response.data
            .opciones || {
            propiedades: [],
            canales: [],
            estados: [],
          }
        );
      } catch (error) {
        console.error(
          "No se pudieron cargar las opciones de filtros:",
          error
        );
      }
    };

  const construirParametros =
    (
      filtros
    ) => {
      const params =
        new URLSearchParams();

      params.set(
        "periodo",
        filtros.periodo
      );

      if (
        filtros.periodo ===
        "personalizado"
      ) {
        params.set(
          "fechaDesde",
          filtros.fechaDesde
        );

        params.set(
          "fechaHasta",
          filtros.fechaHasta
        );
      } else {
        params.set(
          "meses",
          filtros.periodo
        );
      }

      if (
        filtros.idPropiedad
      ) {
        params.set(
          "idPropiedad",
          filtros.idPropiedad
        );
      }

      if (
        filtros.canal
      ) {
        params.set(
          "canal",
          filtros.canal
        );
      }

      if (
        filtros.estado
      ) {
        params.set(
          "estado",
          filtros.estado
        );
      }

      return params
        .toString();
    };

  const obtenerReportes =
    async (
      filtros =
        filtrosAplicados
    ) => {
      try {
        setCargando(true);
        setError("");

        const parametros =
          construirParametros(
            filtros
          );

        const response =
          await api.get(
            `/dashboard/reportes?${parametros}`
          );

        setDatos(
          response.data.reportes
        );

        setUltimaActualizacion(
          new Date()
        );
      } catch (error) {
        setError(
          error.response?.data
            ?.mensaje ||
            "No se pudieron cargar los reportes."
        );
      } finally {
        setCargando(false);
      }
    };

  // =========================================================
  // FILTROS
  // =========================================================

  const cambiarFiltro =
    (
      e
    ) => {
      const {
        name,
        value,
      } = e.target;

      const nuevosFiltros = {
        ...filtrosFormulario,
        [name]: value,
      };

      if (
        name ===
        "periodo"
      ) {
        nuevosFiltros
          .fechaDesde = "";

        nuevosFiltros
          .fechaHasta = "";
      }

      setFiltrosFormulario(
        nuevosFiltros
      );

      /*
       * Ningún filtro se aplica mientras
       * el usuario está armando la consulta.
       * La única acción que modifica el
       * reporte es "Aplicar filtros".
       */
    };

  const aplicarFiltros =
    (
      e
    ) => {
      e.preventDefault();

      if (
        filtrosFormulario
          .periodo ===
        "personalizado"
      ) {
        if (
          !filtrosFormulario
            .fechaDesde ||
          !filtrosFormulario
            .fechaHasta
        ) {
          setError(
            "Indicá una fecha desde y una fecha hasta para el período personalizado."
          );

          return;
        }

        if (
          filtrosFormulario
            .fechaDesde >
          filtrosFormulario
            .fechaHasta
        ) {
          setError(
            "La fecha desde no puede ser posterior a la fecha hasta."
          );

          return;
        }
      }

      setError("");

      setFiltrosAplicados({
        ...filtrosFormulario,
      });

      setMostrarFiltros(
        false
      );
    };

  const limpiarFiltros =
    () => {
      setFiltrosFormulario({
        ...FILTROS_INICIALES,
      });

      setFiltrosAplicados({
        ...FILTROS_INICIALES,
      });

      setError("");

      setMostrarFiltros(
        false
      );
    };

  const cantidadFiltrosSecundarios =
    [
      filtrosAplicados
        .idPropiedad,
      filtrosAplicados
        .canal,
      filtrosAplicados
        .estado,
    ].filter(Boolean).length;

  const propiedadSeleccionada =
    opciones.propiedades.find(
      (
        propiedad
      ) =>
        String(
          propiedad.idPropiedad
        ) ===
        String(
          filtrosAplicados
            .idPropiedad
        )
    );

  const etiquetasFiltros =
    useMemo(
      () => {
        const etiquetas = [];

        if (
          datos?.periodo
            ?.tipo ===
          "personalizado"
        ) {
          etiquetas.push(
            `Período: ${datos.periodo.fechaDesde} al ${datos.periodo.fechaHasta}`
          );
        } else {
          etiquetas.push(
            `Período: últimos ${datos?.periodo?.meses || filtrosAplicados.periodo} meses`
          );
        }

        if (
          propiedadSeleccionada
        ) {
          etiquetas.push(
            `Propiedad: ${propiedadSeleccionada.nombre}`
          );
        }

        if (
          filtrosAplicados
            .canal
        ) {
          etiquetas.push(
            `Canal: ${filtrosAplicados.canal}`
          );
        }

        if (
          filtrosAplicados
            .estado
        ) {
          etiquetas.push(
            `Estado: ${filtrosAplicados.estado}`
          );
        }

        return etiquetas;
      },
      [
        datos,
        filtrosAplicados,
        propiedadSeleccionada,
      ]
    );

  // =========================================================
  // GENERAR REPORTE
  // =========================================================

  const cambiarSeccionExportacion =
    (
      nombre
    ) => {
      setSeccionesExportacion(
        (
          anterior
        ) => ({
          ...anterior,
          [nombre]:
            !anterior[nombre],
        })
      );
    };

  const seleccionarTodasLasSecciones =
    (
      valor
    ) => {
      setSeccionesExportacion({
        resumen:
          valor,
        ingresos:
          valor,
        ocupacion:
          valor,
        canales:
          valor,
        estados:
          valor,
        propiedades:
          valor,
      });
    };

  const haySeccionesSeleccionadas =
    Object.values(
      seccionesExportacion
    ).some(Boolean);

  const escaparHtml =
    (
      valor
    ) =>
      String(
        valor ?? ""
      )
        .replace(
          /&/g,
          "&amp;"
        )
        .replace(
          /</g,
          "&lt;"
        )
        .replace(
          />/g,
          "&gt;"
        )
        .replace(
          /"/g,
          "&quot;"
        )
        .replace(
          /'/g,
          "&#039;"
        );

  const escaparCsv =
    (
      valor
    ) => {
      const texto =
        String(
          valor ?? ""
        );

      if (
        /[;"\n\r]/.test(
          texto
        )
      ) {
        return `"${texto.replace(
          /"/g,
          '""'
        )}"`;
      }

      return texto;
    };

  const nombreArchivoReporte =
    () => {
      const fecha =
        new Date()
          .toISOString()
          .slice(
            0,
            10
          );

      return `HostFlow_Reporte_${fecha}`;
    };

  const descargarArchivo =
    (
      contenido,
      nombre,
      tipo
    ) => {
      const blob =
        new Blob(
          [
            contenido,
          ],
          {
            type:
              tipo,
          }
        );

      const url =
        window.URL
          .createObjectURL(
            blob
          );

      const enlace =
        document.createElement(
          "a"
        );

      enlace.href =
        url;

      enlace.download =
        nombre;

      document.body
        .appendChild(
          enlace
        );

      enlace.click();

      enlace.remove();

      window.URL
        .revokeObjectURL(
          url
        );
    };

  const construirCsvReporte =
    () => {
      const filas = [];

      filas.push([
        "HOSTFLOW - REPORTE",
      ]);

      filas.push([
        "Filtros aplicados",
        etiquetasFiltros.join(
          " | "
        ),
      ]);

      filas.push([
        "Generado",
        new Date()
          .toLocaleString(
            "es-AR"
          ),
      ]);

      filas.push([]);

      if (
        seccionesExportacion
          .resumen
      ) {
        filas.push([
          "RESUMEN GENERAL",
        ]);

        filas.push([
          "Métrica",
          "Valor",
        ]);

        filas.push([
          "Ingresos estimados",
          formatearMonto(
            datos.resumen
              .ingresosEstimados
          ),
        ]);

        filas.push([
          "Reservas del período",
          datos.resumen
            .totalReservasPeriodo,
        ]);

        filas.push([
          "Ocupación promedio",
          `${datos.resumen.ocupacionPromedio}%`,
        ]);

        filas.push([
          "Noches ocupadas",
          datos.resumen
            .nochesOcupadas,
        ]);

        filas.push([
          "Noches disponibles",
          datos.resumen
            .nochesDisponibles,
        ]);

        filas.push([]);
      }

      if (
        seccionesExportacion
          .ingresos
      ) {
        filas.push([
          "INGRESOS MENSUALES",
        ]);

        filas.push([
          "Mes",
          "Reservas",
          "Ingresos estimados",
        ]);

        datos.historico.forEach(
          (
            item
          ) => {
            filas.push([
              formatearMes(
                item.inicioMes
              ),
              item.cantidadReservas,
              formatearMonto(
                item.ingresosMes
              ),
            ]);
          }
        );

        filas.push([]);
      }

      if (
        seccionesExportacion
          .ocupacion
      ) {
        filas.push([
          "OCUPACIÓN MENSUAL",
        ]);

        filas.push([
          "Mes",
          "Ocupación",
          "Noches ocupadas",
          "Noches disponibles",
        ]);

        datos.historico.forEach(
          (
            item
          ) => {
            filas.push([
              formatearMes(
                item.inicioMes
              ),
              `${item.ocupacionMensual}%`,
              item.nochesOcupadas,
              item.nochesDisponibles,
            ]);
          }
        );

        filas.push([]);
      }

      if (
        seccionesExportacion
          .canales
      ) {
        filas.push([
          "RESERVAS POR CANAL",
        ]);

        filas.push([
          "Canal",
          "Reservas",
          "Participación",
        ]);

        datos.porCanal.forEach(
          (
            item
          ) => {
            filas.push([
              item.canal,
              item.cantidad,
              `${item.porcentaje}%`,
            ]);
          }
        );

        filas.push([]);
      }

      if (
        seccionesExportacion
          .estados
      ) {
        filas.push([
          "RESERVAS POR ESTADO",
        ]);

        filas.push([
          "Estado",
          "Reservas",
          "Participación",
        ]);

        datos.porEstado.forEach(
          (
            item
          ) => {
            filas.push([
              item.estado,
              item.cantidad,
              `${item.porcentaje}%`,
            ]);
          }
        );

        filas.push([]);
      }

      if (
        seccionesExportacion
          .propiedades
      ) {
        filas.push([
          "RENDIMIENTO POR PROPIEDAD",
        ]);

        filas.push([
          "Propiedad",
          "Reservas",
          "Noches",
          "Ingresos estimados",
          "Participación de ingresos",
        ]);

        datos.porPropiedad.forEach(
          (
            item
          ) => {
            filas.push([
              item.propiedad,
              item.reservas,
              item.nochesReservadas,
              formatearMonto(
                item.ingresosEstimados
              ),
              `${item.participacionIngresos}%`,
            ]);
          }
        );
      }

      return (
        "\ufeff" +
        filas
          .map(
            (
              fila
            ) =>
              fila
                .map(
                  escaparCsv
                )
                .join(";")
          )
          .join("\n")
      );
    };

  const construirExcelReporte =
    () => {
      const crearTabla =
        (
          titulo,
          encabezados,
          filas
        ) => `
          <h2>${escaparHtml(
            titulo
          )}</h2>

          <table>
            <thead>
              <tr>
                ${encabezados
                  .map(
                    (
                      encabezado
                    ) =>
                      `<th>${escaparHtml(
                        encabezado
                      )}</th>`
                  )
                  .join("")}
              </tr>
            </thead>

            <tbody>
              ${filas
                .map(
                  (
                    fila
                  ) => `
                    <tr>
                      ${fila
                        .map(
                          (
                            celda
                          ) =>
                            `<td>${escaparHtml(
                              celda
                            )}</td>`
                        )
                        .join("")}
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        `;

      const secciones = [];

      if (
        seccionesExportacion
          .resumen
      ) {
        secciones.push(
          crearTabla(
            "Resumen general",
            [
              "Métrica",
              "Valor",
            ],
            [
              [
                "Ingresos estimados",
                formatearMonto(
                  datos.resumen
                    .ingresosEstimados
                ),
              ],
              [
                "Reservas del período",
                datos.resumen
                  .totalReservasPeriodo,
              ],
              [
                "Ocupación promedio",
                `${datos.resumen.ocupacionPromedio}%`,
              ],
              [
                "Noches ocupadas",
                datos.resumen
                  .nochesOcupadas,
              ],
              [
                "Noches disponibles",
                datos.resumen
                  .nochesDisponibles,
              ],
            ]
          )
        );
      }

      if (
        seccionesExportacion
          .ingresos
      ) {
        secciones.push(
          crearTabla(
            "Ingresos mensuales",
            [
              "Mes",
              "Reservas",
              "Ingresos estimados",
            ],
            datos.historico.map(
              (
                item
              ) => [
                formatearMes(
                  item.inicioMes
                ),
                item.cantidadReservas,
                formatearMonto(
                  item.ingresosMes
                ),
              ]
            )
          )
        );
      }

      if (
        seccionesExportacion
          .ocupacion
      ) {
        secciones.push(
          crearTabla(
            "Ocupación mensual",
            [
              "Mes",
              "Ocupación",
              "Noches ocupadas",
              "Noches disponibles",
            ],
            datos.historico.map(
              (
                item
              ) => [
                formatearMes(
                  item.inicioMes
                ),
                `${item.ocupacionMensual}%`,
                item.nochesOcupadas,
                item.nochesDisponibles,
              ]
            )
          )
        );
      }

      if (
        seccionesExportacion
          .canales
      ) {
        secciones.push(
          crearTabla(
            "Reservas por canal",
            [
              "Canal",
              "Reservas",
              "Participación",
            ],
            datos.porCanal.map(
              (
                item
              ) => [
                item.canal,
                item.cantidad,
                `${item.porcentaje}%`,
              ]
            )
          )
        );
      }

      if (
        seccionesExportacion
          .estados
      ) {
        secciones.push(
          crearTabla(
            "Reservas por estado",
            [
              "Estado",
              "Reservas",
              "Participación",
            ],
            datos.porEstado.map(
              (
                item
              ) => [
                item.estado,
                item.cantidad,
                `${item.porcentaje}%`,
              ]
            )
          )
        );
      }

      if (
        seccionesExportacion
          .propiedades
      ) {
        secciones.push(
          crearTabla(
            "Rendimiento por propiedad",
            [
              "Propiedad",
              "Reservas",
              "Noches",
              "Ingresos estimados",
              "Participación de ingresos",
            ],
            datos.porPropiedad.map(
              (
                item
              ) => [
                item.propiedad,
                item.reservas,
                item.nochesReservadas,
                formatearMonto(
                  item.ingresosEstimados
                ),
                `${item.participacionIngresos}%`,
              ]
            )
          )
        );
      }

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />

            <style>
              body {
                font-family: Arial, sans-serif;
                color: #172033;
              }

              h1 {
                margin-bottom: 6px;
                color: #1d4ed8;
              }

              .filters {
                margin-bottom: 24px;
                color: #475569;
              }

              h2 {
                margin-top: 26px;
                margin-bottom: 8px;
                font-size: 16px;
              }

              table {
                width: 100%;
                margin-bottom: 18px;
                border-collapse: collapse;
              }

              th,
              td {
                padding: 8px;
                border: 1px solid #cbd5e1;
                font-size: 12px;
                text-align: center;
                vertical-align: middle;
              }

              th {
                background: #eff6ff;
                font-weight: bold;
              }
            </style>
          </head>

          <body>
            <h1>HostFlow · Reporte</h1>

            <div class="filters">
              ${escaparHtml(
                etiquetasFiltros.join(
                  " · "
                )
              )}
            </div>

            ${secciones.join(
              ""
            )}
          </body>
        </html>
      `;
    };

  const construirHtmlImpresion =
    () => {
      const tabla =
        (
          titulo,
          encabezados,
          filas
        ) => `
          <section>
            <h2>${escaparHtml(
              titulo
            )}</h2>

            <table>
              <thead>
                <tr>
                  ${encabezados
                    .map(
                      (
                        encabezado
                      ) =>
                        `<th>${escaparHtml(
                          encabezado
                        )}</th>`
                    )
                    .join("")}
                </tr>
              </thead>

              <tbody>
                ${filas
                  .map(
                    (
                      fila
                    ) => `
                      <tr>
                        ${fila
                          .map(
                            (
                              celda
                            ) =>
                              `<td>${escaparHtml(
                                celda
                              )}</td>`
                          )
                          .join("")}
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </section>
        `;

      const secciones = [];

      if (
        seccionesExportacion
          .resumen
      ) {
        secciones.push(
          tabla(
            "Resumen general",
            [
              "Métrica",
              "Valor",
            ],
            [
              [
                "Ingresos estimados",
                formatearMonto(
                  datos.resumen
                    .ingresosEstimados
                ),
              ],
              [
                "Reservas del período",
                datos.resumen
                  .totalReservasPeriodo,
              ],
              [
                "Ocupación promedio",
                `${datos.resumen.ocupacionPromedio}%`,
              ],
              [
                "Noches ocupadas",
                datos.resumen
                  .nochesOcupadas,
              ],
              [
                "Noches disponibles",
                datos.resumen
                  .nochesDisponibles,
              ],
            ]
          )
        );
      }

      if (
        seccionesExportacion
          .ingresos
      ) {
        secciones.push(
          tabla(
            "Ingresos mensuales",
            [
              "Mes",
              "Reservas",
              "Ingresos estimados",
            ],
            datos.historico.map(
              (
                item
              ) => [
                formatearMes(
                  item.inicioMes
                ),
                item.cantidadReservas,
                formatearMonto(
                  item.ingresosMes
                ),
              ]
            )
          )
        );
      }

      if (
        seccionesExportacion
          .ocupacion
      ) {
        secciones.push(
          tabla(
            "Ocupación mensual",
            [
              "Mes",
              "Ocupación",
              "Noches ocupadas",
              "Noches disponibles",
            ],
            datos.historico.map(
              (
                item
              ) => [
                formatearMes(
                  item.inicioMes
                ),
                `${item.ocupacionMensual}%`,
                item.nochesOcupadas,
                item.nochesDisponibles,
              ]
            )
          )
        );
      }

      if (
        seccionesExportacion
          .canales
      ) {
        secciones.push(
          tabla(
            "Reservas por canal",
            [
              "Canal",
              "Reservas",
              "Participación",
            ],
            datos.porCanal.map(
              (
                item
              ) => [
                item.canal,
                item.cantidad,
                `${item.porcentaje}%`,
              ]
            )
          )
        );
      }

      if (
        seccionesExportacion
          .estados
      ) {
        secciones.push(
          tabla(
            "Reservas por estado",
            [
              "Estado",
              "Reservas",
              "Participación",
            ],
            datos.porEstado.map(
              (
                item
              ) => [
                item.estado,
                item.cantidad,
                `${item.porcentaje}%`,
              ]
            )
          )
        );
      }

      if (
        seccionesExportacion
          .propiedades
      ) {
        secciones.push(
          tabla(
            "Rendimiento por propiedad",
            [
              "Propiedad",
              "Reservas",
              "Noches",
              "Ingresos estimados",
              "Participación",
            ],
            datos.porPropiedad.map(
              (
                item
              ) => [
                item.propiedad,
                item.reservas,
                item.nochesReservadas,
                formatearMonto(
                  item.ingresosEstimados
                ),
                `${item.participacionIngresos}%`,
              ]
            )
          )
        );
      }

      return `
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="UTF-8" />
            <title>HostFlow · Reporte</title>

            <style>
              @page {
                margin: 16mm;
              }

              * {
                box-sizing: border-box;
              }

              body {
                margin: 0;
                font-family:
                  Arial,
                  sans-serif;
                color: #172033;
              }

              header {
                padding-bottom: 16px;
                margin-bottom: 22px;
                border-bottom:
                  2px solid #2563eb;
              }

              header h1 {
                margin: 0;
                color: #172033;
                font-size: 26px;
              }

              header strong {
                color: #2563eb;
              }

              .subtitle {
                margin-top: 5px;
                color: #64748b;
                font-size: 12px;
              }

              .filters {
                margin-top: 12px;
                padding: 10px 12px;
                border-radius: 8px;
                background: #f1f5f9;
                color: #475569;
                font-size: 11px;
                line-height: 1.5;
              }

              section {
                margin-bottom: 24px;
                page-break-inside: avoid;
              }

              h2 {
                margin:
                  0 0 10px;
                font-size: 17px;
              }

              table {
                width: 100%;
                border-collapse: collapse;
              }

              th,
              td {
                padding:
                  8px 9px;
                border:
                  1px solid #cbd5e1;
                font-size: 10px;
                text-align: center;
                vertical-align: middle;
              }

              th {
                background: #eff6ff;
                font-weight: 700;
              }

              footer {
                margin-top: 28px;
                padding-top: 10px;
                border-top:
                  1px solid #cbd5e1;
                color: #64748b;
                font-size: 9px;
              }

              @media print {
                body {
                  -webkit-print-color-adjust:
                    exact;
                  print-color-adjust:
                    exact;
                }
              }
            </style>
          </head>

          <body>
            <header>
              <h1>
                <strong>HostFlow</strong>
                · Reporte
              </h1>

              <div class="subtitle">
                Generado el
                ${escaparHtml(
                  new Date()
                    .toLocaleString(
                      "es-AR"
                    )
                )}
              </div>

              <div class="filters">
                ${escaparHtml(
                  etiquetasFiltros.join(
                    " · "
                  )
                )}
              </div>
            </header>

            ${secciones.join(
              ""
            )}

            <footer>
              Reporte generado desde HostFlow.
            </footer>

            <script>
              window.onload = function () {
                window.print();
              };
            </script>
          </body>
        </html>
      `;
    };

  const generarPdfDirecto =
    (
      nombre
    ) => {
      const doc =
        new jsPDF({
          orientation:
            "portrait",
          unit:
            "mm",
          format:
            "a4",
        });

      const margenX =
        14;

      const anchoUtil =
        182;

      let y =
        16;

      const agregarTituloSeccion =
        (
          titulo
        ) => {
          if (
            y >
            262
          ) {
            doc.addPage();

            y =
              16;
          }

          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.setFontSize(
            13
          );

          doc.setTextColor(
            23,
            32,
            51
          );

          doc.text(
            titulo,
            margenX,
            y
          );

          y +=
            5;
        };

      const agregarTabla =
        (
          encabezados,
          filas,
          opciones = {}
        ) => {
          autoTable(
            doc,
            {
              startY:
                y,

              head: [
                encabezados,
              ],

              body:
                filas,

              theme:
                "grid",

              margin: {
                left:
                  margenX,
                right:
                  margenX,
              },

              styles: {
                font:
                  "helvetica",
                fontSize:
                  8.5,
                cellPadding:
                  2.5,
                textColor: [
                  37,
                  52,
                  74,
                ],
                lineColor: [
                  203,
                  213,
                  225,
                ],
                lineWidth:
                  0.1,
                valign:
                  "middle",
                halign:
                  "center",
              },

              headStyles: {
                fillColor: [
                  239,
                  246,
                  255,
                ],
                textColor: [
                  30,
                  64,
                  175,
                ],
                fontStyle:
                  "bold",
                fontSize:
                  8.5,
                halign:
                  "center",
              },

              alternateRowStyles: {
                fillColor: [
                  248,
                  250,
                  252,
                ],
              },

              ...opciones,
            }
          );

          y =
            (
              doc.lastAutoTable
                ?.finalY ||
              y
            ) +
            8;
        };

      // =====================================================
      // ENCABEZADO
      // =====================================================

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        21
      );

      doc.setTextColor(
        37,
        99,
        235
      );

      const tituloHostFlow =
        "HostFlow";

      doc.text(
        tituloHostFlow,
        margenX,
        y
      );

      const inicioReporte =
        margenX +
        doc.getTextWidth(
          tituloHostFlow
        ) +
        3;

      doc.setTextColor(
        23,
        32,
        51
      );

      doc.text(
        "Reporte",
        inicioReporte,
        y
      );

      y +=
        7;

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(
        8.5
      );

      doc.setTextColor(
        100,
        116,
        139
      );

      doc.text(
        `Generado: ${new Date().toLocaleString(
          "es-AR"
        )}`,
        margenX,
        y
      );

      y +=
        5;

      const filtrosPdf =
        doc.splitTextToSize(
          etiquetasFiltros.join(
            " | "
          ),
          anchoUtil
        );

      doc.setFillColor(
        248,
        250,
        252
      );

      const altoFiltros =
        Math.max(
          11,
          filtrosPdf.length *
            4 +
            5
        );

      doc.roundedRect(
        margenX,
        y,
        anchoUtil,
        altoFiltros,
        2,
        2,
        "F"
      );

      doc.setTextColor(
        71,
        85,
        105
      );

      doc.text(
        filtrosPdf,
        margenX + 3,
        y + 5
      );

      y +=
        altoFiltros +
        9;

      // =====================================================
      // SECCIONES
      // =====================================================

      if (
        seccionesExportacion
          .resumen
      ) {
        agregarTituloSeccion(
          "Resumen general"
        );

        agregarTabla(
          [
            "Métrica",
            "Valor",
          ],
          [
            [
              "Ingresos estimados",
              formatearMonto(
                datos.resumen
                  .ingresosEstimados
              ),
            ],
            [
              "Reservas del período",
              String(
                datos.resumen
                  .totalReservasPeriodo
              ),
            ],
            [
              "Ocupación promedio",
              `${datos.resumen.ocupacionPromedio}%`,
            ],
            [
              "Noches ocupadas",
              String(
                datos.resumen
                  .nochesOcupadas
              ),
            ],
            [
              "Noches disponibles",
              String(
                datos.resumen
                  .nochesDisponibles
              ),
            ],
          ]
        );
      }

      if (
        seccionesExportacion
          .ingresos
      ) {
        agregarTituloSeccion(
          "Ingresos mensuales"
        );

        agregarTabla(
          [
            "Mes",
            "Reservas",
            "Ingresos estimados",
          ],
          datos.historico.map(
            (
              item
            ) => [
              formatearMes(
                item.inicioMes
              ),
              String(
                item.cantidadReservas
              ),
              formatearMonto(
                item.ingresosMes
              ),
            ]
          ),
          {
            columnStyles: {
              1: {
                halign:
                  "center",
              },
              2: {
                halign:
                  "center",
              },
            },
          }
        );
      }

      if (
        seccionesExportacion
          .ocupacion
      ) {
        agregarTituloSeccion(
          "Ocupación mensual"
        );

        agregarTabla(
          [
            "Mes",
            "Ocupación",
            "Noches ocupadas",
            "Noches disponibles",
          ],
          datos.historico.map(
            (
              item
            ) => [
              formatearMes(
                item.inicioMes
              ),
              `${item.ocupacionMensual}%`,
              String(
                item.nochesOcupadas
              ),
              String(
                item.nochesDisponibles
              ),
            ]
          ),
          {
            columnStyles: {
              1: {
                halign:
                  "center",
              },
              2: {
                halign:
                  "center",
              },
              3: {
                halign:
                  "center",
              },
            },
          }
        );
      }

      if (
        seccionesExportacion
          .canales
      ) {
        agregarTituloSeccion(
          "Reservas por canal"
        );

        agregarTabla(
          [
            "Canal",
            "Reservas",
            "Participación",
          ],
          datos.porCanal.map(
            (
              item
            ) => [
              item.canal,
              String(
                item.cantidad
              ),
              `${item.porcentaje}%`,
            ]
          ),
          {
            columnStyles: {
              1: {
                halign:
                  "center",
              },
              2: {
                halign:
                  "center",
              },
            },
          }
        );
      }

      if (
        seccionesExportacion
          .estados
      ) {
        agregarTituloSeccion(
          "Reservas por estado"
        );

        agregarTabla(
          [
            "Estado",
            "Reservas",
            "Participación",
          ],
          datos.porEstado.map(
            (
              item
            ) => [
              item.estado,
              String(
                item.cantidad
              ),
              `${item.porcentaje}%`,
            ]
          ),
          {
            columnStyles: {
              1: {
                halign:
                  "center",
              },
              2: {
                halign:
                  "center",
              },
            },
          }
        );
      }

      if (
        seccionesExportacion
          .propiedades
      ) {
        agregarTituloSeccion(
          "Rendimiento por propiedad"
        );

        agregarTabla(
          [
            "Propiedad",
            "Reservas",
            "Noches",
            "Ingresos estimados",
            "Participación",
          ],
          datos.porPropiedad.map(
            (
              item
            ) => [
              item.propiedad,
              String(
                item.reservas
              ),
              String(
                item.nochesReservadas
              ),
              formatearMonto(
                item.ingresosEstimados
              ),
              `${item.participacionIngresos}%`,
            ]
          ),
          {
            styles: {
              font:
                "helvetica",
              fontSize:
                7.8,
              cellPadding:
                2.2,
              textColor: [
                37,
                52,
                74,
              ],
              lineColor: [
                203,
                213,
                225,
              ],
              lineWidth:
                0.1,
              valign:
                "middle",
              halign:
                "center",
            },

            columnStyles: {
              1: {
                halign:
                  "center",
              },
              2: {
                halign:
                  "center",
              },
              3: {
                halign:
                  "center",
              },
              4: {
                halign:
                  "center",
              },
            },
          }
        );
      }

      // =====================================================
      // PIE DE PÁGINA
      // =====================================================

      const totalPaginas =
        doc.getNumberOfPages();

      for (
        let pagina = 1;
        pagina <= totalPaginas;
        pagina += 1
      ) {
        doc.setPage(
          pagina
        );

        doc.setDrawColor(
          226,
          232,
          240
        );

        doc.line(
          margenX,
          286,
          196,
          286
        );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(
          7.5
        );

        doc.setTextColor(
          100,
          116,
          139
        );

        doc.text(
          "HostFlow - Reporte generado desde el sistema",
          margenX,
          291
        );

        doc.text(
          `Página ${pagina} de ${totalPaginas}`,
          196,
          291,
          {
            align:
              "right",
          }
        );
      }

      doc.save(
        `${nombre}.pdf`
      );
    };

  const generarArchivoReporte =
    () => {
      if (
        !haySeccionesSeleccionadas
      ) {
        setErrorExportacion(
          "Seleccioná al menos una sección para generar el reporte."
        );

        return;
      }

      setErrorExportacion("");

      const nombre =
        nombreArchivoReporte();

      if (
        formatoExportacion ===
        "csv"
      ) {
        descargarArchivo(
          construirCsvReporte(),
          `${nombre}.csv`,
          "text/csv;charset=utf-8"
        );

        setMostrarGenerador(
          false
        );

        return;
      }

      if (
        formatoExportacion ===
        "excel"
      ) {
        descargarArchivo(
          "\ufeff" +
            construirExcelReporte(),
          `${nombre}.xls`,
          "application/vnd.ms-excel;charset=utf-8"
        );

        setMostrarGenerador(
          false
        );

        return;
      }

      if (
        formatoExportacion ===
        "pdf"
      ) {
        generarPdfDirecto(
          nombre
        );

        setMostrarGenerador(
          false
        );

        return;
      }

      /*
       * A partir de acá queda solamente
       * el flujo de impresión.
       *
       * Imprimir sí abre una vista optimizada
       * y dispara el diálogo del navegador.
       */
      /*
       * No usamos "noopener,noreferrer" en window.open
       * porque algunos navegadores devuelven null aunque
       * la pestaña se abra correctamente. Eso hacía que
       * HostFlow interpretara el caso como popup bloqueado
       * y dejara una pestaña about:blank.
       */
      const ventana =
        window.open(
          "",
          "_blank"
        );

      if (!ventana) {
        setErrorExportacion(
          "El navegador bloqueó la ventana del reporte. Permití ventanas emergentes para HostFlow e intentá nuevamente."
        );

        return;
      }

      ventana.document.open();
      ventana.document.write(
        construirHtmlImpresion()
      );
      ventana.document.close();

      /*
       * Una vez cargado el documento, cortamos la
       * referencia hacia HostFlow manualmente.
       */
      try {
        ventana.opener =
          null;
      } catch {
        // Algunos navegadores pueden impedir modificar opener.
      }

      setMostrarGenerador(
        false
      );
    };

  // =========================================================
  // FORMATO
  // =========================================================

  const formatearHoraActualizacion =
    (
      fecha
    ) => {
      if (!fecha) {
        return "";
      }

      return fecha.toLocaleTimeString(
        "es-AR",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    };

  const formatearMonto =
    (
      valor
    ) =>
      Number(
        valor || 0
      ).toLocaleString(
        "es-AR",
        {
          style:
            "currency",
          currency:
            "ARS",
          maximumFractionDigits:
            0,
        }
      );

  const formatearMes =
    (
      fecha
    ) => {
      if (!fecha) {
        return "-";
      }

      const valor =
        new Date(
          `${String(
            fecha
          ).slice(
            0,
            10
          )}T00:00:00`
        );

      const texto =
        new Intl.DateTimeFormat(
          "es-AR",
          {
            month:
              "long",
            year:
              "numeric",
          }
        ).format(
          valor
        );

      return (
        texto.charAt(0)
          .toUpperCase() +
        texto.slice(1)
      );
    };

  const maxIngresoMensual =
    useMemo(
      () =>
        Math.max(
          ...(
            datos?.historico ||
            []
          ).map(
            (item) =>
              Number(
                item.ingresosMes ||
                0
              )
          ),
          1
        ),
      [datos]
    );

  if (
    cargando &&
    !datos
  ) {
    return (
      <section className="reportes-page">
        <div className="reportes-loading">
          Cargando reportes...
        </div>
      </section>
    );
  }

  return (
    <section className="reportes-page">
      <div className="reportes-header">
        <div>
          <span className="reportes-kicker">
            ANÁLISIS OPERATIVO
          </span>

          <h1>
            Reportes
          </h1>

          <p>
            Análisis de rendimiento,
            ocupación, ingresos y reservas
            registradas en HostFlow.
          </p>
        </div>

        <div className="reportes-header-actions">
          <button
            type="button"
            className={`reportes-filter-toggle ${
              mostrarFiltros
                ? "active"
                : ""
            }`}
            onClick={() =>
              setMostrarFiltros(
                (
                  anterior
                ) =>
                  !anterior
              )
            }
          >
            Filtros
            {cantidadFiltrosSecundarios >
              0 && (
              <span>
                {
                  cantidadFiltrosSecundarios
                }
              </span>
            )}
          </button>

          <button
            type="button"
            className="reportes-generate-button"
            onClick={() => {
              setErrorExportacion(
                ""
              );

              setMostrarGenerador(
                true
              );
            }}
          >
            Generar reporte
          </button>
        </div>
      </div>

      {mostrarFiltros && (
        <form
          className="reportes-filter-panel"
          onSubmit={
            aplicarFiltros
          }
        >
          <div className="reportes-filter-panel-header">
            <div>
              <h2>
                Filtros del reporte
              </h2>

              <p>
                Combiná período, propiedad,
                canal y estado para analizar
                solamente la información que
                necesitás.
              </p>
            </div>

            <button
              type="button"
              className="reportes-filter-close"
              onClick={() =>
                setMostrarFiltros(
                  false
                )
              }
              aria-label="Cerrar filtros"
            >
              ×
            </button>
          </div>

          <div className="reportes-filter-grid">
            <label>
              <span>
                Período
              </span>

              <select
                name="periodo"
                value={
                  filtrosFormulario
                    .periodo
                }
                onChange={
                  cambiarFiltro
                }
              >
                <option value="3">
                  Últimos 3 meses
                </option>

                <option value="6">
                  Últimos 6 meses
                </option>

                <option value="12">
                  Últimos 12 meses
                </option>

                <option value="personalizado">
                  Personalizado
                </option>
              </select>
            </label>

            {filtrosFormulario
              .periodo ===
              "personalizado" && (
              <>
                <label>
                  <span>
                    Desde
                  </span>

                  <input
                    type="date"
                    name="fechaDesde"
                    value={
                      filtrosFormulario
                        .fechaDesde
                    }
                    onChange={
                      cambiarFiltro
                    }
                  />
                </label>

                <label>
                  <span>
                    Hasta
                  </span>

                  <input
                    type="date"
                    name="fechaHasta"
                    value={
                      filtrosFormulario
                        .fechaHasta
                    }
                    onChange={
                      cambiarFiltro
                    }
                  />
                </label>
              </>
            )}

            <label>
              <span>
                Propiedad
              </span>

              <select
                name="idPropiedad"
                value={
                  filtrosFormulario
                    .idPropiedad
                }
                onChange={
                  cambiarFiltro
                }
              >
                <option value="">
                  Todas las propiedades
                </option>

                {opciones.propiedades.map(
                  (
                    propiedad
                  ) => (
                    <option
                      key={
                        propiedad.idPropiedad
                      }
                      value={
                        propiedad.idPropiedad
                      }
                    >
                      {
                        propiedad.nombre
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>
                Canal
              </span>

              <select
                name="canal"
                value={
                  filtrosFormulario
                    .canal
                }
                onChange={
                  cambiarFiltro
                }
              >
                <option value="">
                  Todos los canales
                </option>

                {opciones.canales.map(
                  (
                    canal
                  ) => (
                    <option
                      key={
                        canal
                      }
                      value={
                        canal
                      }
                    >
                      {canal}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>
                Estado
              </span>

              <select
                name="estado"
                value={
                  filtrosFormulario
                    .estado
                }
                onChange={
                  cambiarFiltro
                }
              >
                <option value="">
                  Todos los estados
                </option>

                {opciones.estados.map(
                  (
                    estado
                  ) => (
                    <option
                      key={
                        estado
                      }
                      value={
                        estado
                      }
                    >
                      {estado}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>

          <div className="reportes-filter-actions">
            <button
              type="button"
              className="reportes-filter-clear"
              onClick={
                limpiarFiltros
              }
            >
              Limpiar filtros
            </button>

            <button
              type="submit"
              className="reportes-filter-apply"
            >
              Aplicar filtros
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="reportes-error">
          {error}
        </div>
      )}

      {datos && (
        <>
          <div className="reportes-active-filter-row">
            <div className="reportes-active-filters">
              {etiquetasFiltros.map(
                (
                  etiqueta
                ) => (
                  <span
                    key={
                      etiqueta
                    }
                  >
                    {etiqueta}
                  </span>
                )
              )}
            </div>

            <div className="reportes-refresh-compact-wrap">
              {ultimaActualizacion && (
                <span>
                  Actualizado{" "}
                  {formatearHoraActualizacion(
                    ultimaActualizacion
                  )}
                </span>
              )}

              <button
                type="button"
                className="reportes-refresh-compact"
                onClick={() =>
                  obtenerReportes(
                    filtrosAplicados
                  )
                }
                disabled={
                  cargando
                }
                title="Actualizar datos con los filtros aplicados"
                aria-label="Actualizar datos"
              >
                {cargando
                  ? "Actualizando..."
                  : "↻ Actualizar datos"}
              </button>
            </div>
          </div>

          <div className="reportes-summary-grid">
            <article className="reportes-summary-card">
              <span>
                Ingresos estimados
              </span>

              <strong>
                {formatearMonto(
                  datos.resumen
                    .ingresosEstimados
                )}
              </strong>

              <small>
                Solo reservas confirmadas
                y finalizadas.
              </small>
            </article>

            <article className="reportes-summary-card">
              <span>
                Reservas del período
              </span>

              <strong>
                {
                  datos.resumen
                    .totalReservasPeriodo
                }
              </strong>

              <small>
                Total que cumple los filtros
                aplicados.
              </small>
            </article>

            <article className="reportes-summary-card">
              <span>
                Ocupación promedio
              </span>

              <strong>
                {
                  datos.resumen
                    .ocupacionPromedio
                }
                %
              </strong>

              <small>
                Sobre noches disponibles del
                inventario seleccionado.
              </small>
            </article>

            <article className="reportes-summary-card">
              <span>
                Noches ocupadas
              </span>

              <strong>
                {
                  datos.resumen
                    .nochesOcupadas
                }
              </strong>

              <small>
                de{" "}
                {
                  datos.resumen
                    .nochesDisponibles
                }{" "}
                disponibles
              </small>
            </article>
          </div>

          <div className="reportes-main-grid">
            <article className="reportes-panel reportes-panel--income">
              <div className="reportes-panel-heading">
                <div>
                  <h2>
                    Ingresos mensuales
                  </h2>

                  <p>
                    Evolución de montos
                    estimados según mes de
                    check-in.
                  </p>
                </div>
              </div>

              <div className="reportes-month-list">
                {datos.historico.map(
                  (
                    item
                  ) => {
                    const ancho =
                      Math.round(
                        (
                          Number(
                            item.ingresosMes ||
                            0
                          ) /
                          maxIngresoMensual
                        ) * 100
                      );

                    return (
                      <div
                        className="reportes-month-row"
                        key={
                          `ingresos-${item.mes}`
                        }
                      >
                        <div className="reportes-month-row-top">
                          <span>
                            {formatearMes(
                              item.inicioMes
                            )}
                          </span>

                          <strong>
                            {formatearMonto(
                              item.ingresosMes
                            )}
                          </strong>
                        </div>

                        <div className="reportes-bar">
                          <span
                            style={{
                              width:
                                `${Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    ancho
                                  )
                                )}%`,
                            }}
                          />
                        </div>

                        <small>
                          {
                            item.cantidadReservas
                          }{" "}
                          reserva
                          {Number(
                            item.cantidadReservas
                          ) === 1
                            ? ""
                            : "s"}{" "}
                          en el período del mes
                        </small>
                      </div>
                    );
                  }
                )}
              </div>
            </article>

            <article className="reportes-panel reportes-panel--occupancy">
              <div className="reportes-panel-heading">
                <div>
                  <h2>
                    Ocupación mensual
                  </h2>

                  <p>
                    Noches ocupadas sobre
                    noches disponibles por
                    mes.
                  </p>
                </div>
              </div>

              <div className="reportes-month-list">
                {datos.historico.map(
                  (
                    item
                  ) => (
                    <div
                      className="reportes-month-row"
                      key={
                        `ocupacion-${item.mes}`
                      }
                    >
                      <div className="reportes-month-row-top">
                        <span>
                          {formatearMes(
                            item.inicioMes
                          )}
                        </span>

                        <strong>
                          {
                            item.ocupacionMensual
                          }
                          %
                        </strong>
                      </div>

                      <div className="reportes-bar reportes-bar--occupancy">
                        <span
                          style={{
                            width:
                              `${Math.max(
                                0,
                                Math.min(
                                  100,
                                  Number(
                                    item.ocupacionMensual ||
                                    0
                                  )
                                )
                              )}%`,
                          }}
                        />
                      </div>

                      <small>
                        {
                          item.nochesOcupadas
                        }{" "}
                        ocupadas ·{" "}
                        {
                          item.nochesDisponibles
                        }{" "}
                        disponibles
                      </small>
                    </div>
                  )
                )}
              </div>
            </article>
          </div>

          <div className="reportes-secondary-grid">
            <article className="reportes-panel">
              <div className="reportes-panel-heading">
                <div>
                  <h2>
                    Reservas por canal
                  </h2>

                  <p>
                    Distribución de las
                    reservas que cumplen los
                    filtros aplicados.
                  </p>
                </div>
              </div>

              <div className="reportes-breakdown-list">
                {datos.porCanal.length >
                0 ? (
                  datos.porCanal.map(
                    (
                      item
                    ) => (
                      <div
                        className="reportes-breakdown-row"
                        key={
                          item.canal
                        }
                      >
                        <div>
                          <strong>
                            {
                              item.canal
                            }
                          </strong>

                          <span>
                            {
                              item.cantidad
                            }{" "}
                            reserva
                            {Number(
                              item.cantidad
                            ) === 1
                              ? ""
                              : "s"}
                          </span>
                        </div>

                        <div className="reportes-breakdown-value">
                          {
                            item.porcentaje
                          }
                          %
                        </div>

                        <div className="reportes-bar reportes-bar--compact">
                          <span
                            style={{
                              width:
                                `${item.porcentaje}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  )
                ) : (
                  <div className="reportes-empty">
                    Sin reservas para los
                    filtros seleccionados.
                  </div>
                )}
              </div>
            </article>

            <article className="reportes-panel">
              <div className="reportes-panel-heading">
                <div>
                  <h2>
                    Reservas por estado
                  </h2>

                  <p>
                    Distribución de estados
                    dentro del período y
                    filtros seleccionados.
                  </p>
                </div>
              </div>

              <div className="reportes-breakdown-list">
                {datos.porEstado.length >
                0 ? (
                  datos.porEstado.map(
                    (
                      item
                    ) => (
                      <div
                        className="reportes-breakdown-row"
                        key={
                          item.estado
                        }
                      >
                        <div>
                          <strong>
                            {
                              item.estado
                            }
                          </strong>

                          <span>
                            {
                              item.cantidad
                            }{" "}
                            reserva
                            {Number(
                              item.cantidad
                            ) === 1
                              ? ""
                              : "s"}
                          </span>
                        </div>

                        <div className="reportes-breakdown-value">
                          {
                            item.porcentaje
                          }
                          %
                        </div>

                        <div className="reportes-bar reportes-bar--compact reportes-bar--state">
                          <span
                            style={{
                              width:
                                `${item.porcentaje}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  )
                ) : (
                  <div className="reportes-empty">
                    Sin reservas para los
                    filtros seleccionados.
                  </div>
                )}
              </div>
            </article>
          </div>

          <article className="reportes-panel reportes-property-panel">
            <div className="reportes-panel-heading">
              <div>
                <h2>
                  Rendimiento por propiedad
                </h2>

                <p>
                  Reservas, noches e ingresos
                  estimados generados por cada
                  alojamiento.
                </p>
              </div>
            </div>

            <div className="reportes-property-table-wrap">
              <table className="reportes-property-table">
                <thead>
                  <tr>
                    <th>
                      Propiedad
                    </th>

                    <th>
                      Reservas
                    </th>

                    <th>
                      Noches
                    </th>

                    <th>
                      Ingresos estimados
                    </th>

                    <th>
                      Participación de ingresos
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {datos.porPropiedad.map(
                    (
                      item
                    ) => (
                      <tr
                        key={
                          item.idPropiedad
                        }
                      >
                        <td>
                          <strong>
                            {
                              item.propiedad
                            }
                          </strong>
                        </td>

                        <td>
                          {
                            item.reservas
                          }
                        </td>

                        <td>
                          {
                            item.nochesReservadas
                          }
                        </td>

                        <td className="reportes-money">
                          {formatearMonto(
                            item.ingresosEstimados
                          )}
                        </td>

                        <td>
                          <div className="reportes-property-share">
                            <div className="reportes-bar reportes-bar--compact">
                              <span
                                style={{
                                  width:
                                    `${item.participacionIngresos}%`,
                                }}
                              />
                            </div>

                            <span>
                              {
                                item.participacionIngresos
                              }
                              %
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}

      {mostrarGenerador && (
        <div
          className="reportes-export-overlay"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              setMostrarGenerador(
                false
              );
            }
          }}
        >
          <article
            className="reportes-export-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reportes-export-title"
          >
            <header className="reportes-export-header">
              <div>
                <span>
                  EXPORTAR INFORMACIÓN
                </span>

                <h2 id="reportes-export-title">
                  Generar reporte
                </h2>

                <p>
                  Elegí qué información incluir
                  y cómo querés obtenerla.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMostrarGenerador(
                    false
                  )
                }
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>

            <div className="reportes-export-content">
              <section className="reportes-export-section">
                <div className="reportes-export-section-heading">
                  <div>
                    <h3>
                      Filtros aplicados
                    </h3>

                    <p>
                      El archivo respetará exactamente
                      la consulta que estás viendo.
                    </p>
                  </div>
                </div>

                <div className="reportes-export-filter-summary">
                  {etiquetasFiltros.map(
                    (
                      etiqueta
                    ) => (
                      <span
                        key={
                          etiqueta
                        }
                      >
                        {etiqueta}
                      </span>
                    )
                  )}
                </div>
              </section>

              <section className="reportes-export-section">
                <div className="reportes-export-section-heading">
                  <div>
                    <h3>
                      Contenido
                    </h3>

                    <p>
                      Seleccioná las secciones que
                      querés incluir.
                    </p>
                  </div>

                  <div className="reportes-export-selection-actions">
                    <button
                      type="button"
                      onClick={() =>
                        seleccionarTodasLasSecciones(
                          true
                        )
                      }
                    >
                      Todas
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        seleccionarTodasLasSecciones(
                          false
                        )
                      }
                    >
                      Ninguna
                    </button>
                  </div>
                </div>

                <div className="reportes-export-check-grid">
                  {[
                    [
                      "resumen",
                      "Resumen general",
                      "Métricas principales del período.",
                    ],
                    [
                      "ingresos",
                      "Ingresos mensuales",
                      "Evolución mensual de montos estimados.",
                    ],
                    [
                      "ocupacion",
                      "Ocupación mensual",
                      "Porcentajes y noches ocupadas.",
                    ],
                    [
                      "canales",
                      "Reservas por canal",
                      "Manual, Airbnb y Booking.",
                    ],
                    [
                      "estados",
                      "Reservas por estado",
                      "Distribución de estados.",
                    ],
                    [
                      "propiedades",
                      "Rendimiento por propiedad",
                      "Reservas, noches e ingresos por alojamiento.",
                    ],
                  ].map(
                    (
                      [
                        clave,
                        titulo,
                        descripcion,
                      ]
                    ) => (
                      <label
                        className={`reportes-export-check ${
                          seccionesExportacion[
                            clave
                          ]
                            ? "selected"
                            : ""
                        }`}
                        key={
                          clave
                        }
                      >
                        <input
                          type="checkbox"
                          checked={
                            seccionesExportacion[
                              clave
                            ]
                          }
                          onChange={() =>
                            cambiarSeccionExportacion(
                              clave
                            )
                          }
                        />

                        <span>
                          <strong>
                            {titulo}
                          </strong>

                          <small>
                            {descripcion}
                          </small>
                        </span>
                      </label>
                    )
                  )}
                </div>
              </section>

              <section className="reportes-export-section">
                <div className="reportes-export-section-heading">
                  <div>
                    <h3>
                      Formato
                    </h3>

                    <p>
                      Elegí el formato de salida.
                    </p>
                  </div>
                </div>

                <div className="reportes-export-format-grid">
                  {[
                    [
                      "pdf",
                      "PDF",
                      "Descarga un PDF listo para guardar, compartir o archivar.",
                    ],
                    [
                      "excel",
                      "Excel",
                      "Descarga un archivo compatible con Excel.",
                    ],
                    [
                      "csv",
                      "CSV",
                      "Ideal para análisis y tratamiento de datos.",
                    ],
                    [
                      "print",
                      "Imprimir",
                      "Abre la vista de impresión para elegir una impresora.",
                    ],
                  ].map(
                    (
                      [
                        valor,
                        titulo,
                        descripcion,
                      ]
                    ) => (
                      <label
                        className={`reportes-export-format ${
                          formatoExportacion ===
                          valor
                            ? "selected"
                            : ""
                        }`}
                        key={
                          valor
                        }
                      >
                        <input
                          type="radio"
                          name="formatoExportacion"
                          value={
                            valor
                          }
                          checked={
                            formatoExportacion ===
                            valor
                          }
                          onChange={(e) => {
                            setFormatoExportacion(
                              e.target.value
                            );

                            setErrorExportacion(
                              ""
                            );
                          }}
                        />

                        <strong>
                          {titulo}
                        </strong>

                        <span>
                          {descripcion}
                        </span>
                      </label>
                    )
                  )}
                </div>

                {formatoExportacion ===
                  "pdf" && (
                  <p className="reportes-export-note">
                    El archivo PDF se descargará directamente
                    con los filtros y secciones seleccionadas.
                  </p>
                )}

                {formatoExportacion ===
                  "print" && (
                  <p className="reportes-export-note">
                    Se abrirá una vista optimizada y luego
                    el diálogo de impresión del navegador.
                  </p>
                )}
              </section>

              {errorExportacion && (
                <div className="reportes-export-error">
                  {errorExportacion}
                </div>
              )}
            </div>

            <footer className="reportes-export-footer">
              <span>
                HostFlow utilizará los filtros
                actualmente aplicados.
              </span>

              <div>
                <button
                  type="button"
                  className="reportes-export-cancel"
                  onClick={() =>
                    setMostrarGenerador(
                      false
                    )
                  }
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="reportes-export-confirm"
                  onClick={
                    generarArchivoReporte
                  }
                >
                  Generar
                </button>
              </div>
            </footer>
          </article>
        </div>
      )}
    </section>
  );
}

export default Reportes;
