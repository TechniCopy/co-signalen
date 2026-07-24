// ─────────────────────────────────────────────────────────────────────────────
// MICROGAME: SPOT HET CO-GEVAAR (cluster 2.1, leerdoelen 1 en 2)
// Wat CO met het lichaam doet, en signalen van CO-gevaar herkennen:
// bij de installatie, bij bewoners en bij jezelf.
//
// Missie 1  Wat CO met je doet
//   R1  De verraderlijke binding → bloedbaan-animatie + symptomen sorteren
//   R2  Concentratie maal tijd   → scenariokaarten naar het verwachte gevolg
// Missie 2  De woninginspectie
//   R3  Zoek de signalen         → zoekplaat: klik de CO-signalen aan
//   R4  Welke woning eerst?      → situaties rangschikken op risico
//   R5  Let op jezelf (kaal)     → scenario's: de juiste actie kiezen
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import { Flame, Search, AlertTriangle, CheckCircle, HeartPulse } from "lucide-react";
import {
  C, useGameJuice, DragProvider, Draggable, DropTarget, ProgressBar,
  GameButton, FeedbackPopup, IntroScreen, MCControle, EndScreen, StepBanner,
  RondeIntro, UitlegItem, UitlegStrook,
} from "./shared.jsx";

// Maximale score, opgebouwd uit:
// R1 symptomen sorteren 6×5=30 · R2 scenariokaarten 6×5=30
// R3 signalen zoeken 5×5=25 · R4 rangschikken 2 sets ×3×5=30 · R5 scenario's 3×5=15
// 5 MC-controles ×10=50
const MAX_SCORE = 180;

// ─── APP-KOPPELING (postMessage-contract voor de lesstof-app) ───

const GAME_ID = "co-signalen";

function meldVoortgang(payload) {
  if (window.parent !== window) {
    window.parent.postMessage(
      { type: "microgame:progress", game: GAME_ID, ...payload },
      "*",
    );
  }
}

// ─── MC-VRAGENPOOLS ───
// Basis: de examenvragen van leerdoelen 1 en 2 uit de dataset (cluster 2.1),
// aangevuld met een eigen variant.

const POOL_R1 = [
  {
    // dataset leerdoel 1, vraag 1
    question: "Waarom is het inademen van koolmonoxide zo gevaarlijk voor het menselijk lichaam?",
    options: [
      "CO prikkelt de slijmvliezen van de luchtwegen, waardoor deze opzwellen en de ademhaling geleidelijk wordt geblokkeerd.",
      "CO bindt zich ruim tweehonderd keer sterker aan hemoglobine dan zuurstof, waardoor het bloed te weinig zuurstof kan vervoeren.",
      "CO verdringt de koolstofdioxide in de longen, waardoor de natuurlijke ademprikkel wegvalt en de ademhaling stilvalt.",
    ],
    correct: 1,
    feedbackCorrect: "GOED! CO bezet de plekken op de hemoglobine waar normaal zuurstof reist. Het bloed vervoert dan te weinig zuurstof en organen komen zuurstof tekort.",
    feedbackWrong: "CO doet niets met slijmvliezen of ademprikkel: het bindt ruim tweehonderd keer sterker aan hemoglobine dan zuurstof, waardoor het zuurstoftransport vastloopt.",
    hint: "Denk aan de bloedbaan die je net zag: wat gebeurde er met de plekken op de hemoglobine?",
    bron: "Kleintje Gas, §3.1.4 (symptomen bij CO in de ruimte, bron RIVM)",
    les: "CO bindt ruim tweehonderd keer sterker aan hemoglobine dan zuurstof",
  },
  {
    // dataset leerdoel 1, vraag 2
    question: "Stelling: koolmonoxide is voor mensen herkenbaar aan een scherpe, prikkelende geur. Is deze stelling waar of niet waar?",
    options: ["Waar", "Niet waar"],
    correct: 1,
    feedbackCorrect: "GOED! CO is geur-, kleur- en smaakloos. Mensen kunnen het niet waarnemen; juist dat maakt het gas zo verraderlijk.",
    feedbackWrong: "CO is geur-, kleur- en smaakloos: je ruikt, ziet en proeft er niets van. Daarom is een CO-melder zo belangrijk.",
    hint: "Kun jij CO ruiken, zien of proeven?",
    bron: "Kleintje Gas, §3.1.4 (CO is geur-, kleur- en smaakloos)",
    les: "CO is geur-, kleur- en smaakloos: niet waarneembaar voor mensen",
  },
  {
    // dataset leerdoel 1, vraag 4
    question: "Waarom wordt een beginnende koolmonoxidevergiftiging bij bewoners vaak niet herkend?",
    options: [
      "Omdat CO-vergiftiging alleen optreedt tijdens de slaap en dan geen klachten geeft.",
      "Omdat de eerste klachten pas na enkele weken blootstelling ontstaan.",
      "Omdat de symptomen, zoals hoofdpijn, misselijkheid en vermoeidheid, op een griepje lijken.",
    ],
    correct: 2,
    feedbackCorrect: "GOED! De vroege symptomen lijken op een griepje. Daardoor denkt bijna niemand aan CO.",
    feedbackWrong: "De eerste symptomen (hoofdpijn, misselijkheid, vermoeidheid) lijken op een griepje: daardoor wordt de vergiftiging vaak niet herkend.",
    hint: "Denk aan de sorteeropdracht: waar leken de vroege signalen op?",
    bron: "Kleintje Gas, §3.1.4 (symptomen bij CO in de ruimte)",
    les: "Vroege CO-symptomen lijken op griep en worden daardoor vaak gemist",
  },
  {
    // dataset leerdoel 1, vraag 6
    question: "Welke organen lopen bij een koolmonoxidevergiftiging als eerste schade op door het zuurstoftekort?",
    options: [
      "De longen en luchtwegen, omdat het gas daar het lichaam binnenkomt.",
      "De hersenen en het hart, omdat die organen het meest gevoelig zijn voor zuurstofgebrek.",
      "De lever en de nieren, omdat die het gif uit het bloed moeten filteren.",
    ],
    correct: 1,
    feedbackCorrect: "GOED! Hersenen en hart verbruiken veel zuurstof en zijn het meest gevoelig voor zuurstofgebrek.",
    feedbackWrong: "CO beschadigt niet de luchtwegen: het probleem is zuurstoftekort, en daar zijn hersenen en hart het gevoeligst voor.",
    hint: "Welke organen kunnen het slechtst tegen zuurstofgebrek?",
    bron: "Kleintje Gas, §3.1.4 (organen krijgen zuurstofgebrek)",
    les: "Hersenen en hart lopen bij CO-vergiftiging als eerste schade op",
  },
  {
    // dataset leerdoel 1, vraag 8
    question: "Stelling: in Nederland overlijden jaarlijks aantoonbaar ongeveer tien mensen aan koolmonoxidevergiftiging en het werkelijke aantal slachtoffers ligt waarschijnlijk hoger. Is deze stelling waar of niet waar?",
    options: ["Waar", "Niet waar"],
    correct: 0,
    feedbackCorrect: "GOED! Ongeveer tien aantoonbare sterfgevallen per jaar, een veelvoud belandt in het ziekenhuis, en het werkelijke aantal ligt waarschijnlijk hoger omdat CO-vergiftiging vaak niet wordt herkend.",
    feedbackWrong: "De stelling klopt: ongeveer tien aantoonbare sterfgevallen per jaar, en het werkelijke aantal ligt waarschijnlijk hoger.",
    hint: "CO-vergiftiging wordt vaak niet herkend. Wat betekent dat voor de cijfers?",
    bron: "Kleintje Gas, §3.1.4 (aantal slachtoffers CO-vergiftiging in Nederland)",
    les: "Jaarlijks ongeveer tien aantoonbare CO-doden; het werkelijke aantal ligt hoger",
  },
  {
    // dataset leerdoel 1, vraag 9
    question: "Een slachtoffer van een ernstige CO-vergiftiging wordt gered en ademt weer zelfstandig. Welk blijvend gevolg kan de vergiftiging toch hebben?",
    options: [
      "Blijvende hersenschade door het langdurige zuurstoftekort tijdens de vergiftiging.",
      "Geen enkel blijvend gevolg; in de frisse buitenlucht herstelt het lichaam altijd volledig.",
      "Blijvend verlies van reuk en smaak, doordat CO de zintuigcellen aantast.",
    ],
    correct: 0,
    feedbackCorrect: "GOED! Het zuurstoftekort kan de hersenen blijvend beschadigen, ook als het slachtoffer de vergiftiging overleeft.",
    feedbackWrong: "Redding betekent niet automatisch volledig herstel: het zuurstoftekort kan blijvende hersenschade geven.",
    hint: "Welk orgaan is het meest gevoelig voor zuurstofgebrek, en herstelt dat altijd?",
    bron: "Kleintje Gas, §3.1.4 (ernstige symptomen: coma, blijvende hersenschade, overlijden)",
    les: "Ernstige CO-vergiftiging kan blijvende hersenschade geven",
  },
];

