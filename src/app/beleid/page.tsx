'use client';

import { useState } from 'react';
import Link from 'next/link';
import './beleid.css';

/* ──────────────────────────────────────
   Privacy, Terms & Cookies – Dutch law (AVG/GDPR)
   Exact tab structure like Ribony policy.html
   ────────────────────────────────────── */

const TABS = ['Privacybeleid', 'Gebruiksvoorwaarden', 'Cookiebeleid'] as const;

export default function BeleidPage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="beleid-body">
      <div className="beleid-container">
        <ul className="beleid-tabs">
          {TABS.map((tab, i) => (
            <li key={i} className={activeTab === i ? 'active' : ''}>
              <a onClick={() => setActiveTab(i)}>{tab}</a>
            </li>
          ))}
        </ul>

        <div className="beleid-content">
          {/* ═══════ TAB 1: Privacy Policy ═══════ */}
          {activeTab === 0 && (
            <div>
              <h2>Privacybeleid – Verwerking van persoonsgegevens</h2>
              <p>Dit privacybeleid beschrijft hoe VEILO (veilo.nl) omgaat met je persoonsgegevens, in overeenstemming met de Algemene Verordening Gegevensbescherming (AVG/GDPR) en de Nederlandse Uitvoeringswet AVG (UAVG).</p>

              <p><b>VERWERKINGSVERANTWOORDELIJKE:</b> VEILO, gevestigd in Nederland, is verantwoordelijk voor de verwerking van je persoonsgegevens zoals beschreven in dit privacybeleid.</p>

              <p><b>WELKE GEGEVENS VERWERKEN WIJ:</b> Wanneer je lid wordt, verwerken wij de volgende persoonsgegevens: gebruikersnaam, naam, wachtwoord (versleuteld), geslacht, geboortedatum, e-mailadres, stad, registratiedatum, laatste inlogdatum, chatgeschiedenis, informatie in je &apos;Over mij&apos;-sectie, profielfoto en IP-adres.</p>

              <p><b>DOELEINDEN VAN VERWERKING:</b></p>
              <ul>
                <li>Het nakomen van wettelijke verplichtingen;</li>
                <li>Authenticatie en beveiliging van je account;</li>
                <li>Het weergeven van je profiel naar jouw voorkeur;</li>
                <li>Het faciliteren van interactie tussen gebruikers;</li>
                <li>Het oplossen van problemen en beheer van de website;</li>
                <li>Verbetering en beheer van de inhoud van de website;</li>
                <li>Personalisatie van advertenties via cookies (met jouw toestemming).</li>
              </ul>

              <p><b>BEZOEKERS ZONDER ACCOUNT:</b> Als je de site bezoekt zonder lid te worden, verwerken we uitsluitend je IP-adres, bezochte pagina&apos;s, chatgegevens, taalinstelling, browsertype, apparaatgegevens, locatiegegevens en verkeersgegevens, voor de hierboven genoemde doeleinden waar van toepassing.</p>

              <p><b>RECHTSGRONDSLAG:</b> Wij verwerken je persoonsgegevens op basis van de volgende rechtsgronden uit de AVG (artikel 6):</p>
              <ul>
                <li><b>Toestemming (art. 6 lid 1 sub a):</b> Je geeft toestemming bij registratie en voor het plaatsen van cookies;</li>
                <li><b>Uitvoering van een overeenkomst (art. 6 lid 1 sub b):</b> Verwerking is noodzakelijk voor het leveren van onze diensten;</li>
                <li><b>Gerechtvaardigd belang (art. 6 lid 1 sub f):</b> Voor beveiliging, fraudepreventie en verbetering van onze diensten.</li>
              </ul>

              <p><b>BEWAARTERMIJN:</b> Wij bewaren je persoonsgegevens niet langer dan noodzakelijk voor de doeleinden waarvoor ze zijn verzameld. Accountgegevens worden bewaard zolang je account actief is. Na verwijdering van je account worden je gegevens binnen 30 dagen gewist, tenzij wettelijke bewaarplichten anders vereisen.</p>

              <p><b>DOORGIFTE VAN GEGEVENS:</b> Je gegevens kunnen worden verstrekt aan bevoegde autoriteiten wanneer de wet dat vereist. Gegevens kunnen worden opgeslagen op servers binnen en buiten de Europese Economische Ruimte (EER), waarbij wij passende waarborgen treffen conform de AVG (zoals standaard contractbepalingen).</p>

              <p><b>JE RECHTEN:</b> Op grond van de AVG heb je de volgende rechten:</p>
              <ul>
                <li>Recht op inzage in je persoonsgegevens;</li>
                <li>Recht op rectificatie van onjuiste gegevens;</li>
                <li>Recht op verwijdering (&apos;recht om vergeten te worden&apos;);</li>
                <li>Recht op beperking van verwerking;</li>
                <li>Recht op overdraagbaarheid van gegevens;</li>
                <li>Recht van bezwaar tegen verwerking;</li>
                <li>Recht om toestemming in te trekken;</li>
                <li>Recht om een klacht in te dienen bij de Autoriteit Persoonsgegevens (AP).</li>
              </ul>

              <p>Je kunt je rechten uitoefenen door een e-mail te sturen naar <b>privacy@veilo.nl</b>. Wij reageren binnen 30 dagen op je verzoek.</p>

              <p><b>AUTORITEIT PERSOONSGEGEVENS:</b> Als je van mening bent dat wij je persoonsgegevens niet correct verwerken, kun je een klacht indienen bij de Autoriteit Persoonsgegevens: <a href="https://autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer">autoriteitpersoonsgegevens.nl</a></p>

              <p><i>Laatst bijgewerkt: maart 2026</i></p>
            </div>
          )}

          {/* ═══════ TAB 2: Terms of Service ═══════ */}
          {activeTab === 1 && (
            <div>
              <h2>Gebruiksvoorwaarden</h2>

              <h3>1. Algemeen</h3>
              <p>Door de website veilo.nl te gebruiken ga je akkoord met onderstaande voorwaarden. VEILO is gevestigd in Nederland en opereert onder Nederlands recht.</p>

              <h3>2. Leeftijd</h3>
              <ol type="a">
                <li>Alle gebruikers van www.veilo.nl moeten minimaal 16 jaar zijn (conform de Nederlandse implementatie van de AVG). Voor gebruikers jonger dan 16 jaar is toestemming van een ouder of voogd vereist.</li>
              </ol>

              <h3>3. Verantwoordelijkheden</h3>
              <ol type="a">
                <li>Gebruikers zijn zelf verantwoordelijk voor hun uitingen, geüploade foto&apos;s, verzonden berichten en alle inhoud op hun profiel.</li>
                <li>Gebruikers verklaren dat zij de rechten hebben op teksten, foto&apos;s, video&apos;s en overige content die zij plaatsen of versturen; anders zijn zij zelf aansprakelijk.</li>
                <li>Op veilo.nl is geen reclame, promotie of commerciële activiteit toegestaan zonder schriftelijke toestemming van VEILO.</li>
                <li>Inhoud mag niet in strijd zijn met de Nederlandse wet, de AVG, of enige andere toepasselijke Europese regelgeving. Persoonsgegevens kunnen conform de wet worden bewaard en aan bevoegde autoriteiten worden verstrekt indien wettelijk vereist.</li>
                <li>Verboden: belediging, discriminatie, intimidatie, (kinder)pornografie, illegale gokken, verkoop van drugs of voorschriftplichtige middelen, extreme geweldbeelden, het verspreiden van persoonsgegevens van derden zonder toestemming, of andere schadelijke dan wel onwettige content.</li>
                <li>Het is verboden om hack-, DDoS-, spam- of andere aanvallen uit te voeren op VEILO. Beveiligingslekken dien je te melden via het contactformulier; misbruik hiervan is verboden en strafbaar.</li>
              </ol>

              <h3>4. Privacy en account</h3>
              <ol type="a">
                <li>Profielen worden door gebruikers zelf aangemaakt. Klachten over profielen of inhoud die betrekking hebben op jou of je organisatie kun je indienen via <b>info@veilo.nl</b>; onrechtmatige content wordt na beoordeling verwijderd.</li>
                <li>Je hebt het recht om je account en alle bijbehorende gegevens te laten verwijderen. Zie ons Privacybeleid voor meer informatie.</li>
              </ol>

              <h3>5. Aansprakelijkheid</h3>
              <ol type="a">
                <li>VEILO is niet aansprakelijk voor schade die voortvloeit uit het gebruik van de website, inclusief maar niet beperkt tot directe, indirecte of gevolgschade, voor zover toegestaan onder Nederlands recht.</li>
                <li>VEILO garandeert niet dat de website te allen tijde beschikbaar of foutvrij is.</li>
              </ol>

              <h3>6. Wijzigingen</h3>
              <p>VEILO kan deze gebruiksvoorwaarden te allen tijde wijzigen. Bij substantiële wijzigingen worden gebruikers hiervan op de hoogte gesteld via de website of per e-mail.</p>

              <h3>7. Toepasselijk recht</h3>
              <p>Op deze gebruiksvoorwaarden is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechter in Nederland.</p>

              <p><i>Laatst bijgewerkt: maart 2026</i></p>
            </div>
          )}

          {/* ═══════ TAB 3: Cookie Policy ═══════ */}
          {activeTab === 2 && (
            <div>
              <h2>Cookiebeleid</h2>
              <p>Wij gebruiken cookies om je ervaring op veilo.nl te verbeteren. Dit cookiebeleid maakt onderdeel uit van het privacybeleid van VEILO en beschrijft het gebruik van cookies tussen jouw apparaat en onze website.</p>

              <h3>Wat is een cookie?</h3>
              <p>Een cookie is een klein bestandje dat een website op je apparaat opslaat wanneer je de site bezoekt. Het bevat doorgaans informatie over de website zelf, een unieke identificatiecode waarmee de site je browser kan herkennen bij een volgend bezoek, aanvullende gegevens die het doel van de cookie dienen, en de levensduur van de cookie.</p>

              <h3>Welke cookies gebruiken wij?</h3>
              <ul>
                <li><b>Functionele cookies:</b> Noodzakelijk voor het functioneren van de website (bijv. inloggen, sessie).</li>
                <li><b>Analytische cookies:</b> Voor het bijhouden van bezoekersstatistieken en het verbeteren van de website.</li>
                <li><b>Cookies van derden:</b> Cookies die door externe partijen worden geplaatst (bijv. voor advertenties). Deze worden alleen geplaatst met jouw toestemming.</li>
              </ul>

              <h3>Hoe kun je cookies beheren?</h3>
              <p>Als je geen cookies wenst te accepteren, kun je je browser instellen om cookies te weigeren. De meeste browsers zijn standaard ingesteld om cookies te accepteren, maar je kunt deze instellingen wijzigen om cookies te weigeren of om een melding te ontvangen wanneer een website een cookie wil plaatsen.</p>
              <p>Als je op meerdere apparaten surft, moet je mogelijk de instellingen op elk apparaat afzonderlijk aanpassen.</p>
              <p>Het blokkeren van alle cookies kan betekenen dat bepaalde functies en inhoud op de website niet beschikbaar zijn.</p>

              <h3>Toestemming</h3>
              <p>Bij je eerste bezoek aan veilo.nl vragen wij je toestemming voor het plaatsen van niet-essentiële cookies. Je kunt je toestemming te allen tijde intrekken via je browserinstellingen.</p>

              <p><i>Laatst bijgewerkt: maart 2026</i></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
