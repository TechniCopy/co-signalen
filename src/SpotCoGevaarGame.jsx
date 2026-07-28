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

// ─── SCHUDDEN (Fisher-Yates) ───
//
// Kaartjes en antwoorden staan in de code in een logische volgorde. Zonder
// schudden staat het juiste rijtje meteen goed en kan de cursist het patroon
// aflezen in plaats van de stof toepassen. Elke ronde krijgt bij het opstarten
// een eigen volgorde.

function schud(lijst) {
  const kopie = [...lijst];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

// Schudt de antwoordopties van een scenario en berekent de nieuwe index van
// het juiste antwoord.
function schudOpties(scenario) {
  const volgorde = schud(scenario.opties.map((_, i) => i));
  return {
    ...scenario,
    opties: volgorde.map((i) => scenario.opties[i]),
    goed: volgorde.indexOf(scenario.goed),
  };
}

// ─── MC-VRAGENPOOLS ───
// Basis: de examenvragen van leerdoelen 1 en 2 uit de dataset (cluster 2.1),
// aangevuld met een eigen variant.

const POOL_R1 = [
  {
    // dataset leerdoel 1, vraag 1
    question: "Waarom is het inademen van koolmonoxide zo gevaarlijk voor het menselijk lichaam?",
    options: [
      "CO bindt zich ongeveer even sterk aan hemoglobine als zuurstof, maar het lichaam breekt het veel langzamer af.",
      "CO bindt zich ruim tweehonderd keer sterker aan hemoglobine dan zuurstof, waardoor het bloed te weinig zuurstof kan vervoeren.",
      "CO verdringt de koolstofdioxide in de longen, waardoor de natuurlijke ademprikkel wegvalt en de ademhaling stilvalt.",
    ],
    correct: 1,
    feedbackCorrect: "GOED! CO bezet de plekken op de hemoglobine waar normaal zuurstof reist. Het bloed vervoert dan te weinig zuurstof en organen komen zuurstof tekort.",
    feedbackWrong: "Het gaat niet om de afbraaksnelheid en ook niet om de ademprikkel: CO bindt ruim tweehonderd keer sterker aan hemoglobine dan zuurstof, waardoor het zuurstoftransport vastloopt.",
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
      "Omdat bewoners bij een lekkage eerst een duidelijke gaslucht ruiken en de klachten daaraan toeschrijven.",
      "Omdat klachten pas ontstaan bij concentraties van duizend ppm en hoger, en die komen zelden voor.",
      "Omdat de symptomen, zoals hoofdpijn, misselijkheid en vermoeidheid, op een griepje lijken.",
    ],
    correct: 2,
    feedbackCorrect: "GOED! De vroege symptomen lijken op een griepje. Daardoor denkt bijna niemand aan CO.",
    feedbackWrong: "CO ruik je niet, en klachten beginnen al rond 70 tot 120 ppm. De echte reden is dat de eerste symptomen (hoofdpijn, misselijkheid, vermoeidheid) op een griepje lijken.",
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
      "Tijdelijke kortademigheid; zodra het bloed de CO heeft afgevoerd, is het lichaam weer hersteld.",
      "Blijvend verlies van reuk en smaak, doordat CO de zintuigcellen in de neus aantast.",
    ],
    correct: 0,
    feedbackCorrect: "GOED! Het zuurstoftekort kan de hersenen blijvend beschadigen, ook als het slachtoffer de vergiftiging overleeft.",
    feedbackWrong: "Als de CO uit het bloed is, is de schade niet automatisch weg: het zuurstoftekort kan de hersenen blijvend beschadigen.",
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
      "De CO-concentratie in de lucht en de mate waarin de ruimte wordt geventileerd.",
      "De duur van de blootstelling en de lichamelijke conditie van het slachtoffer.",
    ],
    correct: 0,
    feedbackCorrect: "GOED! Concentratie maal tijdsduur bepaalt de ernst. Kort in een hoge concentratie is net zo gevaarlijk als lang in een lagere.",
    feedbackWrong: "Allebei de foute antwoorden hebben een factor goed en een factor fout. Het gaat om concentratie en blootstellingsduur samen: ventilatie en conditie spelen een rol, maar de tabel gaat over die twee.",
    hint: "Twee van de antwoorden hebben een factor goed. Welke twee horen er samen op elke kaart die je net sorteerde?",
    bron: "Kleintje Gas, §3.1.4 (tabel concentratie CO gerelateerd aan tijdsduur)",
    les: "Concentratie en blootstellingsduur bepalen samen de ernst",
  },
  {
    // dataset leerdoel 1, vraag 5
    question: "Een bewoner is korte tijd blootgesteld aan een zeer hoge concentratie koolmonoxide. Wat is het te verwachten gevolg?",
    options: [
      "Bewusteloosheid en mogelijk overlijden, al binnen enkele minuten tot een half uur.",
      "Hoofdpijn en misselijkheid, die vanzelf wegtrekken zodra de bewoner weer buiten is.",
      "Nog geen levensgevaar: dat ontstaat pas na een uur, want korte pieken vangt het lichaam op.",
    ],
    correct: 0,
    feedbackCorrect: "GOED! Duizenden ppm zijn al binnen minuten tot een half uur fataal: 3.200 ppm binnen 30 minuten, 12.800 ppm binnen 1 tot 3 minuten.",
    feedbackWrong: "Korte pieken vangt het lichaam juist niet op. Bij zeer hoge concentraties dreigen bewusteloosheid en overlijden al binnen minuten tot een half uur.",
    hint: "Kort en hoog is net zo gevaarlijk als lang en laag. Wat stond er in de tabel bij duizenden ppm?",
    bron: "Kleintje Gas, §3.1.4 (tabel: 3.200 ppm fataal binnen 30 min, 12.800 ppm binnen 1-3 min)",
    les: "Zeer hoge concentraties zijn binnen minuten tot een half uur fataal",
  },
  {
    // dataset leerdoel 1, vraag 7
    question: "Een bewoner verblijft ongeveer twee uur in een ruimte met circa 120 ppm koolmonoxide. Welke verschijnselen zijn volgens de concentratie/tijdsduur-tabel te verwachten?",
    options: [
      "Bewusteloosheid en acuut levensgevaar; bij deze concentratie telt elke minuut.",
      "Nog geen verschijnselen; bij deze concentratie ontstaan klachten pas na een dag of langer.",
      "Hoofdpijn, snelle vermoeidheid, geïrriteerdheid en mogelijk duizeligheid en een verstoord beoordelingsvermogen.",
    ],
    correct: 2,
    feedbackCorrect: "GOED! Rond 70 tot 120 ppm geven na enige tijd hoofdpijn, vermoeidheid en duizeligheid. Geen acuut levensgevaar, wel een duidelijk signaal.",
    feedbackWrong: "Twee uur bij 120 ppm is niet acuut dodelijk, maar ook niet klachtenvrij: dit is de laagste rij van de tabel, met hoofdpijn, vermoeidheid en mogelijk duizeligheid.",
    hint: "120 ppm zit in de laagste rij van de tabel. Wat hoort daarbij, en hoe snel?",
    bron: "Kleintje Gas, §3.1.4 (tabel concentratie CO gerelateerd aan tijdsduur)",
    les: "Rond 70 tot 120 ppm: na enige tijd hoofdpijn en vermoeidheid",
  },
  {
    // dataset leerdoel 1, vraag 10
    question: "Waarom lukt het slachtoffers bij oplopende CO-concentraties vaak niet meer om zelf de woning te verlaten?",
    options: [
      "CO hoopt zich op bij de vloer, waardoor vluchten door de laaghangende gaslaag onmogelijk wordt.",
      "Door het zuurstofgebrek raken zij verward en kunnen zij bij inspanning in elkaar zakken of flauwvallen.",
      "CO verzuurt de spieren, waardoor lopen na enkele minuten blootstelling te zwaar wordt.",
    ],
    correct: 1,
    feedbackCorrect: "GOED! Zuurstofgebrek maakt verward, en juist bij inspanning (opstaan, lopen) zakken slachtoffers in elkaar of vallen ze flauw.",
    feedbackWrong: "Het probleem zit niet in de spieren en CO hangt ook niet laag: het zuurstofgebrek maakt verward, en bij inspanning zakken slachtoffers in elkaar.",
    hint: "Wat doet zuurstofgebrek eerst met je hoofd, en wat gebeurt er zodra je in beweging komt?",
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
      "Een merkbare tocht langs de haard zodra iemand de buitendeur opendoet.",
      "Beslagen ramen en vochtplekken op de wanden, samen met een muffe lucht.",
      "Een hoger gasverbruik dan het vorige stookseizoen, terwijl het niet kouder was.",
    ],
    correct: 1,
    feedbackCorrect: "GOED! Condens op ramen en muren en een bedompte, muffe lucht kunnen erop wijzen dat verbrandingsgassen de ruimte in komen.",
    feedbackWrong: "Tocht en gasverbruik zeggen niets over de afvoer van de verbrandingsgassen. Let op vocht: condens op ramen en muren, vochtplekken en een muffe lucht.",
    hint: "Verbrandingsgassen bevatten veel waterdamp. Wat zie je daarvan terug in de ruimte als ze niet naar buiten gaan?",
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
      "Een te ruime luchtovermaat, waardoor de vlam wordt gekoeld en niet volledig uitbrandt.",
      "Een te lage rookgastemperatuur, waardoor de verbranding in de warmtewisselaar wordt afgeschrikt.",
    ],
    correct: 0,
    feedbackCorrect: "GOED! Een te hoge CO-waarde in het rookgas komt volgens de fabrikant door vervuiling van de brander, een storing van de brander of recirculatie van rookgassen.",
    feedbackWrong: "Het voorschrift noemt geen luchtovermaat of rookgastemperatuur: het wijst op vervuiling of storing van de brander, of op recirculatie van rookgassen.",
    hint: "De vraag is wat het voorschrift van de fabrikant zelf noemt. Denk aan het onderdeel dat de vlam maakt, en aan rookgas dat de verkeerde kant op gaat.",
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
      "Een open gashaard met trekonderbreker in een woonkamer met vrije ventilatieroosters en jaarlijks onderhoud.",
      "Een gesloten HR-toestel (type C) met concentrische luchttoevoer en rookgasafvoer via het dak.",
    ],
    correct: 0,
    feedbackCorrect: "GOED! Een open toestel haalt zijn verbrandingslucht uit de ruimte zelf. Dichtgezette roosters in een luchtdicht geïsoleerde woning maken dit de gevaarlijkste combinatie.",
    feedbackWrong: "Twee van de drie zijn open toestellen, dus daarmee ben je er nog niet. De doorslag geeft de luchttoevoer: dichtgezette roosters na na-isolatie is het grootste risico.",
    hint: "Er staan twee open toestellen tussen. Kijk dan naar wat er met de luchttoevoer is gebeurd.",
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
    feedbackCorrect: "GOED! De afzuigkap zet de keuken op onderdruk. Daardoor kunnen rookgassen via de trekonderbreker de ruimte in worden getrokken. Deze combinatie is dan ook niet toegestaan: bij open toestellen hoort natuurlijke toe- en afvoerventilatie.",
    feedbackWrong: "De afzuigkap ververst niet, hij zuigt af: er ontstaat onderdruk en die trekt rookgassen via de trekonderbreker de keuken in. Daarom is deze combinatie ook niet toegestaan.",
    hint: "Wat doet een afzuigkap met de druk in de keuken, en wat betekent dat voor de trekonderbreker?",
    bron: "Kleintje Gas, §2.4.2 en §3.1.4 (onderdruk in de woning bij open toestellen)",
    les: "Onderdruk door een afzuigkap trekt rookgassen via de trekonderbreker naar binnen",
  },
  {
    // vervangt dataset leerdoel 2, vraag 9 (die combineerde mechanische afzuiging
    // met een open geiser alsof dat een normale situatie is; die combinatie is
    // niet toegestaan): toetst nu juist de ventilatie-eis bij open toestellen
    question: "In een keuken hangt een open geiser met trekonderbreker (type B). De bewoner wil de keuken laten voorzien van mechanische afzuiging. Wat is juist?",
    options: [
      "Dat is niet toegestaan: in een ruimte met een open toestel mag alleen natuurlijke toe- en afvoerventilatie worden toegepast.",
      "Dat mag, zolang de afzuiging niet op de hoogste stand draait terwijl de geiser brandt.",
      "Dat mag, mits er ook een extra ventilatierooster in de gevel wordt aangebracht.",
    ],
    correct: 0,
    feedbackCorrect: "GOED! Mechanische afzuiging maakt onderdruk en kan rookgassen via de trekonderbreker de woning in trekken. Bij open toestellen (type A en B) hoort daarom natuurlijke toe- en afvoerventilatie.",
    feedbackWrong: "Een lagere stand of een extra rooster neemt de onderdruk niet weg. In een ruimte met een open toestel is mechanische afzuiging niet toegestaan: alleen natuurlijke toe- en afvoer.",
    hint: "Wat doet mechanische afzuiging met de druk in de ruimte, en wat betekent dat voor de trekonderbreker?",
    bron: "Lesstof BvV CO verlenging, cluster 2.1 (ventilatie bij open toestellen)",
    les: "Bij open toestellen (type A en B) alleen natuurlijke toe- en afvoerventilatie; mechanische afzuiging is daar niet toegestaan",
  },
];