const POOL_R2 = [
  {
    // dataset leerdoel 1, vraag 3
    question: "Welke twee factoren bepalen samen hoe ernstig de gevolgen van een blootstelling aan koolmonoxide zijn?",
    options: [
      "De CO-concentratie in de lucht en de duur van de blootstelling.",
      "De luchtvochtigheid in de ruimte en de lichaamslengte van het slachtoffer.",
      "De temperatuur van de rookgassen en het CO2-percentage in de ruimte.",
    ],
    correct: 0,
    feedbackCorrect: "GOED! Concentratie maal tijdsduur bepaalt de ernst. Kort in een hoge concentratie is net zo gevaarlijk als lang in een lagere.",
    feedbackWrong: "Het draait om de combinatie van concentratie en blootstellingsduur, precies zoals in de sleepronde.",
    hint: "Denk aan de kaarten die je net sorteerde: wat stond er op elke kaart?",
    bron: "Kleintje Gas, §3.1.4 (tabel concentratie CO gerelateerd aan tijdsduur)",
    les: "Concentratie en blootstellingsduur bepalen samen de ernst",
  },
  {
    // dataset leerdoel 1, vraag 5
    question: "Een bewoner is korte tijd blootgesteld aan een zeer hoge concentratie koolmonoxide. Wat is het te verwachten gevolg?",
    options: [
      "Bewusteloosheid en mogelijk overlijden, al binnen enkele minuten tot een half uur.",
      "Alleen langdurige hoofdpijn; levensgevaar ontstaat pas na dagen blootstelling.",
      "Huidirritatie en tranende ogen, die verdwijnen zodra de bewoner buiten is.",
    ],
    correct: 0,
    feedbackCorrect: "GOED! Duizenden ppm zijn al binnen minuten tot een half uur fataal: 3.200 ppm binnen 30 minuten, 12.800 ppm binnen 1 tot 3 minuten.",
    feedbackWrong: "Bij zeer hoge concentraties gaat het razendsnel: bewusteloosheid en overlijden binnen minuten tot een half uur.",
    hint: "Kort en hoog: wat zag je daarover in de tabel?",
    bron: "Kleintje Gas, §3.1.4 (tabel: 3.200 ppm fataal binnen 30 min, 12.800 ppm binnen 1-3 min)",
    les: "Zeer hoge concentraties zijn binnen minuten tot een half uur fataal",
  },
  {
    // dataset leerdoel 1, vraag 7
    question: "Een bewoner verblijft ongeveer twee uur in een ruimte met circa 120 ppm koolmonoxide. Welke verschijnselen zijn volgens de concentratie/tijdsduur-tabel te verwachten?",
    options: [
      "Vrijwel directe bewusteloosheid; deze concentratie is binnen enkele minuten fataal.",
      "Geen verschijnselen; klachten treden pas op bij concentraties boven de 1.000 ppm.",
      "Hoofdpijn, snelle vermoeidheid, geïrriteerdheid en mogelijk duizeligheid en een verstoord beoordelingsvermogen.",
    ],
    correct: 2,
    feedbackCorrect: "GOED! Rond 70 tot 120 ppm geven na enige tijd hoofdpijn, vermoeidheid en duizeligheid. Geen acuut levensgevaar, wel een duidelijk signaal.",
    feedbackWrong: "120 ppm hoort bij de laagste rij van de tabel: na enige tijd hoofdpijn, vermoeidheid en mogelijk duizeligheid.",
    hint: "120 ppm zit in de laagste rij van de tabel. Wat hoort daarbij?",
    bron: "Kleintje Gas, §3.1.4 (tabel concentratie CO gerelateerd aan tijdsduur)",
    les: "Rond 70 tot 120 ppm: na enige tijd hoofdpijn en vermoeidheid",
  },
  {
    // dataset leerdoel 1, vraag 10
    question: "Waarom lukt het slachtoffers bij oplopende CO-concentraties vaak niet meer om zelf de woning te verlaten?",
    options: [
      "CO hoopt zich op bij de vloer, waardoor vluchten door de laaghangende gaslaag onmogelijk wordt.",
      "Door het zuurstofgebrek raken zij verward en kunnen zij bij inspanning in elkaar zakken of flauwvallen.",
      "CO verlamt direct na inademing de beenspieren, waardoor lopen meteen onmogelijk is.",
    ],
    correct: 1,
    feedbackCorrect: "GOED! Zuurstofgebrek maakt verward, en juist bij inspanning (opstaan, lopen) zakken slachtoffers in elkaar of vallen ze flauw.",
    feedbackWrong: "CO verlamt niets en hangt niet laag: het zuurstofgebrek maakt verward en bij inspanning zakken slachtoffers in elkaar.",
    hint: "Wat doet zuurstofgebrek met je hoofd en met je lichaam zodra je in beweging komt?",
    bron: "Kleintje Gas, §3.1.4 (tabel: verwarring, ineenstorting, flauwvallen bij inspanning)",
    les: "Zuurstofgebrek maakt verward; bij inspanning zakken slachtoffers in elkaar",
  },
];

const POOL_R3 = [
  {
    // dataset leerdoel 2, vraag 3
    question: "Bij een onderhoudsbeurt zie je dat de vlam van het gastoestel geel-oranje brandt in plaats van blauw. Wat betekent dit?",
    options: [
      "Het toestel brandt op een verkeerde gassoort; de branderdruk staat te hoog.",
      "Dit is normaal bij deellast; alleen bij vollast hoort de vlam blauw te zijn.",
      "Er is een tekort aan zuurstof: de verbranding is onvolledig en er kan CO ontstaan.",
    ],
    correct: 2,
    feedbackCorrect: "GOED! Een gezonde vlam is blauw. Geel-oranje wijst op zuurstoftekort en dus onvolledige verbranding: daarbij kan CO ontstaan.",
    feedbackWrong: "Een geel-oranje vlam heeft niets met deellast of gassoort te maken: het is een teken van zuurstoftekort en onvolledige verbranding.",
    hint: "Welke kleur hoort een gezonde gasvlam te hebben, en wat zegt een afwijkende kleur over de zuurstof?",
    bron: "Kleintje Gas, §3.1.4 (voorkomen van CO-vergiftiging, vlambeeld) en §2.2",
    les: "Een geel-oranje vlam wijst op zuurstoftekort en onvolledige verbranding",
  },
  {
    // dataset leerdoel 2, vraag 5
    question: "Welke waarneming in een woonkamer met een gashaard is voor jou een signaal dat de afvoer van verbrandingsgassen mogelijk tekortschiet?",
    options: [
      "Een droge, warme lucht in de ruimte zodra de haard brandt.",
      "Beslagen ramen en vochtplekken op de wanden, samen met een muffe lucht.",
      "Een zacht zoemend geluid van de toestelventilator zodra de haard aanslaat.",
    ],
    correct: 1,
    feedbackCorrect: "GOED! Condens op ramen en muren en een bedompte, muffe lucht kunnen erop wijzen dat verbrandingsgassen de ruimte in komen.",
    feedbackWrong: "Droge lucht en een zoemende ventilator zijn normaal. Let juist op vocht: condens, natte plekken en een muffe lucht.",
    hint: "Verbrandingsgassen bevatten veel waterdamp. Wat zie je daarvan terug in de ruimte?",
    bron: "Kleintje Gas, §3.1.4 (condens op vensters/muren, bedompte lucht)",
    les: "Condens op ramen en muren en muffe lucht kunnen wijzen op een tekortschietende afvoer",
  },
  {
    // dataset leerdoel 2, vraag 7
    question: "Bij een onderhoudsbeurt zie je roetaanslag en corrosiesporen op en rond de mantel van een gastoestel. Hoe beoordeel je dit?",
    options: [
      "Dit wijst op een slechte staat van het toestel en vaak op een slechte verbranding; nader onderzoek is nodig.",
      "Dit is normale vervuiling door stof uit de opstellingsruimte en zegt niets over de verbranding.",
      "Dit wijst op een te sterke trek in de rookgasafvoer, waardoor de vlam te veel wordt gekoeld.",
    ],
    correct: 0,
    feedbackCorrect: "GOED! Roet, roest en corrosie op of rond het toestel wijzen op een slechte staat en vaak op een slechte verbranding: nader onderzoek is nodig.",
    feedbackWrong: "Roet en corrosie zijn geen gewoon stof: ze wijzen op een slechte staat van het toestel en vaak op een slechte verbranding.",
    hint: "Waar komt roet eigenlijk vandaan?",
    bron: "Kleintje Gas, §3.1.4 (sporen van corrosie, roest of roet op het toestel)",
    les: "Roet, roest en corrosie op het toestel vragen om nader onderzoek",
  },
  {
    // dataset leerdoel 2, vraag 10
    question: "Bij onderhoud aan een Proline NxT cv-toestel meet je in het rookgas een CO-waarde ruim boven de door de fabrikant genoemde grens van 250 ppm. Welke oorzaak noemt het fabrikantvoorschrift hiervoor?",
    options: [
      "Vervuiling of storing van de brander, of recirculatie van rookgassen.",
      "Een te hoge waterdruk in het cv-circuit, waardoor de warmtewisselaar te snel afkoelt.",
      "Een versleten cv-pomp, waardoor de doorstroming van het cv-water te laag is.",
    ],
    correct: 0,
    feedbackCorrect: "GOED! Een te hoge CO-waarde in het rookgas komt volgens de fabrikant door vervuiling van de brander, een storing van de brander of recirculatie van rookgassen.",
    feedbackWrong: "Waterdruk en cv-pomp hebben niets met de verbranding te maken: de oorzaak zit bij de brander (vervuiling of storing) of bij recirculatie van rookgassen.",
    hint: "CO ontstaat bij de verbranding. Welke onderdelen en processen horen daarbij?",
    bron: "Proline NxT installatievoorschrift, h.10 (Inspectie en onderhoud)",
    les: "Te hoge CO in het rookgas: brander vervuild of gestoord, of recirculatie van rookgassen",
  },
];

const POOL_R4 = [
  {
    // dataset leerdoel 2, vraag 2
    question: "In welke situatie is het risico op een verhoogde CO-concentratie in de woning het grootst?",
    options: [
      "Een open geiser met trekonderbreker in een keuken waarvan de ventilatieroosters na na-isolatie zijn dichtgezet.",
      "Een gesloten HR-toestel (type C) met concentrische luchttoevoer en rookgasafvoer via het dak.",
      "Een elektrische boiler in een kleine, afgesloten berging waarvan het ventilatierooster is dichtgezet.",
    ],
    correct: 0,
    feedbackCorrect: "GOED! Een open toestel haalt zijn verbrandingslucht uit de ruimte zelf. Dichtgezette roosters in een luchtdicht geïsoleerde woning maken dit de gevaarlijkste combinatie.",
    feedbackWrong: "Een gesloten toestel haalt lucht van buiten en een elektrische boiler verbrandt niets. Het open toestel met dichte roosters is het grootste risico.",
    hint: "Welk toestel is voor zijn verbrandingslucht afhankelijk van de ruimte waarin het hangt?",
    bron: "Kleintje Gas, §2.4.2 en §3.1.4 (open toestellen en luchtdichte woningen)",
    les: "Open toestel plus dichtgezette roosters is de gevaarlijkste combinatie",
  },
  {
    // dataset leerdoel 2, vraag 4
    question: "Stelling: in gestapelde bouw (appartementen) kan de koolmonoxide in een woning ook afkomstig zijn uit een omliggende woning. Is deze stelling waar of niet waar?",
    options: ["Waar", "Niet waar"],
    correct: 0,
    feedbackCorrect: "GOED! Via schachten, kanalen of een gemeenschappelijke rookgasafvoer kan CO uit een buurwoning binnendringen.",
    feedbackWrong: "De stelling klopt: in gestapelde bouw kan CO via schachten, kanalen of een gemeenschappelijke afvoer uit een omliggende woning komen.",
    hint: "Wat delen appartementen vaak met elkaar aan kanalen en schachten?",
    bron: "Kleintje Gas, §3.1.4 (aandachtspunten) en §8.6.5",
    les: "In gestapelde bouw kan CO uit een omliggende woning komen",
  },
  {
    // dataset leerdoel 2, vraag 6
    question: "In een keuken hangt een open geiser met trekonderbreker (type B). Tijdens het koken draait de motorafzuigkap op de hoogste stand. Welk risico ontstaat?",
    options: [
      "De afzuigkap zorgt voor extra luchtverversing en verlaagt daarmee juist het CO-risico in de keuken.",
      "Er ontstaat onderdruk in de keuken, waardoor rookgassen via de trekonderbreker de ruimte in kunnen worden getrokken.",
      "De afzuigkap kan de waakvlam uitblazen, waardoor onverbrand gas het belangrijkste gevaar wordt.",
    ],
    correct: 1,
    feedbackCorrect: "GOED! De afzuigkap zet de keuken op onderdruk. Daardoor kunnen rookgassen via de trekonderbreker de ruimte in worden getrokken.",
    feedbackWrong: "De afzuigkap ververst niet, hij zuigt af: er ontstaat onderdruk en die trekt rookgassen via de trekonderbreker de keuken in.",
    hint: "Wat doet een afzuigkap met de druk in de keuken, en wat betekent dat voor de trekonderbreker?",
    bron: "Kleintje Gas, §2.4.2 en §3.1.4 (onderdruk in de woning bij open toestellen)",
    les: "Onderdruk door een afzuigkap trekt rookgassen via de trekonderbreker naar binnen",
  },
  {
    // dataset leerdoel 2, vraag 9
    question: "In een appartement met mechanische afzuiging en een open keukengeiser blijkt de ventilatiebox defect. De geiser brandt verder normaal. Waarom is dit toch een risicosituatie?",
    options: [
      "Zonder werkende ventilatie schieten de luchttoevoer en de afvoer tekort, waardoor CO zich in de woning kan ophopen.",
      "Er is geen risico: de geiser haalt zijn verbrandingslucht via de trekonderbreker rechtstreeks van buiten.",
      "Alleen het comfort neemt af door vocht en kookluchtjes; voor de veiligheid van de geiser maakt het niets uit.",
    ],
    correct: 0,
    feedbackCorrect: "GOED! De ventilatie is onderdeel van de luchthuishouding van de woning. Valt die uit, dan schieten luchttoevoer en afvoer tekort en kan CO zich ophopen.",
    feedbackWrong: "De trekonderbreker haalt geen lucht van buiten. Zonder werkende ventilatie schiet de luchthuishouding tekort en kan CO zich ophopen.",
    hint: "Waar haalt een open geiser zijn verbrandingslucht vandaan, en wie zorgt voor verse lucht?",
    bron: "Kleintje Gas, §2.4.2 en §3.1.4 (uitval ventilatie bij open toestellen)",
    les: "Uitval van mechanische ventilatie is bij open toestellen een risicosituatie",
  },
];

