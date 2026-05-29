const { classifyContent } = require("../services/classifier");

const videos = [
    {
        title:
            "AVIONES SOBRE LAS TRINCHERAS: la guerra aérea en la Primera Guerra Mundial",
        description: `La Primera Guerra Mundial vio nacer la guerra aérea y gracias a Daniel Ortega volaremos sobre las trinchera para concocer a los pioneros del aire y sus aviones.

LOS LIBROS DE DANIEL ORTEGA https://amzn.to/3motziG
MÁS INFO EN  http://www.danielortegaescritor.com`,
        tags: ["historiamilitar", "historia"],
    },

    {
        title:
            "BARÓN ROJO: Manfred Albrecht von Richthofen el as de ases en la Primera Guerra Mundial.",
        description: `BELLUMARTIS HISTORIA MILITAR analiza la trayectoria y los desafíos técnicos de este legendario piloto durante la Gran Guerra. El contenido examina el impacto de su legado, la evolución de las aeronaves utilizadas en combate y las particularidades del servicio aéreo bajo una perspectiva histórica y humana.`,
        tags: ["historia",
            "historiamilitar",
            "ww1"
        ],
    },

    {
        title: "LUCHA DE GIGANTES: La Guerra en el Mar durante la Primera Guerra Mundial | Con Roberto Muñoz Bolaños",
        description: `Nuevo programa de Bellumartis Historia Militar con Roberto Muñoz Bolaños, autor del libro “Lucha de Gigantes: Una historia naval de la Primera Guerra Mundial” 👉 https://amzn.to/4gSE2em

Durante la Gran Guerra, el control de los mares fue tan decisivo como las trincheras de Europa. Aunque eclipsada por los combates terrestres, la guerra naval definió el rumbo del conflicto y el destino de las grandes potencias.

En este programa exploramos:
⚓ Las causas y rivalidades navales que llevaron a la guerra.
🚢 Las grandes batallas del mar, desde Jutlandia hasta Galípoli.
🐺 Las campañas submarinas alemanas y la guerra sin restricciones.
🧭 El papel del bloqueo británico y su impacto económico en Alemania.
🌊 Cómo los buques de acero, los acorazados y los submarinos se convirtieron en los verdaderos titanes del conflicto.

Una visión global, estratégica y técnica de la Primera Guerra Mundial desde el eje naval: cuando el Atlántico, el Mediterráneo y el Báltico se convirtieron en los verdaderos campos de batalla de los imperios.

 BELLUMARTIS HISTORIA PODCAST`,
        tags: ["historia", "historiamilitar", "PrimeraGuerraMundial"],
    },

    {
        title: "LAS CAMPAÑAS DEL CÁUCASO Y PERSIA en la Primera Guerra Mundial ** Rubén Villamor*",
        description: `Cuando el Imperio Otomano entró en la primera Guerra Mundial a finales de 1914, la contienda europea se extendió a latitudes impensables como fueron las altas cumbres del Cáucaso o las milenarias tierras de Persia.
Gracias  a Rubén Villamor, autor de El Cáucaso y Persia en las Primera Guerra Mundial, 1914-1918`,
        tags: ["militar", "historia"],
    },

    {
        title: "LA GUERRA DEL REY: ALFONSO XIII y su labor humanitaria en la Gran Guerra *Zoran Petrovici",
        description: ` BELLUMARTIS HISTORIA PODCAST. En este programa hablamos con Zoran Petrovici, autor de La guerra del rey para rescatar una historia casi olvidada: el papel decisivo de Alfonso XIII como mediador humanitario durante la Primera Guerra Mundial.

Mientras Europa ardía entre trincheras, gases y ofensivas, España permanecía neutral. Y esa neutralidad permitió que Alfonso XIII impulsara uno de los mayores esfuerzos humanitarios de la época.

A través del trabajo de la Oficina de la Guerra Europea, instalada en el Palacio Real, el rey y su equipo:

– Buscaron a desaparecidos en todos los frentes
– Restablecieron contacto entre miles de familias separadas
– Intervinieron para mejorar las condiciones de prisioneros de guerra
– Gestionaron repatriaciones, canjes y protecciones diplomáticas
– Colaboraron con oficiales españoles desplegados por medio mundo
– Mediaron incluso ante emperadores y gobiernos beligerantes

Una historia de compasión en medio de la barbarie, de diplomacia en tiempos de destrucción y de un rey convertido, sin proponérselo, en uno de los mayores referentes humanitarios de la Gran Guerra.

Un programa imprescindible para comprender el papel de España en la Primera Guerra Mundial y la figura de Alfonso XIII en su dimensión más desconocida.`,
        tags: ["historia", "historiamilitar", "PrimeraGuerraMundial"],
    },

    {
        title: "Británicos y estadounidenses en el Periodo de Entreguerras, HISTORIA DEL CARRO DE COMBATE.",
        description: ` Gracias a Antonio Gómez y Félix Lancho conoceremos la evolución en estos tiempos de aparente paz entre las dos Guerras Mundiales. Veremos en este episodio los modelos británicos y estadounidenses.

"EL NACIMIENTO DEL CARRO DE COMBATE. Los tanques en la Primera Guerra Mundial"     • EL NACIMIENTO DEL CARRO DE COMBATE. Los ta...  
"La fiebre de las tanquetas, HISTORIA DEL CARRO DE COMBATE. El periodo de Entreguerras"    • La fiebre de las tanquetas, HISTORIA DEL C...  `,
        tags: ["historia ", "historiamilitar", "tanques", "armas"],
    },

    {
        title: "DOCTRINA MILITAR SOVIÉTICO-RUSA de Tukhachevsky a Gerasimov: teoría vs realidad *Juan Pastrana*",
        description: ` Guerra de Ucrania
Gracias a Juan Pastra, autor entre otros libros de "Tormenta Roja,1944" ** https://amzn.to/3B2AUIP **, conoceremos la evolución doctrinal y organizativa del Ejército Sovietico hasta el actual ruso analizando su papel en la #guerraenucrania .`,
        tags: [],
    },

    {
        title: "DEFENSORES DE LA MADRE PATRIA. Ucranianos Héroes de la Unión Soviética 1941-1945 #WWII * Periano*",
        description: ` Segunda Guerra Mundial
#SegundaGuerraMundial #WWII #URSS #HISTORIA
En toda guerra hay vencedores y vencidos, pero no todos los ganadores son iguales. El pueblo ruso participó y luchó como lo hicieron americano y británicos en la 2ª Guerra Mundial. 30 millones de rusos muertos entre combatientes y la población civil que murieron contra las fuerzas alemanas y japonesas son el sangriento tributo del pueblo ruso pagó para conseguir la paz en Europa.
Gracias a Jose A. Marquez Periano, autor del libro “Defensores de la Madre Patria” ** https://amzn.to/3tDxxVL conoceremos a los soldados de origen ucraniano que lograron el rango de Defensores de la Madre Patria merecedores de las máximas condecoraciones del Ejército Rojo. 
Os invito a ver nuestro programa sobre LOS LOBOS DE LA KRIEGSMARINE     • LOS LOBOS DE LA KRIEGSMARINE   y ESPADAS DE LAS WAFFEN SS    • ESPADAS DE LAS WAFFEN SS, Cruz de Caballer...   CABALLEROS DE LA MEDALLA DE HONOR    • CABALLEROS DE LA MEDALLA DE HONOR, héroes ...  
--------------------------------------------------------------------------
Si queréis apoyar a Bellumartis Historia Militar e invitarnos a un café o u una cerveza virtual por nuestro trabajo, podéis visitar nuestro PATREON   / bellumartis  
----------------------------------------------------------------------------
BIBLIOGRAFÍA DEL INVITADO 
“Héroes del Tercer Reich” Jose Antonio Marquez Periano https://amzn.to/3AJ1ioQ
“Espadas de las Waffen-SS2 https://amzn.to/3ySHSgQ  
“Lobos de la Kriegsmarine” https://amzn.to/3sxSMV6`,
        tags: ["SegundaGuerraMundial", "WWII", "URSS", "HISTORIA"],
    },

    {
        title: "EL DÍA MÁS LARGO: LO QUE NO SABÍAS DEL DESEMBARCO DE NORMANDÍA *Antonio J. Candil*",
        description: `Segunda Guerra Mundial
#historia #historiamilitar
En este programa especial, contamos con la presencia del Coronel retirado Antonio J. Candil, autor del #libro "Normandía" ** https://amzn.to/4iCENIh *, para analizar en profundidad el Desembarco de Normandía, el famoso "Día D". Exploramos las estrategias aliadas y alemanas, los desafíos de la invasión y su impacto en la Segunda Guerra Mundial.

⚔️ ¿Fue realmente el día más largo para ambos bandos?
📜 Descubre los detalles menos conocidos de esta operación militar crucial.`,
        tags: ["Normandía", "DíaD", "SegundaGuerraMundial", "HistoriaMilitar", "DesembarcoDeNormandía", "AntonioJCandil", "WWII", "BellumArtis", "EstrategiaMilitar", "Historia"],
    },

    {
        title: "El infierno blanco: Easy Company resiste en Bastogne. LA BATALLA DE LAS ARDENAS *DAVID DÍAZ CABO",
        description: ` Segunda Guerra Mundial
#historia #historiamilitar
En este episodio especial de Bellumartis Historia Militar, contamos con la presencia de David Díaz-Cabo, historiador militar y autor del libro "Navidades en las Ardenas" ** https://amzn.to/3RJKTLk **. Junto a él, analizamos en profundidad el papel de la Easy Company, unidad del 506.º Regimiento de Infantería Paracaidista, perteneciente a la mítica 101.ª División Aerotransportada de los Estados Unidos, durante el cerco de Bastogne.

Desde las posiciones heladas del bosque de Bois Jacques hasta el asalto final sobre la localidad de Foy, revisamos las condiciones de combate, el despliegue táctico, las decisiones de mando y la moral de los paracaidistas. Bajo el fuego constante de la artillería alemana, sin apoyo aéreo durante días, con uniformes inadecuados para el crudo invierno y escasos de suministros, los hombres de la Easy resistieron con firmeza el empuje enemigo.

Con el análisis preciso que caracteriza a este canal y el conocimiento de un especialista en la campaña de las Ardenas como David Díaz-Cabo, desmontamos mitos, revisamos fuentes y abordamos la historia militar desde el rigor documental. Una visión completa y sin concesiones sobre uno de los episodios más conocidos, pero también más distorsionados, de la Segunda Guerra Mundial.

DESCUBRE A DAVID DIAZ CABO EN
https://ultimaratioregispublicaciones... y @diaz_writer en Twitter

“Utah y Omaha: Una guía de viaje del Día D” https://amzn.to/3KULm8T
“Malvinas 1982: Crónica del conflicto del Atlántico Sur” https://amzn.to/3KU6Tyn
“Guía de la artillería de costa española 1900-2020” https://amzn.to/3ILW27P`,
        tags: ["historia", "historiamilitar"],
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