const POOL_R5 = [
  {
    // dataset leerdoel 2, vraag 1
    question: "Tijdens onderhoud in een kleine opstellingsruimte krijgt de monteur hoofdpijn en wordt hij duizelig. Buiten verdwijnen de klachten snel. Wat is de juiste conclusie?",
    options: [
      "Hij zet het toestel uit, lucht de ruimte een kwartier en werkt daarna verder zonder te meten.",
      "Dit kan wijzen op een verhoogde CO-concentratie; hij moet de ruimte verlaten en eerst het CO-gehalte meten.",
      "Dit wijst op een te hoog CO2-gehalte; even een raam openzetten is voldoende om door te werken.",
    ],
    correct: 1,
    feedbackCorrect: "GOED! Klachten die binnen opkomen en buiten verdwijnen zijn een klassiek CO-signaal: ruimte verlaten en eerst meten.",
    feedbackWrong: "Luchten of een raam openzetten verdunt hooguit tijdelijk en laat de oorzaak staan. Zonder meting weet je niet of het veilig is: eerst naar buiten, dan meten.",
    hint: "Luchten haalt de klachten misschien weg. Maar waarmee stel je vast of er echt CO hangt?",
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
      "Omdat hij daar dicht genoeg bij het toestel hangt om een lekkage het snelst op te pikken.",
      "Omdat de melder daar de lucht bewaakt die jij inademt, waar je ook bent in de woning.",
      "Omdat de concentratie op borsthoogte het meest gelijkmatig is en dus het best te vergelijken.",
    ],
    correct: 1,
    feedbackCorrect: "GOED! Op borsthoogte zit de melder in jouw ademzone: hij meet de lucht die jij daadwerkelijk inademt, bij elke klus opnieuw.",
    feedbackWrong: "De melder is er niet om het toestel te bewaken en ook niet om waarden te vergelijken: hij bewaakt jouw ademzone, en die zit op borsthoogte.",
    hint: "Deze melder is persoonlijk. Wiens lucht moet hij dus bewaken?",
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
  // elke ronde een eigen volgorde, zodat de symptomen niet al gesorteerd klaarliggen
  const [kaarten] = useState(() => schud(R1_SYMPTOMEN));

  const over = kaarten.filter(
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
    marker: [315, 212],
  },
  {
    id: "condens", label: "Condens op het raam",
    uitleg: "Aanhoudend beslagen ramen en vochtplekken kunnen erop wijzen dat verbrandingsgassen niet goed worden afgevoerd.",
    marker: [121, 116],
  },
  {
    id: "roet", label: "Roetspoor boven de haard",
    uitleg: "Roet, roest of corrosie op of rond een toestel wijst op een slechte verbranding of een lekkende afvoer.",
    marker: [314, 64],
  },
  {
    id: "rooster", label: "Dichtgeplakt ventilatierooster",
    uitleg: "Zonder vrije luchttoevoer krijgt een open toestel te weinig zuurstof: precies zo ontstaat CO.",
    marker: [446, 220],
  },
  {
    id: "afvoer", label: "Losliggende rookgasafvoer",
    uitleg: "Door een losliggende of lekkende rookgasafvoer stromen verbrandingsgassen zo de woning in.",
    marker: [614, 52],
  },
];