const POOL_R5 = [
  {
    // dataset leerdoel 2, vraag 1
    question: "Tijdens onderhoud in een kleine opstellingsruimte krijgt de monteur hoofdpijn en wordt hij duizelig. Buiten verdwijnen de klachten snel. Wat is de juiste conclusie?",
    options: [
      "De klachten komen waarschijnlijk door het bukken bij de ketel; hij kan gewoon doorwerken.",
      "Dit kan wijzen op een verhoogde CO-concentratie; hij moet de ruimte verlaten en eerst het CO-gehalte meten.",
      "Dit wijst op een te hoog CO2-gehalte; even een raam openzetten is voldoende om door te werken.",
    ],
    correct: 1,
    feedbackCorrect: "GOED! Klachten die binnen opkomen en buiten verdwijnen zijn een klassiek CO-signaal: ruimte verlaten en eerst meten.",
    feedbackWrong: "Doorwerken of een raam openzetten is niet genoeg: dit patroon past bij CO. Eerst naar buiten, dan meten.",
    hint: "De klachten verdwijnen buiten. Wat zegt dat over de lucht binnen?",
    bron: "Kleintje Gas, §3.1.4 (betreden van een ruimte waar CO aanwezig is)",
    les: "Eigen klachten die buiten verdwijnen: ruimte verlaten en eerst meten",
  },
  {
    // dataset leerdoel 2, vraag 8
    question: "Een bewoner vertelt dat het hele gezin in het stookseizoen vaak hoofdpijn- en vermoeidheidsklachten heeft, maar tijdens vakanties nergens last van heeft. Wat is de juiste reactie?",
    options: [
      "Je adviseert het gezin een huisarts te bezoeken; voor de installatie heeft deze klacht geen betekenis.",
      "Je stelt het gezin gerust: hoofdpijn in de winter komt meestal door de droge lucht van de verwarming.",
      "Je ziet dit als mogelijk signaal van CO in de woning en meet het CO-gehalte.",
    ],
    correct: 2,
    feedbackCorrect: "GOED! Klachten bij het hele gezin die buitenshuis verdwijnen zijn voor jou als monteur een signaal om het CO-gehalte te meten.",
    feedbackWrong: "Geruststellen of alleen doorverwijzen is hier niet genoeg: dit patroon is een CO-signaal en dat controleer je met een meting.",
    hint: "In het stookseizoen wel klachten, op vakantie niet. Wat draait er in het stookseizoen?",
    bron: "Kleintje Gas, §3.1.4 (klachten waar bewoners in de buitenlucht geen last van hebben)",
    les: "Klachten van bewoners die buitenshuis verdwijnen zijn een meetsignaal",
  },
  {
    // eigen vraag over de persoonlijke CO-melder
    question: "Je draagt tijdens het werk een persoonlijke CO-melder op borsthoogte. Waarom juist daar?",
    options: [
      "Omdat de melder daar het minst snel beschadigt tijdens het werk.",
      "Omdat de melder daar de lucht bewaakt die jij inademt, waar je ook bent in de woning.",
      "Omdat CO zwaarder is dan lucht en naar borsthoogte zakt.",
    ],
    correct: 1,
    feedbackCorrect: "GOED! Op borsthoogte zit de melder in jouw ademzone: hij meet de lucht die jij daadwerkelijk inademt, bij elke klus opnieuw.",
    feedbackWrong: "Het gaat niet om beschadiging of om het gewicht van CO: op borsthoogte bewaakt de melder jouw ademzone.",
    hint: "Wat wil je dat de melder bewaakt: het toestel of jouw lucht?",
    bron: "Kleintje Gas, §3.1.4 (persoonlijke CO-melder bij betreden van een ruimte)",
    les: "De persoonlijke CO-melder draag je op borsthoogte, in je ademzone",
  },
];

// ─── SVG: BLOEDBAAN MET HEMOGLOBINE (missie 1, ronde 1) ───

function BloedbaanSVG({ coCount }) {
  // 4 bindingsplekken op de rode bloedcel; coCount plekken zijn bezet door CO
  const plekken = [
    { x: 118, y: 82 },
    { x: 172, y: 70 },
    { x: 150, y: 128 },
    { x: 202, y: 116 },
  ];
  return (
    <svg viewBox="0 0 320 200" width="100%" style={{ maxWidth: 360 }} role="img"
      aria-label={`Bloedbaan: ${coCount} van de 4 bindingsplekken bezet door CO`}>
      {/* bloedvat */}
      <rect x="4" y="24" width="312" height="152" rx="52" fill="#F6D7D2" stroke={C.brownText} strokeWidth="2.5" />
      <rect x="16" y="36" width="288" height="128" rx="42" fill="#F9E4E0" />
      {/* stromingslijnen */}
      <path d="M 30 56 h 40 M 250 148 h 40" stroke="#E3B3AB" strokeWidth="3" strokeLinecap="round" strokeDasharray="8 8"
        style={{ animation: "flowDash 1.6s linear infinite" }} />
      {/* rode bloedcel */}
      <ellipse cx="160" cy="100" rx="86" ry="54" fill="#D96A5B" stroke={C.brownText} strokeWidth="2.5" />
      <ellipse cx="160" cy="100" rx="56" ry="30" fill="#C8574A" />
      {/* bindingsplekken */}
      {plekken.map((p, i) => {
        const bezet = i < coCount;
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="17" fill={bezet ? "#5A5A58" : "#7FB3D6"} stroke={C.brownText} strokeWidth="2" />
            <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="10.5" fontWeight="800" fill="white">
              {bezet ? "CO" : "O2"}
            </text>
          </g>
        );
      })}
      {/* vrij zwevende CO-deeltjes die eraan komen */}
      {coCount < 4 && (
        <g style={{ animation: "pulseGlow 1.4s ease-in-out infinite" }}>
          <circle cx="52" cy="140" r="13" fill="#5A5A58" stroke={C.brownText} strokeWidth="1.5" />
          <text x="52" y="144" textAnchor="middle" fontSize="9" fontWeight="800" fill="white">CO</text>
        </g>
      )}
    </svg>
  );
}

// ─── RONDE 1: DE VERRADERLIJKE BINDING ───

const R1_TEKSTEN = [
  "Dit is je bloedbaan. Zuurstof (O2) reist mee op hemoglobine, de zuurstofdrager in je bloed. Adem je CO in, dan gaat het mis. Druk op de knop.",
  "CO bindt zich ruim tweehonderd keer sterker aan hemoglobine dan zuurstof. De zuurstof wordt verdrongen: die plek is bezet.",
  "Elke bezette plek vervoert geen zuurstof meer. Het bloed stroomt gewoon door, maar levert steeds minder af.",
  "Je organen krijgen zuurstofgebrek: de hersenen en het hart als eerste. En dit gebeurt zonder dat je iets ruikt, ziet of proeft.",
];

const R1_SYMPTOMEN = [
  { id: "hoofdpijn", label: "Hoofdpijn", cat: "vroeg" },
  { id: "misselijk", label: "Misselijkheid", cat: "vroeg" },
  { id: "moe", label: "Vermoeidheid", cat: "vroeg" },
  { id: "bewusteloos", label: "Bewusteloosheid", cat: "laat" },
  { id: "coma", label: "Coma", cat: "laat" },
  { id: "inzakken", label: "In elkaar zakken bij inspanning", cat: "laat" },
];

const R1_BAKKEN = [
  { id: "vroeg", titel: "Vroege signalen", sub: "lijkt op een griepje", kleur: C.amber, licht: C.amberLight },
  { id: "laat", titel: "Late signalen", sub: "levensgevaar", kleur: C.red, licht: C.redLight },
];

