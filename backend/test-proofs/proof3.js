const { classifyContent } = require("../services/classifier");

const videos = [
    {
        title: "UCRANIA GOLPEA LA RETAGUARDIA: Objetivo Crimea -MALA TOKMACHKA RESISTE- *MAPA DE FRENTE DE BATALLA*",
        description: "En este vídeo de BELLUMARTIS ACTUALIDAD MILITAR Y GEOPOLÍTICA titulado UCRANIA GOLPEA LA RETAGUARDIA: Objetivo Crimea MALA TOKMACHKA RESISTE MAPA DE FRENTE DE BATALLA, se analiza en profundidad la evolución del conflicto en Ucrania, poniendo especial énfasis en las operaciones estratégicas dirigidas hacia la retaguardia y el objetivo de Crimea. A través de un detallado examen del mapa del frente de batalla, se explora la resistencia en puntos críticos como Mala Tokmachka y se desglosan los movimientos tácticos recientes, proporcionando una visión exhaustiva de la situación geopolítica y militar actual en la región.",
        tags: ["guerraenucrania"],
    },
    {
        title: "EL REGIMIENTO AZOV: Un nacionalismo ucraniano en guerra REALIDAD VS PROPAGANDA *Adrien Nonjon* |",
        description: `El 24 de febrero de 2022 Rusia invadió Ucrania con el pretexto oficial de desnazificar el país. En el centro de esa narrativa: el Regimiento Azov.

En este episodio, Adrien Nonjon, autor de El Regimiento I , realiza un análisis profundo, riguroso y sin dogmas de una de las unidades más polémicas y al mismo tiempo más decisivas del Ejército de Ucrania.

Desde su creación en 2014 tras la Revolución de Maidán, su evolución en el Donbás, hasta la heroica defensa de Mariúpol y la acería de Azovstal en 2022, donde resistieron más de 80 días bajo asedio ruso.

 ¿Qué hay de verdad y qué de propaganda en las acusaciones rusas de neonazismo?
 ¿Cómo ha cambiado Azov desde sus orígenes hasta su integración en las Fuerzas Armadas de Ucrania?
 ¿Ideología radical o defensa legítima del territorio?
 ¿Cuál será su papel en la Ucrania de posguerra?

Adrien Nonjon desmonta mitos, aporta contexto histórico y analiza con honestidad un tema delicado que Rusia ha convertido en arma de desinformación masiva.
Un episodio imprescindible para entender las complejidades del nacionalismo ucraniano en una guerra de agresión total.`,
        tags: ["guerraenucrania"],
    },
    {
        title: "VIAJAR CON EL EJÉRCITO ROMANO: marchas, campamentos y vida en campaña *David Soria Molina*",
        description: ` Roma Vincit
¿Cómo era realmente viajar con el ejército romano?

En este programa de Bellumartis Historia Militar, junto a David Soria ** https://amzn.to/4dtEzmU **, nos ponemos en marcha con las legiones para descubrir cómo se desplazaba el ejército más eficaz del mundo antiguo y cómo era la vida cotidiana durante las campañas militares de Roma.
----------------------------------------------------------------------
🎟️ Viajes por la Historia con GRUPEANDO
Código descuento: BELLUMARTIS26
👉 100 € si es tu primer viaje
👉 150 € si ya viajaste con Grupeando

🔗 Más información y reservas:
https://www.grupeandotour.com/es/viaj...
--------------------------------------------------------------------
Porque una legión no era solo una fuerza de combate. Era una auténtica máquina logística capaz de mover miles de hombres, animales, carros y suministros a través de enormes distancias, construyendo caminos, puentes y campamentos allí donde fuese necesario.

📌 En el programa analizamos:

Cómo marchaba una legión romana.
Cuántos kilómetros podía recorrer al día.
Qué llevaba cada soldado en campaña.
La organización de las columnas y convoyes.
La construcción diaria de campamentos (castra).
El papel de mulas, esclavos y auxiliares.
Alimentación, descanso y disciplina en marcha.
Cómo Roma convirtió la logística en un arma de guerra.

Desde las carreteras imperiales hasta las tiendas de campaña, descubriremos cómo era acompañar a una legión en campaña… y por qué la logística romana fue una de las claves de la expansión del Imperio.

Historia militar, vida cotidiana y estrategia en movimiento.`,
        tags: ["RomaAntigua", "LegionesRomanas", "HistoriaMilitar", "DavidSoria", "Bellumartis", "ImperioRomano", "LogisticaMilitar", "castra",
            "EjercitoRomano"],
    },

];

for (const video of videos) {
    console.log("=================================");
    console.log("TÍTULO:", video.title);
    console.log("DESCRIPCIÓN:", video.description);
    console.log("TAGS:", video.tags);

    const result = classifyContent(
        video.title,
        video.description,
        video.tags,
        { learn: true }
    );

    console.log(JSON.stringify(result, null, 2));
}