const R3_AFLEIDERS = [
  {
    id: "waterkoker",
    uitleg: "De waterkoker is elektrisch: geen verbranding, dus geen CO-bron. Kijk naar de verbrandingstoestellen, hun afvoer en de ventilatie.",
    marker: [683, 236],
  },
  {
    id: "radiator",
    uitleg: "Droge, warme lucht bij een radiator is normaal. Let juist op het omgekeerde: vochtige, bedompte lucht.",
    marker: [121, 272],
  },
  {
    id: "plant",
    uitleg: "De plant doet niemand kwaad. Kijk naar het toestel, de afvoer, de roosters en de ramen.",
    marker: [456, 300],
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
      {/* muren, plint en vloer */}
      <rect x="0" y="0" width="480" height="326" fill="#F0E8D8" />
      <rect x="480" y="0" width="240" height="326" fill="#EAE0CC" />
      <rect x="0" y="318" width="720" height="12" fill="#DCCFB4" stroke={C.brownText} strokeWidth="1.5" />
      <rect x="0" y="330" width="720" height="70" fill="#C9B891" />
      {[80, 240, 400, 560].map((x) => (
        <line key={x} x1={x} y1="330" x2={x + 60} y2="400" stroke="#B9A87E" strokeWidth="2" />
      ))}
      <line x1="0" y1="352" x2="720" y2="358" stroke="#B9A87E" strokeWidth="1.5" />
      <line x1="0" y1="376" x2="720" y2="384" stroke="#B9A87E" strokeWidth="1.5" />
      <line x1="480" y1="0" x2="480" y2="318" stroke="#C9B891" strokeWidth="5" />

      {/* vloerkleed (decor) */}
      <ellipse cx="315" cy="360" rx="120" ry="22" fill="#A8760C" opacity="0.35" />
      <ellipse cx="315" cy="360" rx="92" ry="15" fill="none" stroke="#8A6B3F" strokeWidth="2" opacity="0.5" />

      {/* schilderijtje (decor) */}
      <rect x="216" y="52" width="34" height="44" rx="2" fill="#FFFCF5" stroke="#8A6B3F" strokeWidth="3" />
      <path d="M 220 84 l 9 -12 6 7 8 -13 9 18 z" fill="#5C6B2E" opacity="0.8" />
      <circle cx="240" cy="62" r="3.5" fill="#E8B93C" />

      {/* wandklok in de keuken (decor) */}
      <circle cx="678" cy="76" r="20" fill="#FFFCF5" stroke={C.brownText} strokeWidth="2.5" />
      <line x1="678" y1="76" x2="678" y2="63" stroke={C.brownText} strokeWidth="2" strokeLinecap="round" />
      <line x1="678" y1="76" x2="687" y2="80" stroke={C.brownText} strokeWidth="2" strokeLinecap="round" />
      <circle cx="678" cy="76" r="2" fill={C.brownText} />

      {/* ── raam met condens (signaal) ── */}
      <g {...clickProps("condens")}>
        {/* kozijn en ruiten */}
        <rect x="34" y="40" width="174" height="150" rx="4" fill="#6B4F2A" />
        <rect x="42" y="48" width="76" height="63" fill="#C6DCEA" />
        <rect x="124" y="48" width="76" height="63" fill="#C6DCEA" />
        <rect x="42" y="119" width="76" height="63" fill="#B9D2E2" />
        <rect x="124" y="119" width="76" height="63" fill="#B9D2E2" />
        {/* heuvels en zon achter het glas, half weggevaagd door de waas */}
        <path d="M 42 100 q 18 -14 38 0 q 20 -12 38 11 h -76 z" fill="#9DBBAB" opacity="0.5" />
        <circle cx="102" cy="60" r="8" fill="#F3D34A" opacity="0.55" />
        {/* condenswaas: dikke witte laag die van onderaf optrekt */}
        <path d="M 42 74 q 12 -8 24 -2 q 14 -9 26 0 q 16 -7 26 3 v 36 h -76 z" fill="white" opacity="0.55" />
        <path d="M 124 70 q 14 -9 27 -1 q 13 -8 27 1 q 12 -6 22 4 v 37 h -76 z" fill="white" opacity="0.55" />
        <path d="M 42 132 q 12 -9 25 -2 q 13 -8 26 1 q 13 -7 25 3 v 48 h -76 z" fill="white" opacity="0.85" />
        <path d="M 124 128 q 13 -9 26 -1 q 13 -8 26 2 q 12 -6 24 3 v 50 h -76 z" fill="white" opacity="0.85" />
        {/* druppelsporen die door de waas naar beneden lopen */}
        {[
          [56, 128, 34], [76, 138, 30], [98, 132, 38], [136, 130, 36], [158, 140, 28], [182, 134, 36],
        ].map(([x, y, l], i) => (
          <g key={i}>
            <line x1={x} y1={y} x2={x} y2={y + l} stroke="#7FA9C2" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx={x} cy={y + l + 3} r="3.5" fill="#7FA9C2" />
          </g>
        ))}
        {/* losse druppels in de waas */}
        {[[64, 152], [88, 160], [110, 150], [130, 158], [150, 152], [172, 162], [190, 152]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.2" fill="#8FB8CC" />
        ))}
        {/* raamkruis er weer overheen */}
        <rect x="114" y="44" width="8" height="142" fill="#6B4F2A" />
        <rect x="40" y="111" width="162" height="8" fill="#6B4F2A" />
        {/* vensterbank met vochtplek op de muur eronder */}
        <rect x="26" y="190" width="190" height="12" rx="3" fill="#8A6B3F" stroke={C.brownText} strokeWidth="1.5" />
        <path d="M 74 202 q 14 10 8 22 q 16 -4 22 8 q -26 6 -44 -4 q -6 -16 14 -26 z" fill="#C9BFA8" opacity="0.7" />
      </g>

      {/* ── radiator (afleider) ── */}
      <g {...clickProps("radiator")}>
        {/* warmtegolfjes */}
        <path d="M 84 236 q 5 -8 0 -16 M 116 236 q 5 -8 0 -16 M 148 236 q 5 -8 0 -16" fill="none" stroke="#C4A96A" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="52" y="244" width="140" height="58" rx="7" fill="#E9E5DA" stroke={C.brownText} strokeWidth="2.5" />
        <rect x="58" y="240" width="128" height="7" rx="3.5" fill="#D5D0C2" stroke="#B7B1A0" strokeWidth="1" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <rect key={i} x={60 + i * 18} y="252" width="12" height="44" rx="4" fill="#D5D0C2" stroke="#B7B1A0" strokeWidth="1" />
        ))}
        {/* thermostaatknop en leidingen */}
        <circle cx="46" cy="252" r="7" fill="#FFFCF5" stroke={C.brownText} strokeWidth="2" />
        <line x1="46" y1="248" x2="46" y2="252" stroke={C.brownText} strokeWidth="2" />
        <rect x="62" y="302" width="6" height="24" fill="#B7B1A0" />
        <rect x="176" y="302" width="6" height="24" fill="#B7B1A0" />
      </g>

      {/* ── roetspoor boven de haard (signaal) ── */}
      <g {...clickProps("roet")}>
        {/* kanaal naar het plafond */}
        <rect x="302" y="24" width="26" height="128" fill="#8E9AA3" stroke={C.brownText} strokeWidth="2" />
        <rect x="298" y="24" width="34" height="8" fill="#7A868F" stroke={C.brownText} strokeWidth="1.5" />
        <line x1="302" y1="60" x2="328" y2="60" stroke="#7A868F" strokeWidth="2" />
        <line x1="302" y1="96" x2="328" y2="96" stroke="#7A868F" strokeWidth="2" />
        {/* roetwolk rond het kanaal, met vegen en spikkels */}
        <ellipse cx="315" cy="52" rx="46" ry="21" fill="#4E4A44" opacity="0.6" />
        <ellipse cx="296" cy="78" rx="34" ry="15" fill="#4E4A44" opacity="0.5" />
        <ellipse cx="334" cy="86" rx="28" ry="13" fill="#4E4A44" opacity="0.45" />
        <path d="M 284 108 q 10 -8 22 -3 q 14 -6 24 2 q -22 10 -46 1 z" fill="#4E4A44" opacity="0.35" />
        {[[268, 60], [278, 92], [352, 66], [346, 96], [312, 110], [360, 46]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.2" fill="#4E4A44" opacity="0.55" />
        ))}
      </g>

      {/* ── gashaard met geel-oranje vlam (signaal) ── */}
      <g {...clickProps("vlam")}>
        {/* romp */}
        <rect x="248" y="150" width="134" height="132" rx="10" fill="#46423C" stroke={C.brownText} strokeWidth="2.5" />
        <rect x="254" y="144" width="122" height="10" rx="4" fill="#5A554E" stroke={C.brownText} strokeWidth="1.5" />
        {/* ruit met vlambeeld */}
        <rect x="262" y="166" width="106" height="84" rx="7" fill="#2B2926" />
        <rect x="267" y="171" width="96" height="74" rx="5" fill="#171614" />
        {/* houtblokken */}
        <rect x="284" y="232" width="62" height="9" rx="4.5" fill="#6B4426" stroke="#4A2E18" strokeWidth="1.5" />
        <rect x="296" y="224" width="42" height="9" rx="4.5" fill="#7C5230" stroke="#4A2E18" strokeWidth="1.5" />
        {/* gloed + vlammen: geel-oranje in plaats van blauw */}
        <ellipse cx="315" cy="228" rx="38" ry="16" fill="#E8930C" opacity="0.25" style={{ animation: "pulseGlow 1.8s ease-in-out infinite" }} />
        <g style={{ animation: "vlamFlikker 0.9s ease-in-out infinite", transformBox: "fill-box", transformOrigin: "center bottom" }}>
          <path d="M 282 228 q -7 -22 7 -36 q 3 14 12 17 q -3 -20 12 -29 q 5 17 14 22 q 0 -15 10 -22 q 7 19 2 31 q 9 -2 10 -12 q 10 19 -5 29 z" fill="#D9720F" />
          <path d="M 290 228 q -4 -16 8 -25 q 3 11 11 13 q -1 -14 11 -19 q 5 13 11 16 q 3 11 -3 15 z" fill="#E8930C" />
          <path d="M 300 228 q -2 -11 6 -16 q 3 7 8 8 q 1 -9 8 -12 q 4 9 6 12 q 2 6 -3 8 z" fill="#F3C94A" />
          <path d="M 308 228 q 0 -7 5 -10 q 3 5 7 6 q 2 4 -1 4 h -11 z" fill="#F9E27A" />
        </g>
        {/* luchtrooster en handgreep */}
        <rect x="262" y="256" width="106" height="9" rx="4" fill="#5A554E" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={i} x1={272 + i * 18} y1="257" x2={272 + i * 18} y2="264" stroke="#3A3733" strokeWidth="3" />
        ))}
        <rect x="372" y="196" width="6" height="26" rx="3" fill="#8E8880" stroke={C.brownText} strokeWidth="1" />
        {/* pootjes */}
        <rect x="258" y="282" width="14" height="16" fill="#46423C" stroke={C.brownText} strokeWidth="1.5" />
        <rect x="358" y="282" width="14" height="16" fill="#46423C" stroke={C.brownText} strokeWidth="1.5" />
      </g>

      {/* ── dichtgeplakt ventilatierooster (signaal) ── */}
      <g {...clickProps("rooster")}>
        <rect x="414" y="196" width="64" height="48" rx="5" fill="#E9E5DA" stroke={C.brownText} strokeWidth="2.5" />
        <rect x="420" y="202" width="52" height="36" rx="3" fill="#D5D0C2" />
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1="424" y1={208 + i * 8.5} x2="468" y2={208 + i * 8.5} stroke="#8F8874" strokeWidth="3.5" />
        ))}
        {/* tape: twee gekruiste stroken met randlijnen en een los plakstukje */}
        <g transform="rotate(-13 446 217)">
          <rect x="404" y="210" width="84" height="15" fill="#EFE0B0" opacity="0.95" stroke="#C9B368" strokeWidth="1.5" />
          <line x1="404" y1="217" x2="488" y2="217" stroke="#DECf95" strokeWidth="2" />
        </g>
        <g transform="rotate(11 446 224)">
          <rect x="404" y="217" width="84" height="15" fill="#EFE0B0" opacity="0.95" stroke="#C9B368" strokeWidth="1.5" />
        </g>
        <rect x="408" y="192" width="22" height="11" fill="#EFE0B0" opacity="0.95" stroke="#C9B368" strokeWidth="1.2" transform="rotate(-24 419 197)" />
      </g>

      {/* ── plant (afleider) ── */}
      <g {...clickProps("plant")}>
        <path d="M 440 330 h 32 l -5 -32 h -22 z" fill="#B06A3B" stroke={C.brownText} strokeWidth="2" />
        <rect x="436" y="294" width="40" height="8" rx="3" fill="#9A5A30" stroke={C.brownText} strokeWidth="1.5" />
        <path d="M 456 294 q -18 -18 -8 -40 q 12 10 10 30 q 2 -24 17 -32 q 5 20 -13 36 q 14 -12 24 -7 q -7 15 -24 17 z" fill="#5C6B2E" />
        <path d="M 452 294 q -12 -8 -22 -6 q 5 10 18 10 z" fill="#4A5725" />
        <line x1="456" y1="294" x2="452" y2="268" stroke="#4A5725" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* ── keuken: bovenkastje, aanrecht met spoelbak (decor) ── */}
      <rect x="488" y="56" width="60" height="44" rx="4" fill="#D9CDB8" stroke={C.brownText} strokeWidth="2" />
      <line x1="518" y1="56" x2="518" y2="100" stroke="#B7A98C" strokeWidth="2" />
      <circle cx="512" cy="78" r="2.5" fill="#6B4F2A" />
      <circle cx="524" cy="78" r="2.5" fill="#6B4F2A" />
      <rect x="488" y="250" width="228" height="14" rx="3" fill="#8A6B3F" stroke={C.brownText} strokeWidth="2" />
      {/* spoelbak en kraan */}
      <rect x="500" y="252" width="52" height="9" rx="3" fill="#C8C4B8" stroke={C.brownText} strokeWidth="1.5" />
      <path d="M 524 250 v -16 q 0 -8 9 -8 q 8 0 8 7" fill="none" stroke="#8E9AA3" strokeWidth="5" strokeLinecap="round" />
      {/* waterkoker (afleider: elektrisch, geen CO-bron) */}
      <g {...clickProps("waterkoker")}>
        <path d="M 668 250 v -22 q 0 -5 5 -5 h 18 q 5 0 5 5 v 22 z" fill="#E9E5DA" stroke={C.brownText} strokeWidth="2" />
        <path d="M 668 234 q -8 2 -6 10 q 2 6 8 5" fill="none" stroke={C.brownText} strokeWidth="2" />
        <rect x="672" y="219" width="16" height="5" rx="2.5" fill="#C8C4B8" stroke={C.brownText} strokeWidth="1.5" />
        <circle cx="692" cy="246" r="2" fill="#4A7C3F" />
        {/* snoer naar het stopcontact */}
        <path d="M 696 250 q 8 -4 10 -12" fill="none" stroke={C.brownText} strokeWidth="1.5" />
        <rect x="702" y="228" width="10" height="12" rx="2" fill="#E9E5DA" stroke={C.brownText} strokeWidth="1.5" />
      </g>
      {/* onderkasten */}
      <rect x="496" y="264" width="212" height="62" fill="#D9CDB8" stroke={C.brownText} strokeWidth="2" />
      <line x1="602" y1="264" x2="602" y2="326" stroke="#B7A98C" strokeWidth="2" />
      <rect x="586" y="288" width="7" height="16" rx="3" fill="#6B4F2A" />
      <rect x="611" y="288" width="7" height="16" rx="3" fill="#6B4F2A" />

      {/* ── geiser met losliggende afvoer (signaal) ── */}
      <g {...clickProps("afvoer")}>
        {/* onderste pijpdeel: zit nog vast op de geiser */}
        <rect x="590" y="58" width="22" height="34" fill="#9AA1A8" stroke={C.brownText} strokeWidth="2" />
        <rect x="586" y="88" width="30" height="7" rx="2" fill="#7A868F" stroke={C.brownText} strokeWidth="1.5" />
        {/* bovenste pijpdeel: verschoven en scheef, met zichtbare kier */}
        <g transform="rotate(9 617 32)">
          <rect x="606" y="8" width="22" height="44" fill="#9AA1A8" stroke={C.brownText} strokeWidth="2" />
          <rect x="602" y="44" width="30" height="7" rx="2" fill="#7A868F" stroke={C.brownText} strokeWidth="1.5" />
        </g>
        {/* rookgas dat uit de kier lekt */}
        <path d="M 600 54 q -8 -8 -2 -16 q -8 -4 -4 -12" fill="none" stroke="#8E9AA3" strokeWidth="3" strokeLinecap="round" opacity="0.8" style={{ animation: "pulseGlow 1.6s ease-in-out infinite" }} />
        <path d="M 590 58 q -10 -4 -8 -14" fill="none" stroke="#A9AFB5" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" style={{ animation: "pulseGlow 2.1s ease-in-out infinite" }} />
        {/* geiser */}
        <rect x="560" y="96" width="82" height="118" rx="11" fill="#F4F2EC" stroke={C.brownText} strokeWidth="2.5" />
        <rect x="588" y="92" width="26" height="8" fill="#E6E2D8" stroke={C.brownText} strokeWidth="1.5" />
        <rect x="574" y="112" width="54" height="28" rx="4" fill="#DCE8C6" stroke={C.brownText} strokeWidth="1.5" />
        <rect x="580" y="120" width="28" height="5" rx="2.5" fill="#9BB08A" />
        <circle cx="620" cy="126" r="4" fill="#C0392B" />
        {/* kijkglas met waakvlam */}
        <circle cx="601" cy="172" r="15" fill="#E6E2D8" stroke={C.brownText} strokeWidth="2" />
        <circle cx="601" cy="172" r="9" fill="#2B2926" />
        <path d="M 597 176 q 4 -10 8 0 q -4 6 -8 0" fill="#5B8FB3" />
        {/* leidingen naar het aanrecht */}
        <rect x="578" y="214" width="6" height="36" fill="#B7B1A0" />
        <rect x="616" y="214" width="6" height="36" fill="#C9963C" />
      </g>

      {/* natuurlijk toevoerrooster in de keukengevel (decor: zo hoort het bij een open toestel) */}
      <rect x="496" y="12" width="56" height="24" rx="4" fill="#E9E5DA" stroke={C.brownText} strokeWidth="2" />
      {[0, 1, 2].map((i) => (
        <line key={i} x1="502" y1={18 + i * 6} x2="546" y2={18 + i * 6} stroke="#9B9484" strokeWidth="2.5" />
      ))}

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
        uitleg: "De afzuigkap zet de keuken op onderdruk: rookgassen worden via de trekonderbreker de ruimte in getrokken. Deze combinatie is niet toegestaan (bij open toestellen alleen natuurlijke toe- en afvoer), maar je komt hem in de praktijk wel tegen: hier maak je je het eerst zorgen over.",
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
  // de kaarten staan in de code op risicovolgorde; elke ronde opnieuw schudden
  const [sets] = useState(() => R4_SETS.map((s) => ({ ...s, kaarten: schud(s.kaarten) })));

  const set = sets[setIdx];
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
    if (setIdx + 1 >= sets.length) {
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
          open toestellen zonder afvoer (type A) en met trekonderbreker (type B), zeker met <b>dichtgezette roosters</b>; woningen die na <b>na-isolatie</b> luchtdicht zijn; <b>onderdruk</b> door een afzuigkap; en achterstallig onderhoud.
        </UitlegItem>
        <UitlegItem term="Ventilatie-eis">
          in een ruimte met een open toestel hoort <b>natuurlijke toe- en afvoerventilatie</b>. Mechanische afzuiging is daar <b>niet toegestaan</b>: die maakt onderdruk en trekt rookgassen naar binnen. Kom je die combinatie toch tegen, dan is dat een risicosituatie.
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
          {setIdx + 1 >= sets.length ? "Rondes afronden" : "Volgende inspectieronde"}
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
      "Je zet de deur van de opstellingsruimte open en werkt door zodra de klachten wegtrekken.",
      "Direct de ruimte verlaten en naar buiten gaan. Pas verdergaan nadat je het CO-gehalte hebt gemeten.",
      "Je stelt het toestel buiten bedrijf en rondt de klus af, want zonder brandend toestel ontstaat er geen CO meer.",
    ],
    goed: 1,
    uitleg: "Hoofdpijn en duizeligheid tijdens het werk kunnen de eerste tekenen van CO zijn. Eerst naar buiten, dan meten. De CO die er al hangt, verdwijnt niet doordat het toestel uit gaat.",
    hint: "Een deur open of het toestel uit verandert de lucht die je nu inademt niet meteen. Waarmee stel je vast of het veilig is?",
  },
  {
    situatie: "De bewoner vertelt dat het hele gezin in het stookseizoen vaak hoofdpijn heeft en moe is. Op vakantie heeft niemand ergens last van.",
    opties: [
      "Je adviseert een bezoek aan de huisarts en noteert de klacht op je werkbon voor de volgende beurt.",
      "Je ziet dit als mogelijk CO-signaal en meet het CO-gehalte in de woning.",
      "Je adviseert de bewoner een CO-melder te kopen en te bellen als die ooit afgaat.",
    ],
    goed: 1,
    uitleg: "Klachten die buitenshuis verdwijnen zijn een klassiek CO-signaal. Je meet nu zelf: een melder is een aanvulling en een werkbon voor later helpt dit gezin vandaag niet.",
    hint: "Binnen klachten, buiten niet. Wat doe jij daar vandaag mee, nu je er toch staat?",
  },
  {
    situatie: "Je stapt bij de volgende klus naar binnen. Waar zit je persoonlijke CO-melder?",
    opties: [
      "Aan je gereedschapskoffer, die je bij elke klus vlak naast het toestel neerzet.",
      "Aan je broekriem, zodat hij tijdens het werk nergens achter kan blijven haken.",
      "Op borsthoogte aan je werkkleding, elke klus opnieuw.",
    ],
    goed: 2,
    uitleg: "De persoonlijke CO-melder draag je standaard op borsthoogte: daar zit je ademzone. Naast het toestel of op heuphoogte meet hij niet de lucht die jij inademt.",
    hint: "De melder heet niet voor niets persoonlijk. Welke lucht moet hij bewaken?",
  },
];

function RondeLetOpJezelf({ addScore, onDone }) {
  const [fase, setFase] = useState("uitleg");
  const [idx, setIdx] = useState(0);
  const [hint, setHint] = useState(null);
  const [goedGekozen, setGoedGekozen] = useState(false);
  const [flashFout, setFlashFout] = useState(null);
  const [popup, setPopup] = useState(false);
  // antwoordopties elke ronde in een eigen volgorde
  const [scenarios] = useState(() => R5_SCENARIOS.map(schudOpties));

  const scen = scenarios[idx];

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
    if (idx + 1 >= scenarios.length) {
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
        Scenario {idx + 1} van {scenarios.length}. Wat doe je?
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
            {idx + 1 >= scenarios.length ? "Ronde afronden" : "Volgend scenario"}
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
  "Verhoogd risico bij open toestellen (type A en B), dichte roosters, na-isolatie en onderdruk; bij open toestellen hoort natuurlijke toe- en afvoerventilatie (mechanische afzuiging is daar niet toegestaan); in gestapelde bouw kan CO uit een omliggende woning komen",
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