function RondeBinding({ addScore, onDone }) {
  const [fase, setFase] = useState("uitleg"); // uitleg | bloed | sorteer
  const [coCount, setCoCount] = useState(0);
  const [geplaatst, setGeplaatst] = useState({ vroeg: [], laat: [] });
  const [hint, setHint] = useState(null);
  const [laatste, setLaatste] = useState(null);
  const [popup, setPopup] = useState(false);

  const over = R1_SYMPTOMEN.filter(
    (s) => !geplaatst.vroeg.includes(s.id) && !geplaatst.laat.includes(s.id)
  );

  const drop = (bakId) => (payload) => {
    const kaart = R1_SYMPTOMEN.find((s) => s.id === payload);
    if (!kaart || !over.some((s) => s.id === payload)) return undefined;
    if (kaart.cat === bakId) {
      addScore(5);
      setHint(null);
      setLaatste(kaart.cat === "vroeg"
        ? `${kaart.label}: een vroeg signaal. Net een griepje, en juist daardoor wordt CO vaak gemist.`
        : `${kaart.label}: een laat signaal. Nu is het levensgevaarlijk.`);
      const nieuw = { ...geplaatst, [bakId]: [...geplaatst[bakId], kaart.id] };
      setGeplaatst(nieuw);
      if (nieuw.vroeg.length + nieuw.laat.length === R1_SYMPTOMEN.length) setPopup(true);
      return "correct";
    }
    addScore(-5);
    setLaatste(null);
    setHint(kaart.cat === "vroeg"
      ? "Dit symptoom hoort bij het begin: het lijkt op een griepje."
      : "Dit symptoom hoort bij hoge concentraties: dan is er levensgevaar.");
    return "wrong";
  };

  if (fase === "uitleg") {
    return (
      <RondeIntro
        title="Ronde 1: De verraderlijke binding"
        intro="Missie 1, ronde 1. Eerst zien wat CO in je bloed doet, daarna sorteer je de symptomen."
        onStart={() => setFase("bloed")}
      >
        <UitlegItem term="Waar komt CO vandaan">
          CO ontstaat bij <b>onvolledige verbranding</b>, meestal door een tekort aan zuurstof. Elk verbrandingstoestel kan dus een CO-bron zijn.
        </UitlegItem>
        <UitlegItem term="Onzichtbaar">
          CO is <b>geur-, kleur- en smaakloos</b>: je kunt het niet waarnemen.
        </UitlegItem>
        <UitlegItem term="De binding">
          CO bindt zich <b>ruim tweehonderd keer sterker</b> aan hemoglobine (de zuurstofdrager in je bloed) dan zuurstof. Zo dadelijk zie je wat dat betekent.
        </UitlegItem>
      </RondeIntro>
    );
  }

  if (fase === "bloed") {
    return (
      <div className="flex-1 flex flex-col items-center p-5">
        <StepBanner step={1} />
        <h2 className="text-lg font-bold italic mb-1 text-center" style={{ color: C.brownText }}>
          Ronde 1: De verraderlijke binding
        </h2>
        <p className="text-xs mb-3 text-center font-medium" style={{ color: C.brown }}>
          Kijk wat er in de bloedbaan gebeurt als je CO inademt.
        </p>
        <BloedbaanSVG coCount={coCount} />
        <div
          className="border-2 rounded-2xl px-4 py-3 max-w-md w-full mt-3 shadow-md text-center"
          style={{ backgroundColor: C.bgCard, borderColor: C.brownText }}
        >
          <p className="text-sm font-medium leading-snug" style={{ color: C.brownText }}>{R1_TEKSTEN[coCount]}</p>
          <p className="text-xs mt-1.5 font-bold" style={{ color: coCount >= 2 ? C.red : C.olive }}>
            Zuurstoftransport: {100 - coCount * 25}%
          </p>
        </div>
        {coCount < 3 ? (
          <GameButton onClick={() => setCoCount(coCount + 1)} className="mt-4">
            Adem CO in
          </GameButton>
        ) : (
          <GameButton onClick={() => setFase("sorteer")} variant="green" className="mt-4">
            Naar de symptomen
          </GameButton>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center p-5">
      <StepBanner step={1} />
      <h2 className="text-lg font-bold italic mb-1 text-center" style={{ color: C.brownText }}>
        Ronde 1: Sorteer de symptomen
      </h2>
      <p className="text-xs mb-3 text-center font-medium" style={{ color: C.brown }}>
        Sleep elk symptoom naar de juiste groep (of tik eerst op het kaartje en daarna op de groep).
      </p>

      <UitlegStrook title="Spiekbriefje: het verloop">
        <p>Het begint als een <b>griepje</b>: lichte klachten die niemand aan CO koppelt.</p>
        <p>Bij hogere concentraties volgt <b>levensgevaar</b>: het lichaam valt uit.</p>
      </UitlegStrook>

      <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
        {R1_BAKKEN.map((bak) => (
          <DropTarget key={bak.id} id={bak.id} onDropItem={drop(bak.id)}>
            {({ isHover, flash }) => (
              <div
                className="rounded-2xl border-2 p-3 min-h-[150px] transition-all"
                style={{
                  borderColor: flash === "wrong" ? C.red : flash === "correct" || isHover ? C.green : bak.kleur,
                  backgroundColor: flash === "wrong" ? C.redLight : isHover ? C.greenLight : bak.licht,
                }}
              >
                <p className="text-xs font-bold text-center" style={{ color: bak.kleur }}>{bak.titel}</p>
                <p className="text-[10px] italic text-center mb-2" style={{ color: C.brown }}>{bak.sub}</p>
                <div className="flex flex-col gap-1.5">
                  {geplaatst[bak.id].map((id) => {
                    const s = R1_SYMPTOMEN.find((x) => x.id === id);
                    return (
                      <div key={id} className="rounded-lg border px-2 py-1 text-[11px] font-bold text-center bg-white"
                        style={{ borderColor: bak.kleur, color: C.brownText }}>
                        {s.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </DropTarget>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-lg">
        {over.map((s) => (
          <Draggable key={s.id} payload={s.id}>
            <div className="px-4 py-2 rounded-xl font-bold text-sm select-none shadow-md border-2 italic text-center"
              style={{ backgroundColor: C.olive, color: "white", borderColor: C.oliveDark }}>
              {s.label}
            </div>
          </Draggable>
        ))}
      </div>

      {hint && (
        <p className="text-xs text-center italic mt-3 font-medium max-w-md" style={{ color: C.red }}>{hint}</p>
      )}
      {laatste && !hint && (
        <p className="text-xs text-center italic mt-3 font-medium max-w-md flex items-start gap-1.5" style={{ color: C.green }}>
          <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {laatste}
        </p>
      )}

      {popup && (
        <FeedbackPopup
          type="correct"
          text="Alle symptomen gesorteerd! Onthoud: de vroege signalen lijken op een griepje, en juist daardoor wordt CO-vergiftiging vaak niet herkend. Bij hogere concentraties volgen bewusteloosheid, coma, blijvende hersenschade en overlijden."
          onClose={onDone}
          buttonText="Naar de controlevraag"
        />
      )}
    </div>
  );
}

// ─── RONDE 2: CONCENTRATIE MAAL TIJD ───

const R2_ZONES = [
  {
    id: "licht", titel: "Hoofdpijn en vermoeidheid", sub: "na enige tijd, lijkt op griep",
    kleur: "#B8860B", licht: "#FBF3DC",
  },
  {
    id: "gevaar", titel: "Bewusteloosheid, levensgevaar", sub: "na enige tijd in elkaar zakken",
    kleur: "#C0661B", licht: "#FBE8D4",
  },
  {
    id: "fataal", titel: "Fataal", sub: "binnen minuten tot een half uur",
    kleur: C.red, licht: C.redLight,
  },
];

const R2_KAARTEN = [
  {
    id: "s1", ppm: "90 ppm", duur: "de hele avond in de woonkamer", zone: "licht",
    hulp: "Rond 70 tot 120 ppm geeft na enige tijd hoofdpijn en vermoeidheid.",
    uitlegGoed: "90 ppm hoort bij de laagste rij van de tabel: na enige tijd hoofdpijn en vermoeidheid.",
    hintFout: "Kijk op het spiekbriefje: in welke rij van de tabel valt 90 ppm?",
  },
  {
    id: "s2", ppm: "12.800 ppm", duur: "enkele minuten in de kruipruimte", zone: "fataal",
    hulp: "Duizenden ppm zijn al binnen enkele minuten fataal.",
    uitlegGoed: "12.800 ppm is binnen 1 tot 3 minuten fataal. Zo snel kan het gaan.",
    hintFout: "Duizenden ppm: hoeveel tijd heb je dan nog?",
  },
  {
    id: "s3", ppm: "120 ppm", duur: "twee uur in de keuken", zone: "licht",
    uitlegGoed: "120 ppm twee uur lang: hoofdpijn, vermoeidheid en mogelijk duizeligheid. Nog geen acuut levensgevaar, wel een duidelijk signaal.",
    hintFout: "120 ppm zit nog in de laagste rij van de tabel.",
  },
  {
    id: "s4", ppm: "400 ppm", duur: "een paar uur in de woonkamer", zone: "gevaar",
    uitlegGoed: "Honderden ppm: na enkele uren dreigen bewusteloosheid en levensgevaar.",
    hintFout: "400 ppm is honderden ppm, geen duizenden. Wat hoort daarbij?",
  },
  {
    id: "s5", ppm: "3.200 ppm", duur: "een half uur in de badkamer", zone: "fataal",
    uitlegGoed: "3.200 ppm is binnen 30 minuten fataal. Kort in een hoge concentratie is net zo dodelijk als lang in een lagere.",
    hintFout: "3.200 ppm is duizenden ppm. Wat zegt de tabel over een half uur?",
  },
  {
    id: "s6", ppm: "800 ppm", duur: "een hele avond in de slaapkamer", zone: "gevaar",
    uitlegGoed: "Honderden ppm, urenlang: bewusteloosheid en levensgevaar. En wie slaapt, merkt er niets van.",
    hintFout: "800 ppm is honderden ppm. Wat gebeurt er na een hele avond?",
  },
];

function RondeConcentratieTijd({ addScore, onDone }) {
  const [fase, setFase] = useState("uitleg");
  const [idx, setIdx] = useState(0);
  const [hint, setHint] = useState(null);
  const [laatste, setLaatste] = useState(null);
  const [flash, setFlash] = useState(null); // korte kleur-feedback op de aangeklikte knop
  const [popup, setPopup] = useState(false);

  const kaart = R2_KAARTEN[idx];
  const spiekOpen = idx < 2;

  const kies = (zoneId) => {
    if (popup) return;
    setFlash({ zone: zoneId, type: zoneId === kaart.zone ? "correct" : "wrong" });
    setTimeout(() => setFlash(null), 450);
    if (zoneId === kaart.zone) {
      addScore(5);
      setHint(null);
      setLaatste(kaart.uitlegGoed);
      if (idx + 1 >= R2_KAARTEN.length) setPopup(true);
      else setIdx(idx + 1);
    } else {
      addScore(-5);
      setLaatste(null);
      setHint(kaart.hintFout);
    }
  };

  if (fase === "uitleg") {
    return (
      <RondeIntro
        title="Ronde 2: Concentratie maal tijd"
        intro="Missie 1, ronde 2. Hoe ziek je wordt, hangt af van twee dingen tegelijk."
        onStart={() => setFase("spel")}
      >
        <UitlegItem term="De twee factoren">
          de <b>concentratie</b> CO in de lucht en de <b>duur</b> van de blootstelling bepalen samen de ernst.
        </UitlegItem>
        <UitlegItem term="De tabel">
          rond <b>70 tot 120 ppm</b>: na enige tijd hoofdpijn en vermoeidheid. <b>Honderden ppm</b>: bewusteloosheid en levensgevaar. <b>Duizenden ppm</b>: binnen minuten tot een half uur fataal (3.200 ppm binnen 30 minuten, 12.800 ppm binnen 1 tot 3 minuten).
        </UitlegItem>
        <UitlegItem term="De valkuil">
          <b>kort</b> in een hoge concentratie is net zo gevaarlijk als <b>lang</b> in een lagere.
        </UitlegItem>
      </RondeIntro>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center p-5">
      <StepBanner step={1} />
      <h2 className="text-lg font-bold italic mb-1 text-center" style={{ color: C.brownText }}>
        Ronde 2: Concentratie maal tijd
      </h2>
      <p className="text-xs mb-3 text-center font-medium" style={{ color: C.brown }}>
        Lees de scenariokaart en klik of tik op het gevolg dat je verwacht. Scenario {idx + 1} van {R2_KAARTEN.length}.
      </p>

      <UitlegStrook key={spiekOpen ? "open" : "dicht"} title="Spiekbriefje: de tabel" defaultOpen={spiekOpen}>
        <p>Rond <b>70 tot 120 ppm</b>: na enige tijd hoofdpijn en vermoeidheid.</p>
        <p><b>Honderden ppm</b>: bewusteloosheid en levensgevaar.</p>
        <p><b>Duizenden ppm</b>: binnen minuten tot een half uur fataal.</p>
      </UitlegStrook>

      <div
        className="rounded-2xl border-2 px-6 py-3 shadow-md text-center select-none"
        style={{ backgroundColor: C.bgCard, borderColor: C.brownText }}
      >
        <p className="text-2xl font-bold italic" style={{ color: C.brownText }}>{kaart.ppm}</p>
        <p className="text-xs font-medium" style={{ color: C.brown }}>{kaart.duur}</p>
        {kaart.hulp && (
          <p className="text-[11px] mt-1 italic font-medium" style={{ color: C.olive }}>Hulp: {kaart.hulp}</p>
        )}
      </div>

      <div className="flex flex-col gap-2 w-full max-w-md mt-4">
        {R2_ZONES.map((zone) => {
          const f = flash?.zone === zone.id ? flash.type : null;
          return (
            <button
              key={zone.id}
              onClick={() => kies(zone.id)}
              className="rounded-xl border-2 px-4 py-3 text-center transition-all hover:shadow-md active:scale-[0.98]"
              style={{
                borderColor: f === "wrong" ? C.red : f === "correct" ? C.green : zone.kleur,
                backgroundColor: f === "wrong" ? C.redLight : f === "correct" ? C.greenLight : zone.licht,
              }}
            >
              <p className="text-sm font-bold" style={{ color: zone.kleur }}>{zone.titel}</p>
              <p className="text-[10px] italic" style={{ color: C.brown }}>{zone.sub}</p>
            </button>
          );
        })}
      </div>

      {hint && (
        <p className="text-xs text-center italic mt-3 font-medium max-w-md" style={{ color: C.red }}>{hint}</p>
      )}
      {laatste && !hint && (
        <p className="text-xs text-center italic mt-3 font-medium max-w-md flex items-start gap-1.5" style={{ color: C.green }}>
          <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {laatste}
        </p>
      )}

      {popup && (
        <FeedbackPopup
          type="correct"
          text="Alle scenario's beoordeeld! Onthoud: concentratie maal tijdsduur bepaalt de ernst. Kort in een hoge concentratie is net zo dodelijk als lang in een lagere."
          onClose={onDone}
          buttonText="Naar de controlevraag"
        />
      )}
    </div>
  );
}

// ─── RONDE 3: ZOEK DE SIGNALEN (zoekplaat) ───

const R3_SIGNALEN = [
  {
    id: "vlam", label: "Geel-oranje vlam in de gashaard",
    uitleg: "Een gezonde vlam is blauw. Geel-oranje betekent zuurstoftekort: onvolledige verbranding, en daarbij kan CO ontstaan.",
    marker: [300, 208],
  },
  {
    id: "condens", label: "Condens op het raam",
    uitleg: "Aanhoudend beslagen ramen en vochtplekken kunnen erop wijzen dat verbrandingsgassen niet goed worden afgevoerd.",
    marker: [115, 110],
  },
  {
    id: "roet", label: "Roetspoor boven de haard",
    uitleg: "Roet, roest of corrosie op of rond een toestel wijst op een slechte verbranding of een lekkende afvoer.",
    marker: [300, 68],
  },
  {
    id: "rooster", label: "Dichtgeplakt ventilatierooster",
    uitleg: "Zonder vrije luchttoevoer krijgt een open toestel te weinig zuurstof: precies zo ontstaat CO.",
    marker: [445, 218],
  },
  {
    id: "afvoer", label: "Losliggende rookgasafvoer",
    uitleg: "Door een losliggende of lekkende rookgasafvoer stromen verbrandingsgassen zo de woning in.",
    marker: [612, 62],
  },
];

const R3_AFLEIDERS = [
  {
    id: "ventilatiebox",
    uitleg: "De ventilatiebox zoemt zacht: dat is normaal bedrijf. Werkende ventilatie verlaagt het CO-risico juist.",
    marker: [524, 30],
  },
  {
    id: "radiator",
    uitleg: "Droge, warme lucht bij een radiator is normaal. Let juist op het omgekeerde: vochtige, bedompte lucht.",
    marker: [115, 268],
  },
  {
    id: "plant",
    uitleg: "De plant doet niemand kwaad. Kijk naar het toestel, de afvoer, de roosters en de ramen.",
    marker: [452, 300],
  },
];

function ZoekplaatSVG({ gevonden, fouten, onKlik }) {
  const clickProps = (id) => ({
    onClick: (e) => {
      e.stopPropagation();
      onKlik(id);
    },
    style: { cursor: "pointer" },
  });
  return (
    <svg viewBox="0 0 720 400" width="100%" role="img" aria-label="Zoekplaat: woonkamer met gashaard en keuken met geiser">
      {/* muren en vloer */}
      <rect x="0" y="0" width="480" height="330" fill="#F0E8D8" />
      <rect x="480" y="0" width="240" height="330" fill="#EAE0CC" />
      <rect x="0" y="330" width="720" height="70" fill="#C9B891" />
      <line x1="0" y1="330" x2="720" y2="330" stroke={C.brownText} strokeWidth="2" />
      <line x1="480" y1="0" x2="480" y2="330" stroke="#C9B891" strokeWidth="4" />

      {/* ── raam met condens (signaal) ── */}
      <g {...clickProps("condens")}>
        <rect x="40" y="40" width="150" height="140" rx="4" fill="#6B4F2A" />
        <rect x="48" y="48" width="64" height="58" fill="#C8DEE9" />
        <rect x="118" y="48" width="64" height="58" fill="#C8DEE9" />
        <rect x="48" y="114" width="64" height="58" fill="#BFD8E4" />
        <rect x="118" y="114" width="64" height="58" fill="#BFD8E4" />
        {/* condens: waas en druppelsporen onderin de ruiten */}
        <ellipse cx="80" cy="158" rx="30" ry="14" fill="white" opacity="0.75" />
        <ellipse cx="150" cy="160" rx="30" ry="13" fill="white" opacity="0.75" />
        <ellipse cx="80" cy="98" rx="26" ry="9" fill="white" opacity="0.55" />
        <ellipse cx="150" cy="96" rx="26" ry="9" fill="white" opacity="0.55" />
        <path d="M 62 140 v 26 M 96 146 v 22 M 132 142 v 26 M 166 148 v 20" stroke="#9CC3D5" strokeWidth="3" strokeLinecap="round" />
        <circle cx="62" cy="168" r="2.5" fill="#9CC3D5" />
        <circle cx="132" cy="170" r="2.5" fill="#9CC3D5" />
      </g>

      {/* ── radiator (afleider) ── */}
      <g {...clickProps("radiator")}>
        <rect x="52" y="242" width="126" height="56" rx="6" fill="#E6E2D8" stroke={C.brownText} strokeWidth="2" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={60 + i * 19} y="248" width="12" height="44" rx="3" fill="#D5D0C2" stroke="#B7B1A0" strokeWidth="1" />
        ))}
        {/* warmtegolfjes */}
        <path d="M 80 232 q 4 -7 0 -13 M 112 232 q 4 -7 0 -13 M 144 232 q 4 -7 0 -13" fill="none" stroke="#C4A96A" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* ── roetspoor boven de haard (signaal) ── */}
      <g {...clickProps("roet")}>
        <rect x="288" y="30" width="24" height="120" fill="#8E9AA3" stroke={C.brownText} strokeWidth="2" />
        <ellipse cx="300" cy="52" rx="42" ry="20" fill="#4E4A44" opacity="0.65" />
        <ellipse cx="286" cy="76" rx="30" ry="14" fill="#4E4A44" opacity="0.5" />
        <ellipse cx="316" cy="84" rx="26" ry="12" fill="#4E4A44" opacity="0.45" />
      </g>

      {/* ── gashaard met geel-oranje vlam (signaal) ── */}
      <g {...clickProps("vlam")}>
        <rect x="240" y="150" width="120" height="110" rx="8" fill="#4A4741" stroke={C.brownText} strokeWidth="2.5" />
        <rect x="252" y="164" width="96" height="70" rx="6" fill="#2B2926" />
        <rect x="256" y="168" width="88" height="62" rx="4" fill="#1C1B19" />
        {/* vlammen: geel-oranje in plaats van blauw */}
        <g style={{ animation: "vlamFlikker 0.9s ease-in-out infinite", transformBox: "fill-box", transformOrigin: "center bottom" }}>
          <path d="M 272 226 q -6 -18 6 -30 q 2 12 10 14 q -2 -16 10 -24 q 4 14 12 18 q 0 -12 8 -18 q 6 16 2 26 q 8 -2 8 -10 q 8 16 -4 24 z" fill="#E8930C" />
          <path d="M 282 226 q -2 -12 6 -18 q 2 8 8 10 q 0 -10 8 -14 q 4 10 8 12 q 2 8 -2 10 z" fill="#F3C94A" />
        </g>
        <rect x="252" y="238" width="96" height="8" rx="3" fill="#6B675F" />
        {/* pootjes */}
        <rect x="252" y="260" width="12" height="14" fill="#4A4741" />
        <rect x="336" y="260" width="12" height="14" fill="#4A4741" />
      </g>

      {/* ── dichtgeplakt ventilatierooster (signaal) ── */}
      <g {...clickProps("rooster")}>
        <rect x="418" y="196" width="54" height="42" rx="4" fill="#E6E2D8" stroke={C.brownText} strokeWidth="2" />
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1="424" y1={205 + i * 8} x2="466" y2={205 + i * 8} stroke="#9B9484" strokeWidth="3" />
        ))}
        {/* tape eroverheen */}
        <rect x="410" y="207" width="70" height="13" fill="#E8D9A8" opacity="0.92" transform="rotate(-14 445 213)" stroke="#C9B368" strokeWidth="1" />
        <rect x="410" y="215" width="70" height="13" fill="#E8D9A8" opacity="0.92" transform="rotate(12 445 221)" stroke="#C9B368" strokeWidth="1" />
      </g>

      {/* ── plant (afleider) ── */}
      <g {...clickProps("plant")}>
        <path d="M 440 322 h 26 l -4 -26 h -18 z" fill="#B06A3B" stroke={C.brownText} strokeWidth="1.5" />
        <path d="M 452 296 q -14 -16 -6 -32 q 10 8 8 24 q 2 -20 14 -26 q 4 16 -10 28 q 12 -10 20 -6 q -6 12 -20 14 z" fill="#5C6B2E" />
      </g>

      {/* ── keuken: aanrecht ── */}
      <rect x="492" y="250" width="220" height="14" fill="#8A6B3F" stroke={C.brownText} strokeWidth="2" />
      <rect x="500" y="264" width="204" height="66" fill="#D9CDB8" stroke={C.brownText} strokeWidth="2" />
      <line x1="602" y1="264" x2="602" y2="330" stroke="#B7A98C" strokeWidth="2" />
      <circle cx="590" cy="296" r="4" fill="#6B4F2A" />
      <circle cx="614" cy="296" r="4" fill="#6B4F2A" />

      {/* ── geiser met losliggende afvoer (signaal) ── */}
      <g {...clickProps("afvoer")}>
        {/* afvoerpijp: onderste deel recht, bovenste deel verschoven met zichtbare kier */}
        <rect x="592" y="74" width="20" height="36" fill="#9AA1A8" stroke={C.brownText} strokeWidth="2" />
        <rect x="604" y="18" width="20" height="46" fill="#9AA1A8" stroke={C.brownText} strokeWidth="2" transform="rotate(8 614 41)" />
        {/* kier-accent */}
        <path d="M 590 70 l 26 -6" stroke={C.red} strokeWidth="0" />
        {/* geiser */}
        <rect x="566" y="110" width="72" height="104" rx="10" fill="#F4F2EC" stroke={C.brownText} strokeWidth="2.5" />
        <rect x="580" y="126" width="44" height="26" rx="4" fill="#DCE8C6" stroke={C.brownText} strokeWidth="1.5" />
        <circle cx="602" cy="182" r="14" fill="#E6E2D8" stroke={C.brownText} strokeWidth="2" />
        <path d="M 596 186 q 6 -14 12 0 q -6 8 -12 0" fill="#5B8FB3" />
      </g>

      {/* ── ventilatiebox aan het plafond (afleider) ── */}
      <g {...clickProps("ventilatiebox")}>
        <rect x="496" y="8" width="56" height="26" rx="6" fill="#EDEDEA" stroke={C.brownText} strokeWidth="2" />
        {[0, 1, 2].map((i) => (
          <line key={i} x1={504 + i * 14} y1="14" x2={504 + i * 14} y2="28" stroke="#B7B1A0" strokeWidth="3" />
        ))}
        {/* zoem-golfjes */}
        <path d="M 560 14 q 6 7 0 14 M 568 10 q 9 11 0 22" fill="none" stroke="#9B9484" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* markers: gevonden signalen (groen vinkje) en foute klikken (rood kruis, kort) */}
      {R3_SIGNALEN.filter((s) => gevonden.includes(s.id)).map((s) => (
        <g key={s.id} pointerEvents="none">
          <circle cx={s.marker[0]} cy={s.marker[1]} r="15" fill={C.green} stroke="white" strokeWidth="2.5" />
          <path d={`M ${s.marker[0] - 6} ${s.marker[1]} l 4.5 5 l 8 -9`} fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
      {R3_AFLEIDERS.filter((a) => fouten.includes(a.id)).map((a) => (
        <g key={a.id} pointerEvents="none">
          <circle cx={a.marker[0]} cy={a.marker[1]} r="13" fill={C.red} stroke="white" strokeWidth="2.5" />
          <path d={`M ${a.marker[0] - 5} ${a.marker[1] - 5} l 10 10 M ${a.marker[0] + 5} ${a.marker[1] - 5} l -10 10`} stroke="white" strokeWidth="3" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}

function RondeZoekSignalen({ addScore, onDone }) {
  const [fase, setFase] = useState("uitleg");
  const [gevonden, setGevonden] = useState([]);
  const [fouten, setFouten] = useState([]);
  const [melding, setMelding] = useState(null); // { type: "goed"|"fout", tekst }
  const [popup, setPopup] = useState(false);
  // synchrone dubbelklik-bescherming: state-updates kunnen gebatcht worden,
  // dus de al-verwerkte ids ook los van de state bijhouden
  const verwerkt = useRef(new Set());

  const klik = (id) => {
    if (popup || verwerkt.current.has(id)) return;
    const signaal = R3_SIGNALEN.find((s) => s.id === id);
    if (signaal) {
      verwerkt.current.add(id);
      addScore(5);
      setGevonden((prev) => [...prev, id]);
      setMelding({ type: "goed", tekst: `${signaal.label}. ${signaal.uitleg}` });
      const aantal = R3_SIGNALEN.filter((s) => verwerkt.current.has(s.id)).length;
      if (aantal === R3_SIGNALEN.length) setPopup(true);
      return;
    }
    const afleider = R3_AFLEIDERS.find((a) => a.id === id);
    if (afleider) {
      verwerkt.current.add(id);
      addScore(-5);
      setFouten((prev) => [...prev, id]);
      setMelding({ type: "fout", tekst: afleider.uitleg });
    }
  };

  if (fase === "uitleg") {
    return (
      <RondeIntro
        title="Ronde 1: Zoek de signalen"
        intro="Missie 2, ronde 1. Je stapt een woonkamer met gashaard binnen; in de keuken hangt een geiser. Kijk als een monteur."
        onStart={() => setFase("spel")}
      >
        <UitlegItem term="Signalen aan de installatie">
          een <b>geel-oranje vlam</b> in plaats van blauw, <b>roet, roest of corrosie</b>, een <b>beschadigde of losliggende rookgasafvoer</b>, en <b>condens</b> op ramen en muren of een bedompte, muffe lucht.
        </UitlegItem>
        <UitlegItem term="Luchttoevoer">
          een open toestel heeft vrije <b>ventilatieroosters</b> nodig. Dichtgezet of dichtgeplakt betekent zuurstoftekort.
        </UitlegItem>
        <UitlegItem term="Achter het signaal">
          roet en een gele vlam betekenen onvolledige verbranding. Meet je in het rookgas een CO-waarde boven de grens van de fabrikant (bijvoorbeeld 250 ppm), dan is de oorzaak <b>vervuiling of storing van de brander</b>, of <b>recirculatie van rookgassen</b>.
        </UitlegItem>
      </RondeIntro>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center p-5">
      <StepBanner step={1} />
      <h2 className="text-lg font-bold italic mb-1 text-center" style={{ color: C.brownText }}>
        Ronde 1: Zoek de signalen
      </h2>
      <p className="text-xs mb-3 text-center font-medium" style={{ color: C.brown }}>
        Klik of tik op alles wat op CO-gevaar wijst. Onschuldige zaken kosten punten. Gevonden: {gevonden.length} van {R3_SIGNALEN.length}.
      </p>

      <div className="w-full max-w-2xl rounded-2xl border-2 overflow-hidden shadow-md" style={{ borderColor: C.brownText, backgroundColor: "white" }}>
        <ZoekplaatSVG gevonden={gevonden} fouten={fouten} onKlik={klik} />
      </div>

      {melding && (
        <p
          className="text-xs text-center italic mt-3 font-medium max-w-lg flex items-start gap-1.5"
          style={{ color: melding.type === "goed" ? C.green : C.red }}
        >
          {melding.type === "goed"
            ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
          {melding.tekst}
        </p>
      )}

      {popup && (
        <FeedbackPopup
          type="correct"
          text="Alle vijf signalen gevonden! Gele vlam, roet, losse afvoer, dichtgeplakt rooster en condens: elk van deze signalen is reden om verder te onderzoeken en te meten."
          onClose={onDone}
          buttonText="Naar de controlevraag"
        />
      )}
    </div>
  );
}

// ─── RONDE 4: WELKE WONING EERST? ───

const R4_SETS = [
  {
    titel: "Inspectieronde 1",
    hulp: "Vraag je bij elke situatie af: waar komt de verbrandingslucht vandaan, en waar gaan de rookgassen heen?",
    kaarten: [
      {
        id: "a", rang: 1,
        tekst: "Keuken met een open geiser (type B). Na de na-isolatie van vorig jaar zijn de ventilatieroosters dichtgeplakt.",
        uitleg: "Een open toestel haalt zijn verbrandingslucht uit de ruimte zelf. Dichtgeplakte roosters in een luchtdicht geïsoleerde woning: dit is het grootste risico.",
      },
      {
        id: "b", rang: 2,
        tekst: "Woonkamer met een open gashaard met trekonderbreker (type B). Roosters open, jaarlijks onderhouden.",
        uitleg: "Een open toestel blijft een aandachtspunt, maar met vrije luchttoevoer en goed onderhoud is het risico hier kleiner.",
      },
      {
        id: "c", rang: 3,
        tekst: "Zolder met een gesloten HR-ketel (type C): concentrische luchttoevoer en rookgasafvoer via het dak.",
        uitleg: "Een gesloten toestel haalt zijn lucht van buiten en voert de rookgassen buiten af: het kleinste risico van de drie.",
      },
    ],
  },
  {
    titel: "Inspectieronde 2 (zonder hulp)",
    hulp: null,
    kaarten: [
      {
        id: "d", rang: 1,
        tekst: "Keuken met een open geiser (type B). Tijdens het koken draait de motorafzuigkap op de hoogste stand.",
        uitleg: "De afzuigkap zet de keuken op onderdruk: rookgassen worden via de trekonderbreker de ruimte in getrokken. Hier maak je je het eerst zorgen over.",
      },
      {
        id: "e", rang: 2,
        tekst: "Appartement met een gesloten toestel. In de buurwoning is een CO-melding geweest; de woningen delen een schacht met een gemeenschappelijke rookgasafvoer.",
        uitleg: "Ook met een veilig eigen toestel kan CO in gestapelde bouw uit een omliggende woning komen, via schachten of de gemeenschappelijke afvoer.",
      },
      {
        id: "f", rang: 3,
        tekst: "Berging met een elektrische boiler. Het ventilatierooster is dichtgezet.",
        uitleg: "Een elektrische boiler verbrandt niets en kan dus geen CO maken. Het dichte rooster is niet netjes, maar CO-gevaar levert het hier niet op.",
      },
    ],
  },
];

function RondeWelkeWoning({ addScore, onDone }) {
  const [fase, setFase] = useState("uitleg");
  const [setIdx, setSetIdx] = useState(0);
  const [ranks, setRanks] = useState({}); // kaartId → toegekende rang
  const [hint, setHint] = useState(null);
  const [laatste, setLaatste] = useState(null);
  const [flashFout, setFlashFout] = useState(null);
  const [popup, setPopup] = useState(false);

  const set = R4_SETS[setIdx];
  const volgende = Object.keys(ranks).length + 1;
  const setKlaar = Object.keys(ranks).length === set.kaarten.length;

  const kies = (kaart) => {
    if (ranks[kaart.id] || setKlaar || popup) return;
    if (kaart.rang === volgende) {
      addScore(5);
      setHint(null);
      setLaatste(kaart.uitleg);
      setRanks({ ...ranks, [kaart.id]: volgende });
    } else {
      addScore(-5);
      setLaatste(null);
      setFlashFout(kaart.id);
      setTimeout(() => setFlashFout(null), 450);
      setHint(
        volgende === 1
          ? "Dit is niet de gevaarlijkste situatie. Waar dreigt het meest acute CO-gevaar?"
          : "Kijk nog eens: welke van de overgebleven situaties is gevaarlijker?"
      );
    }
  };

  const verder = () => {
    if (setIdx + 1 >= R4_SETS.length) {
      setPopup(true);
    } else {
      setSetIdx(setIdx + 1);
      setRanks({});
      setHint(null);
      setLaatste(null);
    }
  };

  if (fase === "uitleg") {
    return (
      <RondeIntro
        title="Ronde 2: Welke woning eerst?"
        intro="Missie 2, ronde 2. Drie situaties naast elkaar: waar maak jij je het eerst zorgen over?"
        onStart={() => setFase("spel")}
      >
        <UitlegItem term="Verhoogd risico">
          open toestellen zonder afvoer (type A) en met trekonderbreker (type B), zeker met <b>dichtgezette roosters</b>; woningen die na <b>na-isolatie</b> luchtdicht zijn; <b>uitval van ventilatie</b>; <b>onderdruk</b> door een afzuigkap; en achterstallig onderhoud.
        </UitlegItem>
        <UitlegItem term="Gestapelde bouw">
          CO kan ook uit een <b>omliggende woning</b> komen, via schachten, kanalen of een gemeenschappelijke rookgasafvoer.
        </UitlegItem>
        <UitlegItem term="De opdracht">
          tik de situaties aan in volgorde van risico: <b>het grootste gevaar eerst</b>.
        </UitlegItem>
      </RondeIntro>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center p-5">
      <StepBanner step={1} />
      <h2 className="text-lg font-bold italic mb-1 text-center" style={{ color: C.brownText }}>
        Ronde 2: Welke woning eerst?
      </h2>
      <p className="text-xs mb-1 text-center font-medium" style={{ color: C.brown }}>
        {set.titel}: tik de situaties aan in volgorde van risico, het grootste gevaar eerst.
      </p>
      {set.hulp && (
        <p className="text-[11px] mb-2 text-center italic font-medium max-w-md" style={{ color: C.olive }}>
          Hulp: {set.hulp}
        </p>
      )}

      <div className="flex flex-col gap-2.5 w-full max-w-lg mt-2">
        {set.kaarten.map((kaart) => {
          const rang = ranks[kaart.id];
          const fout = flashFout === kaart.id;
          return (
            <button
              key={kaart.id}
              onClick={() => kies(kaart)}
              className="text-left rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all flex items-start gap-3"
              style={{
                backgroundColor: fout ? C.redLight : rang ? C.greenLight : "white",
                borderColor: fout ? C.red : rang ? C.green : C.beigeMid,
                color: C.brownText,
                cursor: rang ? "default" : "pointer",
              }}
            >
              <span
                className="w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold text-sm shrink-0"
                style={{
                  borderColor: rang ? C.green : C.beigeMid,
                  backgroundColor: rang ? C.green : "transparent",
                  color: rang ? "white" : C.beigeMid,
                }}
              >
                {rang ?? "?"}
              </span>
              <span>{kaart.tekst}</span>
            </button>
          );
        })}
      </div>

      {hint && (
        <p className="text-xs text-center italic mt-3 font-medium max-w-md" style={{ color: C.red }}>{hint}</p>
      )}
      {laatste && !hint && (
        <p className="text-xs text-center italic mt-3 font-medium max-w-md flex items-start gap-1.5" style={{ color: C.green }}>
          <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {laatste}
        </p>
      )}

      {setKlaar && !popup && (
        <GameButton onClick={verder} variant="green" className="mt-4">
          {setIdx + 1 >= R4_SETS.length ? "Rondes afronden" : "Volgende inspectieronde"}
        </GameButton>
      )}

      {popup && (
        <FeedbackPopup
          type="correct"
          text="Beide inspectierondes goed doorlopen! Open toestellen met een verstoorde luchthuishouding staan altijd bovenaan je lijstje, en in gestapelde bouw kijk je verder dan de eigen woning."
          onClose={onDone}
          buttonText="Naar de controlevraag"
        />
      )}
    </div>
  );
}

// ─── RONDE 5: LET OP JEZELF (kaal) ───

const R5_SCENARIOS = [
  {
    situatie: "Je bent bezig met onderhoud in een kleine opstellingsruimte. Na een kwartier krijg je hoofdpijn en word je licht duizelig.",
    opties: [
      "Even doorzetten: de klus is bijna af, en met de deur open trekt het vanzelf weg.",
      "Direct de ruimte verlaten en naar buiten gaan. Pas verdergaan nadat je het CO-gehalte hebt gemeten.",
      "Een paracetamol nemen en het wat rustiger aan doen.",
    ],
    goed: 1,
    uitleg: "Hoofdpijn en duizeligheid tijdens het werk kunnen de eerste tekenen van CO zijn. Eerst naar buiten, dan meten. Nooit doorwerken.",
    hint: "De eerste CO-symptomen voelen onschuldig. Wat is de enige veilige keuze?",
  },
  {
    situatie: "De bewoner vertelt dat het hele gezin in het stookseizoen vaak hoofdpijn heeft en moe is. Op vakantie heeft niemand ergens last van.",
    opties: [
      "Je adviseert een bezoek aan de huisarts; voor jouw werk betekent dit niets.",
      "Je ziet dit als mogelijk CO-signaal en meet het CO-gehalte in de woning.",
      "Je stelt het gezin gerust: hoofdpijn in de winter komt meestal door droge lucht.",
    ],
    goed: 1,
    uitleg: "Klachten die buitenshuis verdwijnen zijn een klassiek CO-signaal. Dat controleer je met een meting, niet met een geruststelling.",
    hint: "Binnen klachten, buiten niet. Wat zegt dat patroon jou als monteur?",
  },
  {
    situatie: "Je stapt bij de volgende klus naar binnen. Waar zit je persoonlijke CO-melder?",
    opties: [
      "In de gereedschapskist: dan hoor je hem vanzelf piepen.",
      "In de bus: vandaag vervang je toch alleen een thermostaat.",
      "Op borsthoogte aan je werkkleding, elke klus opnieuw.",
    ],
    goed: 2,
    uitleg: "De persoonlijke CO-melder draag je standaard op borsthoogte: hij bewaakt de lucht die jij inademt, bij elke klus.",
    hint: "De melder bewaakt jouw ademzone. Waar moet hij dan zitten?",
  },
];

function RondeLetOpJezelf({ addScore, onDone }) {
  const [fase, setFase] = useState("uitleg");
  const [idx, setIdx] = useState(0);
  const [hint, setHint] = useState(null);
  const [goedGekozen, setGoedGekozen] = useState(false);
  const [flashFout, setFlashFout] = useState(null);
  const [popup, setPopup] = useState(false);

  const scen = R5_SCENARIOS[idx];

  const kies = (i) => {
    if (goedGekozen || popup) return;
    if (i === scen.goed) {
      addScore(5);
      setHint(null);
      setGoedGekozen(true);
    } else {
      addScore(-5);
      setFlashFout(i);
      setTimeout(() => setFlashFout(null), 450);
      setHint(scen.hint);
    }
  };

  const verder = () => {
    if (idx + 1 >= R5_SCENARIOS.length) {
      setPopup(true);
    } else {
      setIdx(idx + 1);
      setGoedGekozen(false);
      setHint(null);
    }
  };

  if (fase === "uitleg") {
    return (
      <RondeIntro
        title="Ronde 3: Let op jezelf"
        intro="Missie 2, ronde 3. De laatste ronde, zonder spiekbriefje: jij werkt elke dag in ruimtes waar CO kan hangen."
        onStart={() => setFase("spel")}
        buttonText="Start de scenario's"
      >
        <p className="text-sm leading-relaxed" style={{ color: C.brownText }}>
          Drie situaties uit de praktijk. Kies steeds wat jij als monteur doet. Er is geen hulp meer: vertrouw op wat je in de vorige rondes hebt geleerd.
        </p>
      </RondeIntro>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center p-5">
      <StepBanner step={1} />
      <h2 className="text-lg font-bold italic mb-1 text-center" style={{ color: C.brownText }}>
        Ronde 3: Let op jezelf
      </h2>
      <p className="text-xs mb-3 text-center font-medium" style={{ color: C.brown }}>
        Scenario {idx + 1} van {R5_SCENARIOS.length}. Wat doe je?
      </p>

      <div
        className="border-2 rounded-2xl px-4 py-3 max-w-lg w-full mb-3 shadow-md"
        style={{ backgroundColor: C.bgCard, borderColor: C.brownText }}
      >
        <p className="text-sm font-medium leading-snug italic" style={{ color: C.brownText }}>{scen.situatie}</p>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-lg">
        {scen.opties.map((optie, i) => (
          <button
            key={i}
            onClick={() => kies(i)}
            className="text-left rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all"
            style={{
              backgroundColor: flashFout === i ? C.redLight : goedGekozen && i === scen.goed ? C.greenLight : "white",
              borderColor: flashFout === i ? C.red : goedGekozen && i === scen.goed ? C.green : C.beigeMid,
              color: C.brownText,
              cursor: goedGekozen ? "default" : "pointer",
            }}
          >
            {optie}
          </button>
        ))}
      </div>

      {hint && (
        <p className="text-xs text-center italic mt-3 font-medium max-w-md" style={{ color: C.red }}>{hint}</p>
      )}
      {goedGekozen && (
        <>
          <p className="text-xs text-center italic mt-3 font-medium max-w-md flex items-start gap-1.5" style={{ color: C.green }}>
            <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {scen.uitleg}
          </p>
          <GameButton onClick={verder} variant="green" className="mt-3">
            {idx + 1 >= R5_SCENARIOS.length ? "Ronde afronden" : "Volgend scenario"}
          </GameButton>
        </>
      )}

      {popup && (
        <FeedbackPopup
          type="correct"
          text="Alle scenario's goed doorlopen! Eigen klachten die buiten verdwijnen: naar buiten en meten. Klachten van bewoners die buitenshuis verdwijnen: meten. En je persoonlijke CO-melder draag je op borsthoogte, elke klus opnieuw."
          onClose={onDone}
          buttonText="Naar de laatste controlevraag"
        />
      )}
    </div>
  );
}

// ─── START SCREEN ───

function StartScreen({ onStart }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="py-3 px-5 text-center" style={{ backgroundColor: C.bgHeader }}>
        <span className="text-white font-bold italic text-lg">Spot het CO-gevaar</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
        <div className="rounded-full p-7 border-4" style={{ backgroundColor: C.beigeLight, borderColor: C.brownText }}>
          <Search className="w-20 h-20" style={{ color: C.brownText }} />
        </div>
        <h1 className="text-3xl font-bold italic text-center" style={{ color: C.brownText }}>Spot het CO-gevaar</h1>
        <p className="max-w-sm text-center font-medium" style={{ color: C.brown }}>
          Koolmonoxide ruik je niet, zie je niet en proef je niet. Eerst leer je wat CO met je lichaam doet. Daarna inspecteer je een woning zoals een monteur dat doet: met een geoefend oog voor de signalen.
        </p>
        <div className="border-2 rounded-2xl p-4 max-w-sm w-full text-xs leading-relaxed" style={{ backgroundColor: C.bgCard, borderColor: C.beigeMid, color: C.brownText }}>
          <p className="font-bold mb-1">Zo werkt het</p>
          <p className="mb-1">Meestal klik of tik je op een knop of op de zoekplaat. Bij het sorteren sleep je kaartjes (of tik je eerst op het kaartje en daarna op de plek waar het hoort).</p>
          <p>Goede zet: +5 · foute zet: -5 · controlevraag goed: +10. Je hebt 5 hartjes; elke foute controlevraag kost er een. Zijn ze op, dan speel je die ronde opnieuw.</p>
        </div>
        <GameButton onClick={onStart}>Start de game</GameButton>
      </div>
    </div>
  );
}

// ─── GAME OVER (hartjes op) ───

function GameOver({ onRestart }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4">
      <div className="rounded-2xl border-2 shadow-2xl p-6 w-full max-w-sm text-center" style={{ backgroundColor: C.bgCard, borderColor: C.red }}>
        <AlertTriangle className="w-12 h-12 mx-auto mb-3" style={{ color: C.red }} />
        <h2 className="font-bold italic text-xl mb-2" style={{ color: C.brownText }}>Je hartjes zijn op</h2>
        <p className="text-sm mb-4" style={{ color: C.brown }}>
          Geen probleem: van fouten leer je. Je speelt deze ronde opnieuw, met volle hartjes en de score die je aan het begin van de ronde had.
        </p>
        <GameButton onClick={onRestart} className="w-full">Speel deze ronde opnieuw</GameButton>
      </div>
    </div>
  );
}

// ─── MAIN ───

// screen → [missie, ronde] voor de progressbar en de voortgangsmeldingen
const SCREEN_INFO = {
  m1intro: [1, 1], r1: [1, 1], r1mc: [1, 1], r2: [1, 2], r2mc: [1, 2],
  m2intro: [2, 1], r3: [2, 1], r3mc: [2, 1], r4: [2, 2], r4mc: [2, 2],
  r5: [2, 3], r5mc: [2, 3],
};

// De kern van de leerdoelen: staat altijd op het eindscherm.
const LEERMOMENTEN = [
  "CO is geur-, kleur- en smaakloos en bindt ruim tweehonderd keer sterker aan hemoglobine dan zuurstof: organen als hersenen en hart krijgen zuurstofgebrek",
  "De vroege symptomen (hoofdpijn, misselijkheid, vermoeidheid) lijken op een griepje; daardoor wordt CO-vergiftiging vaak niet herkend",
  "Concentratie maal tijdsduur bepaalt de ernst: kort in een hoge concentratie is net zo gevaarlijk als lang in een lagere",
  "Signalen aan de installatie: geel-oranje vlam, roet of corrosie, een losse of lekkende afvoer, condens en een bedompte, muffe lucht",
  "Verhoogd risico bij open toestellen (type A en B), dichte roosters, na-isolatie, ventilatie-uitval en onderdruk; in gestapelde bouw kan CO uit een omliggende woning komen",
  "Klachten die buitenshuis verdwijnen zijn een CO-signaal; bij eigen klachten direct naar buiten en meten, met je persoonlijke CO-melder op borsthoogte",
];

const RONDE_SCHERMEN = ["r1", "r2", "r3", "r4", "r5"];
const MC_NAAR_RONDE = { r1mc: "r1", r2mc: "r2", r3mc: "r3", r4mc: "r4", r5mc: "r5" };

export default function SpotCoGevaarGame({ initialScreen = "start", onExit }) {
  const [screen, setScreen] = useState(initialScreen);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [aandacht, setAandacht] = useState([]);
  const juice = useGameJuice();

  // score bij de start van de huidige ronde, voor de herstart als de hartjes op zijn
  const scoreBijRondeStart = useRef(0);
  useEffect(() => {
    if (RONDE_SCHERMEN.includes(screen)) scoreBijRondeStart.current = score;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // onthoudt waar deze speler de mist in ging; elk punt maar een keer
  const noteer = useCallback((les) => {
    if (!les) return;
    setAandacht((prev) => (prev.includes(les) ? prev : [...prev, les]));
  }, []);

  const addScore = useCallback(
    (pts, point) => {
      setScore((prev) => Math.max(0, Math.min(MAX_SCORE, prev + pts)));
      if (pts >= 0) juice.triggerCorrect(pts, point);
      else juice.triggerWrong(pts, point);
    },
    [juice]
  );

  const loseLife = useCallback(() => {
    setLives((prev) => Math.max(0, prev - 1));
    juice.triggerWrong();
  }, [juice]);

  const resetGame = () => {
    setScreen("start");
    setScore(0);
    setLives(5);
    setAandacht([]);
  };

  // hartjes op: niet de hele game opnieuw, maar de huidige ronde
  const herstartRonde = () => {
    const doel = MC_NAAR_RONDE[screen] ?? (RONDE_SCHERMEN.includes(screen) ? screen : null);
    setLives(5);
    if (!doel) {
      resetGame();
      return;
    }
    setScore(scoreBijRondeStart.current);
    setScreen(doel);
  };

  useEffect(() => {
    if (screen === "end") {
      juice.triggerLevelUp();
      meldVoortgang({ missie: 2, ronde: 3, score, maxScore: MAX_SCORE, completed: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const showProgress = !["start", "end"].includes(screen);
  const [missie, ronde] = SCREEN_INFO[screen] ?? [1, 1];

  const mc = (pool, next, opts = {}) => (
    <div className="flex-1 flex flex-col items-center p-6">
      <StepBanner step={2} />
      <MCControle
        pool={pool}
        addScore={addScore}
        loseLife={loseLife}
        noteer={noteer}
        onComplete={() => {
          meldVoortgang({ missie, ronde, score, maxScore: MAX_SCORE, completed: false });
          setScreen(next);
        }}
        {...opts}
      />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ backgroundColor: C.bgPage }}>
      <juice.JuiceOverlay />
      <DragProvider>
        <div
          className="max-w-[800px] w-full mx-auto flex flex-col min-h-screen shadow-lg overflow-x-hidden"
          style={{ backgroundColor: C.bgPage, animation: juice.shaking ? "shake 0.3s ease-in-out" : "none" }}
        >
          {showProgress && <ProgressBar currentMission={missie} currentRound={ronde} score={score} lives={lives} />}

          {screen === "start" && <StartScreen onStart={() => setScreen("m1intro")} />}

          {screen === "m1intro" && (
            <IntroScreen title="Missie 1: Wat CO met je doet" buttonText="Aan de slag" onNext={() => setScreen("r1")}>
              <div className="leading-relaxed" style={{ color: C.brownText }}>
                <p className="mb-2 flex justify-center"><HeartPulse className="w-8 h-8" style={{ color: C.red }} /></p>
                <p className="mb-2">
                  Waarom is CO zo gevaarlijk? Omdat het je <b>zuurstoftransport</b> kaapt zonder dat je er iets van merkt. In deze missie zie je wat er in je bloed gebeurt, welke <b>symptomen</b> daarbij horen en waarom <b>concentratie maal tijd</b> het verschil maakt tussen hoofdpijn en levensgevaar.
                </p>
                <p>Twee rondes: eerst het lichaam, dan de getallen.</p>
              </div>
            </IntroScreen>
          )}

          {screen === "r1" && <RondeBinding addScore={addScore} onDone={() => setScreen("r1mc")} />}
          {screen === "r1mc" && mc(POOL_R1, "r2")}

          {screen === "r2" && <RondeConcentratieTijd addScore={addScore} onDone={() => setScreen("r2mc")} />}
          {screen === "r2mc" && mc(POOL_R2, "m2intro")}

          {screen === "m2intro" && (
            <IntroScreen title="Missie 2: De woninginspectie" buttonText="Naar de woning" onNext={() => setScreen("r3")}>
              <div className="leading-relaxed" style={{ color: C.brownText }}>
                <p className="mb-2 flex justify-center"><Flame className="w-8 h-8" style={{ color: "#E8930C" }} /></p>
                <p className="mb-2">
                  Je weet nu wat CO doet. Tijd om het te <b>herkennen</b>. Een woning vertelt je veel: het <b>vlambeeld</b>, de <b>ramen</b>, de <b>roosters</b>, de <b>afvoer</b>. En de bewoners zelf vertellen soms het belangrijkste signaal, zonder het te weten.
                </p>
                <p>Drie rondes: signalen zoeken, situaties op risico rangschikken, en als afsluiter zonder hulp: letten op jezelf.</p>
              </div>
            </IntroScreen>
          )}

          {screen === "r3" && <RondeZoekSignalen addScore={addScore} onDone={() => setScreen("r3mc")} />}
          {screen === "r3mc" && mc(POOL_R3, "r4")}

          {screen === "r4" && <RondeWelkeWoning addScore={addScore} onDone={() => setScreen("r4mc")} />}
          {screen === "r4mc" && mc(POOL_R4, "r5")}

          {screen === "r5" && <RondeLetOpJezelf addScore={addScore} onDone={() => setScreen("r5mc")} />}
          {screen === "r5mc" && mc(POOL_R5, "end", { lastRound: true })}

          {screen === "end" && (
            <EndScreen
              score={score}
              maxScore={MAX_SCORE}
              lives={lives}
              text="Sterk werk! Je weet nu waarom CO zo verraderlijk is: het kaapt je zuurstoftransport, de eerste klachten lijken op griep, en concentratie maal tijd bepaalt de ernst. En je kijkt voortaan met een geoefend oog: naar de vlam, de afvoer, de roosters, de ramen en naar de mensen in de woning, jezelf meegerekend."
              leermomenten={LEERMOMENTEN}
              aandacht={aandacht}
              onRestart={resetGame}
              onExit={onExit}
            />
          )}

          {lives === 0 && screen !== "end" && <GameOver onRestart={herstartRonde} />}

          <div className="py-2 text-center text-[10px]" style={{ color: C.brown }}>
            Studium B.V. · Vakmanschap CO · MicroGame · Spot het CO-gevaar · eindterm 2.1, leerdoelen 1 en 2
          </div>
        </div>
      </DragProvider>
    </div>
  );
}
