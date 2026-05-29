const { classifyContent } = require("../services/classifier");

const videos = [
    {
        title:
            "EL FIN DE LOS IMPERIOS EN LA GRAN GUERRA. Serie completa con Carlos Caballero Jurado",
        description: `Gracias a Carlos Caballero Jurado conoceremos el fin de los imperios en la Gran Guerra.`,
        tags: ["historiamilitar", "historia"],
    },

    {
        title:
            "GUERRA DEL PÁCIFICO: la Tragedia de la ARMADA IMPERIAL JAPONESA *José Manuel de la Rubia*",
        description: `  Segunda Guerra Mundial. Gracias a nuestro amigo y colaborador habitual en temas navales José Manuel de la Rubia, autor del #libro "La armada imperial japonesa" ** https://amzn.to/3qjTN7L ** , navegaremos por el Pácifico para conocer la tragedia de la Armada Imperial Japonesa.`,
        tags: ["historia",
            "historiamilitar",
            "ww2"
        ],
    },

    {
        title: "ERNEST BARKMANN Y SU PANTHER: Panteras en Normandía y las Ardenas *David Díaz Cabo*",
        description: `En este episodio especial exploramos la figura de Ernst Barkmann, uno de los más célebres tanquistas alemanes de la Segunda Guerra Mundial, al mando de un Panzer V Panther en la 2.ª SS-Panzer-Division "Das Reich". Junto al historiador David Díaz Cabo, autor del libro "Navidades en las Ardenas" ** https://amzn.to/3RJKTLk **, analizamos su trayectoria en el frente occidental, su participación en los duros combates en Normandía tras el Día D y su papel en la Ofensiva de las Ardenas.

🛡️ Se repasan sus supuestas hazañas, como el famoso episodio de "Barkmann's Corner", evaluando críticamente las fuentes, los partes de guerra y la influencia de la propaganda alemana.

📌 Temas principales del programa:

Biografía militar de Ernst Barkmann

El Panzer V Panther: características y rendimiento en combate

La 2.ª SS-Panzer-Division "Das Reich" en el Frente Occidental

Combates en Normandía: contraataques alemanes tras el desembarco

El papel de Barkmann en las Ardenas

Mito y realidad: análisis historiográfico de sus victorias

Un programa imprescindible para los apasionados de la historia militar rigurosa, sin mitificaciones ni revisionismos.

DESCUBRE A DAVID DIAZ CABO EN
https://ultimaratioregispublicaciones... y @diaz_writer en Twitter`,
        tags: ["historia", "historiamilitar", "SegundaGuerraMundial"],
    },

    {
        title: "VENEZUELA y UCRANIA: Los hilos del caso Plus Ultra y el ataque a Moscú | 𝐉𝐔𝐄𝐆𝐎𝐒 𝐃𝐄 𝐏𝐎𝐃𝐄𝐑 20/05/26",
        description: `CONFLICTO EN ORIENTE PROXIMO: ISRAEL EN GUERRA
💥En esta edición del programa JUEGOS DE PODER de ‪@acprincipadotv‬  analizamos dos focos de tensión que están marcando la agenda internacional. 

Por un lado, investigamos “la conexión venezolana”: los vínculos políticos, económicos y estratégicos que colocan a Venezuela en el centro de nuevas controversias regionales e internacionales. ¿Qué actores están involucrados y qué impacto puede tener en América Latina y el mundo?

Además, abordamos la escalada del conflicto entre Rusia y Ucrania tras un nuevo golpe ucraniano sobre Moscú. Revisamos las consecuencias militares, políticas y diplomáticas de un ataque que vuelve a encender las alarmas globales y aumenta la presión sobre el Kremlin.
Un programa de análisis, contexto y debate con especialistas e invitados para entender cómo estos acontecimientos pueden redefinir el escenario geopolítico actual.
`,
        tags: ["Geopolítica", "EstrechoDeOrmuz", "Ucrania", "EconomíaGlobal", "JuegosDePoder", "NoticiasInternacionales", "acprincipadotv"],
    },

    {
        title: "EL CIERRE DE ORMUZ:el arma geopolítica de Irán *LA GUERRA POR LOS ESTRECHOS HA COMENZADO*",
        description: `3,690 views  Streamed live on Apr 19, 2026  GEOPOLÍTICA
El Estrecho de Ormuz es uno de los puntos más críticos del planeta.
Por sus aguas transita cerca del 20% del petróleo mundial. Su cierre, total o parcial, no sería un incidente regional: sería un shock global inmediato.

Irán lleva décadas preparando esta carta estratégica.
Minado naval, misiles costeros, drones, lanchas rápidas… todo un arsenal diseñado para convertir Ormuz en un cuello de botella infranqueable en caso de conflicto.

Pero este no es solo un problema del Golfo Pérsico.
Es parte de una dinámica mayor: la guerra por el control de los estrechos marítimos del mundo.

-------------------------------------
LIBRO "UN MUNDO CONVULSO" ** https://amzn.to/4s6UrRc **
Firmado y dedicado en https://franciscogarciacampa.com/libros/
-------------------------------------

En este programa  Francisco García Campa analiza junto a Rafael Muñoz Abad:

🔴 Cómo Irán bloquea el Estrecho de Ormuz y durante cuánto tiempo.
🔴 La respuesta militar de Estados Unidos y sus aliados en la zona.
🔴 El impacto inmediato en los mercados energéticos y la economía mundial.
🔴 La importancia de otros chokepoints:

Suez
Bab el-Mandeb
Malaca
Gibraltar
Panamá

🔴 Por qué el control del mar y de los estrechos vuelve a ser el eje de la geopolítica global.

Un análisis imprescindible para entender cómo, en el siglo XXI,
una guerra puede decidirse en apenas unos kilómetros de mar.

🔴 SUSCRÍBETE y apoya a Bellumartis Historia Militar:
👉 Patreon:   / bellumartis  

👉 PayPal: https://www.paypal.me/bellumartis

👉 Bizum: 656 778 825

📣 Síguenos también en redes:
📸 Instagram:   / bellumartis  

🐦 Twitter / X:   / bellumartis  

Bellumartis Historia Militar — Porque entender el pasado es prepararse para el futuro.

#Ormuz #Irán #Geopolítica #Petróleo #GuerraNaval #Chokepoints #SeguridadEnergética #Bellumartis #estrategiamilitar 
00:00 – Introducción: La guerra por el control de los estrechos.
00:01:12 – Estrecho de Ormuz: Importancia para la economía mundial y los hidrocarburos.
00:10:11 – El concepto de "Estrecho Internacional" y el mensaje de miedo a los armadores.
00:14:09 – Leyes de Guerra vs. Leyes Civiles: Bloqueos navales y el caso de Cuba.
00:16:16 – El Tratado de París de 1856 y la obsolescencia del bloqueo naval tradicional.
00:23:43 – El mapa global de petroleros y el impacto de las sanciones.
00:29:52 – Estrecho de Malaca: Singapur y la zona de mayor densidad de tráfico del planeta.
00:40:50 – Profundización en el Estrecho de Ormuz: Regla 10 del RIPA (Reglamento de Abordajes).
00:43:23 – Bab el-Mandeb: El "talón de Aquiles" en el Mar Rojo y los ataques hutíes.
00:50:50 – Sistema de Estrechos Turcos (Dardanelos y Bósforo): El Tratado de Montreux y la soberanía de Turquía.
00:54:35 – Estrecho de Gibraltar: El papel de España, Marruecos y la problemática de la "Flota Fantasma" rusa.
01:07:07 – Canal de la Mancha (The English Channel): Tráfico intenso y operaciones de inteligencia naval.
01:12:48 – Estrechos Daneses (Kattegat y Skagerrak): La "Dark Fleet" rusa y la postura de Dinamarca.
01:18:21 – Canales artificiales: Suez, Panamá, Kiel y Corinto.
01:21:42 – Economía Marítima: Seguros de guerra (War Risk Insurance) y el desvío por el Cabo de Buena Esperanza.
01:36:12 – Preguntas de la audiencia: Banderas de conveniencia y defensa de buques nacionales`,
        tags: [],
    },

    {
        title: "INFANTERÍA DE MARINA: PRESENTE Y FUTURO del Puño de Hierro de la Armada en el Siglo XXI",
        description: `  BELLUMARTIS ACTUALIDAD MILITAR Y GEOPOLÍTICA
España cuenta con una herramienta de proyección estratégica inigualable: su Infantería de Marina.

Gracias a  Javier Sánchez García y Paco L. Guerrero, autores de "Infantería de Marina Española: El Presente y Futuro de una Unidad Histórica" ** https://amzn.to/4bMTfvl ** conoceremos:

El Legado de los Tercios: Cómo el ADN de la infantería española sobrevive en la era digital.

Capacidad de Proyección: El rol crítico del LHD Juan Carlos I y los medios de desembarco en la defensa del flanco sur de la OTAN.

Guerra Naval Especial: La élite silenciosa que protege nuestros valores allí donde el derecho internacional flaquea.

El Futuro: Los retos de la tecnificación, el apoyo aéreo y la necesidad de mantener una fuerza expedicionaria capaz de disuadir a cualquier tiranía.`,
        tags: ["InfanteriaDeMarina", "ArmadaEspañola", "España", "FuerzasArmadas", "ValientesPorTierraYPorMar", "MarcaEspaña", "Bellumartis", "HistoriaMilitar", "Geopolitica", "AnalisisMilitar", "CulturaDeDefensa", "DivulgacionHistorica"],
    },

    {
        title: "🛡️ ROMA NACE EN LA GUERRA: Las Primeras Victorias de la República ⚔️ Ángel Portillo",
        description: `Tras la caída de la monarquía y el juramento de Bruto junto al cuerpo de Lucrecia, Roma se enfrenta a su destino. El exilio de los Tarquinios no trajo la paz, sino la guerra. Etruscos, traidores, mercenarios… todos querían destruir a la joven República antes de que echara raíces.

En este episodio, Francisco García Campa y Ángel Portillo ** https://amzn.to/3SS2WzG ** te llevan a las primeras grandes batallas del nuevo régimen:
🏹 La Batalla del Bosque de Arsia
🏛️ El Asedio del monte Janículo por Lars Porsena
🩸 Los gestos heroicos de Bruto, Horacio Cocles, Scevola y Clelia

🔍 ¿Mito o historia?
🔥 ¿Verdades enterradas bajo siglos de propaganda?
🎖️ ¿Qué nos enseñan estas guerras sobre la mentalidad romana y su idea de virtus?

📚 Historia rigurosa, narrativa vibrante y análisis militar, en una colaboración entre Bellumartis y Ángel Portillo, dos voces que te traen la Antigüedad como nunca antes la habías visto.`,
        tags: ["historia", "Roma", "HistoriaMilitar"],
    },

    {
        title: "NOVOROSSIYSK EN LLAMAS: Ucrania golpea la Flota del Mar Negro y el petróleo ruso ¿HABLAMOS?",
        description: `Ucrania ha llevado la guerra directamente al corazón estratégico de Rusia. En la noche del 6 de abril de 2026, un ataque masivo con drones de largo alcance ha golpeado el puerto de Novorossiysk, base clave de la Flota del Mar Negro y uno de los principales centros de exportación de petróleo ruso.

LIBRO "UN MUNDO CONVULSO" ** https://amzn.to/4s6UrRc **
Firmado y dedicado en https://franciscogarciacampa.com/libros/

En este programa analizamos en profundidad:

El impacto sobre la fragata rusa Admiral Makarov, equipada con misiles Kalibr.
El ataque a la terminal petrolera de Sheskharis, vital para la economía energética rusa.
El golpe a la plataforma offshore Syvash y su uso militar.
El papel de los drones FP-1 y FP-2 en la nueva guerra tecnológica.
Las consecuencias estratégicas para la guerra en Ucrania y el equilibrio en el Mar Negro.

Este ataque confirma una tendencia clara: Ucrania ya no solo resiste, golpea en profundidad y amenaza la logística, la economía y la proyección naval de Rusia.

📊 Un análisis militar completo, con mapas, contexto estratégico y claves geopolíticas al estilo Bellumartis.

¿HABLAMOS?`,
        tags: ["Novorossiysk", "AtaqueUcrania", "DronesUcrania", "FP1", "FP2", "AdmiralMakarov", "FlotaMarNegro", "Sheskharis", "Syvash", "Holitsynske", "GuerraUcrania", "RusiaUcrania", "MarNegro", "DronesFP", "TerminalPetrolera", "Kalibr", "BoykoTowers", "Chornomornaftogaz", "UcraniaContraRusia", "OperacionNaval"],
    },

    {
        title: "MISILES ASESINOS DE BUQUES. Tipos de misiles y sistemas defensivos *Paco L. Guerrero*",
        description: `La guerra naval siempre tuvo la dificultad de alcanzar al enemigo más alla del horizonte, como ya vimos en el programa "Sistemas de Tiro Naval".  Gracias a Paco L. Guerrero, creador de Blognaval.es, conoceremos los misiles navales y como los barcos se defienden de estas armas que permiten destruir una gran navio desde la distancia sin necesidad de verlo.

Os invito a ver los programas “SISTEMAS DE TIRO NAVAL, del cañón al misil”    • SISTEMAS DE TIRO NAVAL, del cañón al misil...     “LA PIRATERÍA EN SOMALIA”    • LA PIRATERÍA MARITIMA: Somalia y la Operac...    con Federico Supervielle y “NAVIOS DE LINEA”    • NAVIOS DE LINEA, la Edad de Oro de los bar...    con Guillermo Nicieza.

Libros de Paco L. Guerrero 
"La Armada Española: El presente de una flota histórica" https://amzn.to/3vlthLm
“Corbetas Clase Descubierta: (1978-2021)” https://amzn.to/3tsPfvz

ESCUHAR NUESTRA UCRONIA "SUBMARINOS CLASE PERAL Y LA GUERRA DEL 98, así hubiera sido
" en nuestro canal de ivoox https://go.ivoox.com/rf/68377039-----... BELLUMARTIS PREMIUM ------------------------
Código descuento "BELLUMARTISHM" para acceder a todos los servcios de @elrinconmilitar407 en Enlace de suscripción: https://rinconmilitar.com/cuenta-de-m...`,
        tags: [],
    },

    {
        title: "CABALLO DE PEKÍN EL PLAN CHINO PARA ESPAÑA: ZAPATERO Y LA TRAMA DE CORRUPCIÓN INVISIBLE",
        description: `
370 views  May 26, 2026  BELLUMARTIS PODCAST
* VIDEO EN NUESTRO CANAL DE YOUTUBE ***
  https://youtube.com/live/-Q50jD6zZlk 
+++++ Hazte con nuestras camisetas en https://www.bhmshop.app +++++

Durante décadas, el ascenso de China se presentó como un éxito inevitable de crecimiento y modernización. Pero detrás de esa narrativa hay una realidad estratégica mucho más profunda: una guerra silenciosa de infiltración, influencia y control a largo plazo.

En este nuevo programa con Javier Benegas, autor de "La guerra Invisible" ** https://amzn.to/49iWrOW **, desmontamos cómo el Partido Comunista Chino ha convertido la economía, la tecnología, las infraestructuras críticas, los medios y los think tanks en armas de poder sin necesidad de disparar un solo tiro. Desde la dependencia económica hasta la creación del relato global, Pekín está desplazando lentamente el equilibrio de poder.

Analizamos también las grandes vulnerabilidades de China: su crisis demográfica, el colapso inmobiliario, la sobrecapacidad industrial y un sistema autoritario cada vez más frágil.`,
        tags: ["LaGuerraInvisible", "China", "Geopolitica", "JavierBenegas", "GuerraHibrida", "Bellumartis", "GuerraSilenciosa", "PartidoComunistaChino", "InfluenciaChina", "EstrategiaChina", "DesafioChina", "SuperpotenciaChina", "CrisisChina", "HistoriaMilitar", "ActualidadInternacional", "OrdenMundial"],
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
        video.tags
    );

    console.log(result);
}